"""Xpoz REST live search: exactly one page, no retries or trial fallback.

Contract: https://docs.xpoz.ai/rest-api/overview
Live search requires a compatible plan (trial keys are not supported).
"""
import httpx
import asyncio
import itertools
import time
import json
import re
from contextlib import asynccontextmanager
from urllib.parse import urlsplit, urlunsplit
from datetime import datetime, timedelta, timezone
from .common import mark_repost, observed_metrics, published
from .xpoz_text import parse_tool_text

URL = "https://api.xpoz.ai/api/data/twitter/posts/live"
FIELDS = "id,authorId,authorUsername,text,createdAt,likeCount,replyCount,retweetCount,impressionCount"
MCP_URL = "https://mcp.xpoz.ai/mcp"
# Fast mode returns up to 300 rows per call; rows are not charged, the call is.
PAGE_ROWS = 300
COMMENT_TOOLS = {'x': 'getTwitterPostComments', 'instagram': 'getInstagramCommentsByPostId', 'tiktok': 'getTiktokCommentsByPostId'}
COMMENT_FIELDS = {
    'x': 'id,text,authorUsername,createdAt,createdAtDate,likeCount,replyCount',
    'instagram': 'id,text,username,createdAt,createdAtDate,createdAtTimestamp,likeCount,childCommentCount',
    'tiktok': 'id,text,username,createdAt,createdAtDate,createdAtTimestamp,likeCount',
}
SOCIAL_TOOLS = {'instagram': 'getInstagramPostsByKeywords', 'tiktok': 'getTiktokPostsByKeywords', 'reddit': 'getRedditPostsByKeywords'}
SOCIAL_FIELDS = {
    'instagram': 'id,username,userId,caption,createdAt,createdAtDate,createdAtTimestamp,likeCount,commentCount,reshareCount,videoPlayCount,codeUrl,imageUrl,profilePicUrl,mediaType',
    'tiktok': 'id,username,userId,isPrivate,description,createdAt,createdAtDate,createdAtTimestamp,likeCount,commentCount,forwardCount,playCount,videoThumbnail',
    'reddit': 'id,title,selftext,permalink,postUrl,authorUsername,subredditName,score,commentsCount,crosspostsCount,createdAt,createdAtDate,createdAtTimestamp,over18',
}


def _window(start, end):
    """Optional publication window as provider arguments (calendar days, YYYY-MM-DD)."""
    args = {}
    for key, value in (('startDate', start), ('endDate', end)):
        if value is not None:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(value)):
                raise ValueError('Invalid date window')
            args[key] = str(value)
    return args


def _public_image_url(value):
    """Validate public DNS-shaped HTTPS URLs only; never resolve or fetch media."""
    if not isinstance(value, str) or len(value) > 8192 or re.search(r'[\s\\\x00-\x1f\x7f]', value):
        return None
    try:
        url = urlsplit(value)
        host = url.hostname or ''
        if (url.scheme != 'https' or url.username is not None or url.password is not None
                or url.port not in (None, 443) or len(host) > 253
                or not re.fullmatch(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}', host)
                or host.rsplit('.', 1)[-1] in ('localhost', 'local', 'internal', 'lan', 'home', 'test', 'invalid', 'onion')
                or host == 'home.arpa' or host.endswith('.home.arpa')):
            return None
        return urlunsplit(('https', host, url.path or '/', url.query, ''))
    except ValueError:
        return None


def _social_username(platform, value):
    limit = 30 if platform == 'instagram' else 24
    return (isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9_][A-Za-z0-9_.]{0,' + str(limit - 1) + r'}', value)
            and not value.endswith('.') and '..' not in value)


def _social_date(row):
    """Publication time from the most precise field the provider sent: the timestamp, then `createdAt`, and only then
    `createdAtDate`, which is a calendar date. Reading the date first stored every post at midnight and lost its hour."""
    value = row.get('createdAtTimestamp')
    # Explicit provider timestamps only; never infer publication from crawl time.
    if str(value).isdigit():
        seconds = int(value)
        if seconds > 100_000_000_000:
            seconds /= 1000
        try:
            return datetime.fromtimestamp(seconds, timezone.utc).replace(tzinfo=None)
        except (ValueError, OverflowError, OSError):
            pass
    for field in ('createdAtTimestamp', 'createdAt', 'createdAtDate'):
        date = published(row.get(field))
        if date is not None:
            return date
    return None


def normalize_social_posts(platform, rows):
    items = []
    for row in rows[:PAGE_ROWS]:
        if not isinstance(row, dict) or str(row.get('isPrivate', '')).lower() == 'true':
            continue
        username = str(row.get('username') or '')
        if platform == 'instagram':
            url = str(row.get('codeUrl') or '')
            try:
                parsed = urlsplit(url)
            except ValueError:
                continue
            if (parsed.scheme != 'https' or parsed.netloc not in ('instagram.com', 'www.instagram.com')
                    or not re.fullmatch(r'/(p|reel|tv)/[\w-]+/?', parsed.path)):
                continue
            url = 'https://www.instagram.com' + parsed.path.rstrip('/') + '/'
            text = str(row.get('caption') or '')
            fields = {'likeCount':'likes', 'commentCount':'comments', 'reshareCount':'shares', 'videoPlayCount':'views'}
        elif platform == 'tiktok':
            post_id = str(row.get('id') or '')
            if not re.fullmatch(r'[0-9]+', post_id) or not _social_username(platform, username):
                continue
            url = f'https://www.tiktok.com/@{username}/video/{post_id}'
            text = str(row.get('description') or '')
            fields = {'likeCount':'likes', 'commentCount':'comments', 'forwardCount':'shares', 'playCount':'views'}
        elif platform == 'reddit':
            if str(row.get('over18', '')).lower() == 'true':
                continue
            permalink = str(row.get('permalink') or '')
            # Rebuild the link from the validated path; never trust a provider-supplied host.
            if not re.fullmatch(r'/r/[A-Za-z0-9_]{2,21}/comments/[a-z0-9]{4,10}/[\w%-]*/?', permalink):
                continue
            url = 'https://www.reddit.com' + permalink.rstrip('/') + '/'
            username = str(row.get('authorUsername') or '')
            text = '\n\n'.join(part for part in (str(row.get('title') or '').strip(), str(row.get('selftext') or '').strip()) if part)
            fields = {'score':'likes', 'commentsCount':'comments', 'crosspostsCount':'shares'}
        else:
            raise ValueError('Unsupported social platform')
        metrics = observed_metrics(row, fields)
        if platform == 'reddit':
            if re.fullmatch(r'[A-Za-z0-9_-]{3,20}', username):
                metrics['author_username'] = username
            if re.fullmatch(r'[A-Za-z0-9_]{2,21}', str(row.get('subredditName') or '')):
                metrics['community'] = 'r/' + row['subredditName']
        elif _social_username(platform, username):
            metrics['author_username'] = username
        media_url = _public_image_url(row.get('imageUrl' if platform == 'instagram' else 'videoThumbnail'))
        if media_url:
            metrics['media_url'] = media_url
        if platform == 'instagram':
            profile_image = _public_image_url(row.get('profilePicUrl'))
            if profile_image:
                metrics['profile_image_url'] = profile_image
            media_type = str(row.get('mediaType') or '').lower()
            if media_type in ('image', 'photo', 'video', 'carousel', 'carousel_album'):
                metrics['media_type'] = media_type
        elif media_url:
            metrics['media_type'] = 'video'
        if row.get('userId'):
            metrics['author_id'] = str(row['userId'])
        provider_id = str(row.get('id') or '')
        if platform != 'reddit' and re.fullmatch(r'[0-9]+(_[0-9]+)?', provider_id):
            metrics['provider_post_id'] = provider_id
        items.append({'source':'xpoz', 'platform':platform, 'url':url, 'text':text, 'title':text[:500],
                      'author':username[:200] or None,
                      'published_at':(published(row.get('createdAtTimestamp')) or _social_date(row)) if platform == 'reddit' else _social_date(row),
                      'metrics':metrics})
    return items


async def _initialize(client):
    init = await _rpc(client, {'jsonrpc':'2.0','id':1,'method':'initialize','params':{
        'protocolVersion':'2025-03-26','capabilities':{},'clientInfo':{'name':'pulse','version':'1.0'}}})
    if not isinstance(init, dict) or not init.get('protocolVersion'):
        raise ValueError('Invalid MCP initialization')
    client.headers['MCP-Protocol-Version'] = init['protocolVersion']
    await _rpc(client, {'jsonrpc':'2.0','method':'notifications/initialized'})


def _payload(result, *, account=False):
    if not isinstance(result, dict):
        raise ValueError('Invalid MCP result')
    if result.get('isError'):
        _tool_error(result)
    if result.get('structuredContent') is not None:
        return result['structuredContent']
    text = ''.join(b.get('text','') for b in result.get('content',[]) if b.get('type')=='text')
    if not account:
        return parse_tool_text(text)
    try:
        return json.loads(text)
    except ValueError:
        # Account tool emits a simple indentation-based mapping, not post tables.
        root = {}; stack = [(-1, root)]
        for line in text.splitlines():
            if not line.strip():
                continue
            indent = len(line) - len(line.lstrip())
            key, separator, value = line.strip().partition(':')
            if not separator or not re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', key):
                raise ValueError('Invalid account metadata')
            while stack[-1][0] >= indent:
                stack.pop()
            if not value.strip():
                child = {}; stack[-1][1][key] = child; stack.append((indent, child))
            else:
                try:
                    scalar = json.loads(value.strip())
                except ValueError:
                    scalar = value.strip()
                stack[-1][1][key] = scalar
        return root


def account_snapshot(result, tools):
    payload = _payload(result, account=True)
    if payload.get('status') not in (None, 'success') or payload.get('error'):
        _tool_error(payload)
    data = payload.get('data', payload)
    plan, usage = data.get('plan') or {}, data.get('usage') or {}
    if not isinstance(plan, dict) or not isinstance(usage, dict) or 'subscriptionCreditsRemaining' not in usage:
        raise ValueError('Incomplete account metadata')
    def balance(value):
        return int(value) if str(value).isdigit() else None
    return {'status':'verified', 'plan':plan.get('name'),
            'credits_remaining':balance(usage.get('subscriptionCreditsRemaining')),
            'extra_credits_remaining':balance(usage.get('extraCreditsRemaining')),
            'credit_reset_frequency':(plan.get('features') or {}).get('creditResetFrequency'),
            'tools':tools, 'error':None}


async def fetch_xpoz_account(api_key):
    async with asyncio.timeout(45):
        async with httpx.AsyncClient(timeout=30, follow_redirects=False, headers={
            'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
            await _initialize(client)
            listing = await _rpc(client, {'jsonrpc':'2.0','id':2,'method':'tools/list'})
            names = [t['name'] for t in listing.get('tools',[]) if isinstance(t,dict) and isinstance(t.get('name'),str)]
            result = await _rpc(client, {'jsonrpc':'2.0','id':3,'method':'tools/call',
                                         'params':{'name':'getAccountDetails','arguments':{}}})
    return account_snapshot(result, names)


async def fetch_xpoz_social_items(query, api_key, platform, limit=5, *, start=None, end=None, complete=False):
    """Instagram, TikTok or Reddit posts for a query: one direct answer of at most `limit` rows, or, with `complete`,
    every post the search matched through the provider's paging mode."""
    if platform not in SOCIAL_TOOLS or not query.strip() or len(query)>250 or (not complete and not 1<=limit<=PAGE_ROWS):
        raise ValueError('Invalid bounded social search')
    if complete:
        async with asyncio.timeout(COMPLETE_TIMEOUT):
            async with httpx.AsyncClient(timeout=60, follow_redirects=False, headers={
                'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
                await _initialize(client)
                rows = await _complete_rows(client, SOCIAL_TOOLS[platform], {
                    'query':query, 'forceLatest':True, 'fields':SOCIAL_FIELDS[platform].split(','),
                    **({'sort':'new'} if platform == 'reddit' else {}), **_window(start, end)})
        items = normalize_social_posts(platform, rows)
        if rows and not items:
            raise XpozToolError('unusable_results')
        return items
    async with asyncio.timeout(45):
        async with httpx.AsyncClient(timeout=30, follow_redirects=False, headers={
            'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
            await _initialize(client)
            result = await _rpc(client, {'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
                'name':SOCIAL_TOOLS[platform], 'arguments':{'query':query, 'responseType':'fast',
                'limit':limit, 'forceLatest':False, 'fields':SOCIAL_FIELDS[platform].split(','),
                **({'sort':'new'} if platform == 'reddit' else {}), **_window(start, end)}}})
    rows = _stored_rows(_payload(result))
    items = normalize_social_posts(platform, rows[:limit])
    if rows and not items:
        raise XpozToolError('unusable_results')
    return items


TIKTOK_SEARCH_SECONDS = 120   # measured 9 to 20 s; a search that hangs must not hold back the ones that answered
TIKTOK_DAYS = 7
_now = time.monotonic
_turns: dict[str, int] = {}


def tiktok_recent_window():
    """The window of a routine TikTok pull: the last week up to tomorrow (the provider's days are UTC). Without a
    window the answer is mostly old posts: 100 rows spread over 51 different days, measured 15 Nov 2026."""
    today = datetime.now().date()
    return {'start': (today - timedelta(days=TIKTOK_DAYS)).isoformat(), 'end': (today + timedelta(days=1)).isoformat()}


async def fetch_xpoz_tiktok_items(query, api_key, *, start=None, end=None, budget=None):
    """TikTok posts for a query, asked for more than one way: the whole query, and each of its words by itself.

    One TikTok keyword search answers with some tens of posts, and a different set for each wording (measured
    15 Nov 2026 over seven days: 56 posts for a six-word query, 81 with every word also asked for alone; asking day
    by day or by hashtag added none). Each search is one paid call (5 credits). A word that is only part of the query
    (the first side of an AND) brings posts the query does not mean, so its posts are checked against the whole
    query; the provider's answer to the whole query is kept as it is.

    The searches run one after another: three at once were answered with HTTP 429 that day, which paused the whole
    lane. Nothing more is asked after a 429, or once `budget` seconds have passed (a scheduled job's answer must
    arrive inside its lease). A search that fails loses only its own posts; when none answers, the refusal is raised."""
    from .query_match import matches_query, search_words
    searches = [(query, False)]
    for word in search_words(query):
        asked = f'"{word}"' if re.search(r'\s', word) else word
        if asked.lower() not in (query.strip().lower(), query.strip().strip('"').lower()):
            searches.append((asked, not matches_query(query, word)))
    if budget is not None and len(searches) > 2:
        # A budgeted pull may not reach its last words, so each run starts one word further on.
        turn = _turns.get(query, 0) % (len(searches) - 1)
        _turns[query] = turn + 1
        searches = searches[:1] + searches[1 + turn:] + searches[1:1 + turn]
    found, errors, answered, began = {}, [], 0, _now()
    for search, check in searches:
        left = TIKTOK_SEARCH_SECONDS if budget is None else min(TIKTOK_SEARCH_SECONDS, budget - (_now() - began))
        if left <= 0:
            break
        try:
            async with asyncio.timeout(left):
                answer = await fetch_xpoz_social_items(search, api_key, 'tiktok', start=start, end=end, complete=True)
        except Exception as exc:
            errors.append(exc)
            if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
                break
            continue
        answered += 1
        for item in answer:
            if not check or matches_query(query, item.get('text')):
                found.setdefault(item['url'], item)
    if errors and not answered:
        # The refusal worth reporting is the one that says why (balance, access, too many requests), not a bare failure.
        named = [e for e in errors if isinstance(e, (XpozToolError, httpx.HTTPStatusError)) and getattr(e, 'code', '') != 'provider_error']
        raise (named or errors)[0]
    return list(found.values())


def normalize_comments(platform, rows, post_url):
    """Provider rows to the stored comment shape. Text is kept as data; nothing here is rendered as markup."""
    comments = {}
    for row in rows[:PAGE_ROWS]:
        if not isinstance(row, dict):
            continue
        comment_id, text = str(row.get('id') or ''), row.get('text')
        if not re.fullmatch(r'[0-9A-Za-z_-]{1,80}', comment_id) or not isinstance(text, str) or not text.strip():
            continue
        author = row.get('authorUsername') if platform == 'x' else row.get('username')
        date = _social_date(row) if platform != 'x' else published(row.get('createdAt') or row.get('createdAtDate'))
        def number(key):
            value = row.get(key)
            return int(value) if str(value).isdigit() else None
        comments[comment_id] = {
            'id': comment_id, 'author': author[:200] if isinstance(author, str) and author else None,
            'text': text[:5000], 'published_at': date.isoformat() if date else None,
            'likes': number('likeCount'), 'replies': number('replyCount' if platform == 'x' else 'childCommentCount'),
            'url': f'https://x.com/i/status/{comment_id}' if platform == 'x' and comment_id.isdigit() else post_url}
    return sorted(comments.values(), key=lambda c: -(c['likes'] if c['likes'] is not None else -1))


async def fetch_xpoz_comments(platform, post_id, api_key, post_url, limit=PAGE_ROWS, complete=False):
    """Comments of one post. The default is one fast call of at most `limit` (300) comments, no paging, polling or retry.
    `complete` reads every comment the provider can deliver through its paging mode (100 a page, fresh from the platform)."""
    if platform not in COMMENT_TOOLS or not re.fullmatch(r'[0-9]+(_[0-9]+)?', post_id or '') or not 1 <= limit <= PAGE_ROWS:
        raise ValueError('Invalid bounded comment request')
    fields = COMMENT_FIELDS[platform].split(',')
    if complete:
        async with asyncio.timeout(COMPLETE_TIMEOUT):
            async with httpx.AsyncClient(timeout=60, follow_redirects=False, headers={
                'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
                await _initialize(client)
                rows = await _complete_rows(client, COMMENT_TOOLS[platform], {'postId': post_id, 'forceLatest': True, 'fields': fields}, key='postId')
        return {'items': normalize_comments(platform, rows, post_url), 'has_more': False}
    async with asyncio.timeout(60):
        async with httpx.AsyncClient(timeout=45, follow_redirects=False, headers={
            'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
            await _initialize(client)
            result = await _rpc(client, {'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
                'name':COMMENT_TOOLS[platform], 'arguments':{'postId':post_id, 'responseType':'fast',
                'limit':limit, 'forceLatest':False, 'fields':fields}}})
    rows = _stored_rows(_payload(result))
    return {'items': normalize_comments(platform, rows, post_url), 'has_more': len(rows) >= limit}


def _one_line(value, limit):
    """Free text from a profile as one plain line of at most `limit` characters, or None when there is none."""
    if not isinstance(value, str):
        return None
    text = ' '.join(''.join(char if char.isprintable() else ' ' for char in value).split())
    return text[:limit] or None


def normalize_profiles(rows, by='id'):
    """Provider rows to {account id: {photo_url, followers, location, based_in}}.

    The small default picture is swapped for the 200px one. `location` is what the owner wrote on the profile,
    `based_in` the country or region the platform names for the account; both None when the row carries none.
    """
    profiles = {}
    for row in rows[:100]:
        if not isinstance(row, dict) or not re.fullmatch(r'[0-9]{1,25}', str(row.get('id') or '')):
            continue
        # `by='username'` is for people known only by their handle (commenters): the answer is keyed by it, in lower case.
        name = row.get('username')
        if by == 'username' and not (isinstance(name, str) and re.fullmatch(r'[A-Za-z0-9_]{1,15}', name)):
            continue
        photo = _public_image_url(row.get('profileImageUrl'))
        if photo and urlsplit(photo).hostname == 'pbs.twimg.com':
            photo = re.sub(r'_normal(\.[A-Za-z]{3,4})$', r'_200x200\1', photo)
        followers = row.get('followersCount')
        profiles[name.lower() if by == 'username' else str(row['id'])] = {'photo_url': photo, 'followers': int(followers) if str(followers).isdigit() else None,
                                    'location': _one_line(row.get('location'), 200), 'based_in': _one_line(row.get('accountBasedIn'), 80)}
    return profiles


async def fetch_xpoz_profiles(ids, api_key):
    """One call: picture, follower count and profile location for up to 100 X accounts, by account id. No paging or retry.
    The location fields ride on the same call; measured 15 Nov 2026 it stays at about 2 credits an account."""
    ids = [str(value) for value in ids]
    if not ids or len(ids) > 100 or not all(re.fullmatch(r'[0-9]{1,25}', value) for value in ids):
        raise ValueError('Invalid bounded profile request')
    async with asyncio.timeout(60):
        async with httpx.AsyncClient(timeout=45, follow_redirects=False, headers={
            'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
            await _initialize(client)
            result = await _rpc(client, {'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
                'name':'getTwitterUsers', 'arguments':{'identifiers':ids, 'identifierType':'id',
                'fields':['id','username','profileImageUrl','followersCount','location','accountBasedIn']}}})
    return normalize_profiles(_stored_rows(_payload(result)))


async def fetch_xpoz_profiles_by_username(usernames, api_key):
    """One call: picture, follower count and profile location for up to 100 X accounts, by username. No paging or retry.
    For people known only by their handle, such as commenters. Returned under the username in lower case."""
    names = [str(value) for value in usernames]
    if not names or len(names) > 100 or not all(re.fullmatch(r'[A-Za-z0-9_]{1,15}', value) for value in names):
        raise ValueError('Invalid bounded profile request')
    async with asyncio.timeout(60):
        async with httpx.AsyncClient(timeout=45, follow_redirects=False, headers={
            'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
            await _initialize(client)
            result = await _rpc(client, {'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
                'name':'getTwitterUsers', 'arguments':{'identifiers':names, 'identifierType':'username',
                'fields':['id','username','profileImageUrl','followersCount','location','accountBasedIn']}}})
    return normalize_profiles(_stored_rows(_payload(result)), by='username')


_call_ids = itertools.count(10)      # calls that share a session each carry their own id


@asynccontextmanager
async def open_session(api_key):
    """One supplier session for several calls in a row. Opening a session costs two requests, and the supplier
    refuses after about 35 requests in half a minute (HTTP 429, measured 15 Nov 2026), so a batch of single-account
    lookups shares one instead of opening one each."""
    async with httpx.AsyncClient(timeout=45, follow_redirects=False, headers={
            'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
        await _initialize(client)
        yield client


def is_rate_limit(error):
    """The supplier's request limit, whichever way it is said: as an HTTP 429 or as a tool error."""
    return (isinstance(error, httpx.HTTPStatusError) and error.response.status_code == 429) or (isinstance(error, XpozToolError) and str(error) == 'rate_limited')


async def _account_call(tool, username, fields, api_key, client):
    """One single-account tool call, on the caller's session when it has one, on a session of its own otherwise."""
    message = {'jsonrpc':'2.0','id':next(_call_ids),'method':'tools/call','params':{
        'name':tool, 'arguments':{'identifier':username, 'identifierType':'username', 'fields':fields}}}
    async with asyncio.timeout(60):
        if client is not None:
            return await _rpc(client, message)
        async with open_session(api_key) as own:
            return await _rpc(own, message)


# The supplier's status for an account it cannot find (renamed, deleted, or never an account). It is an answer, not a
# failure: read as a failure, the account is never noted as looked up and the lane asks for it again at every step.
NO_ACCOUNT = 'no_data'


def normalize_instagram_user(payload):
    """The provider's answer for one Instagram account as {photo_url, followers}; {} when it names no account."""
    data = payload.get('data') if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        return {}
    followers = data.get('followerCount')
    return {'photo_url': _public_image_url(data.get('profilePicUrl')), 'followers': int(followers) if str(followers).isdigit() else None}


async def fetch_xpoz_instagram_user(username, api_key, client=None):
    """One call for one Instagram account, by username: its current picture link and follower count. No retry.
    Measured 14 Nov 2026: 12 credits a call, against about 2 an account for X, so this lane has its own switch.
    `client` is a session from `open_session` shared by a batch; without one the call opens its own."""
    if not isinstance(username, str) or not re.fullmatch(r'[A-Za-z0-9_.]{1,30}', username):
        raise ValueError('Invalid Instagram username')
    result = await _account_call('getInstagramUser', username, ['id','username','profilePicUrl','followerCount'], api_key, client)
    payload = _payload(result, account=True)
    if isinstance(payload, dict) and (payload.get('status') not in (None, 'success', NO_ACCOUNT) or payload.get('error')):
        _tool_error(payload)
    return normalize_instagram_user(payload)


def normalize_tiktok_user(payload):
    """The provider's answer for one TikTok account as {photo_url, followers}; {} when it names no account."""
    data = payload.get('data') if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        return {}
    followers = data.get('followerCount')
    return {'photo_url': _public_image_url(data.get('avatar')), 'followers': int(followers) if str(followers).isdigit() else None}


async def fetch_xpoz_tiktok_user(username, api_key, client=None):
    """One call for one TikTok account, by username: its current picture link and follower count. No retry.
    Measured 14 Nov 2026: 5 credits a call. `client` is a shared session, as for Instagram."""
    if not isinstance(username, str) or not re.fullmatch(r'[A-Za-z0-9_.]{1,24}', username):
        raise ValueError('Invalid TikTok username')
    result = await _account_call('getTiktokUser', username, ['id','username','avatar','followerCount'], api_key, client)
    payload = _payload(result, account=True)
    if isinstance(payload, dict) and (payload.get('status') not in (None, 'success', NO_ACCOUNT) or payload.get('error')):
        _tool_error(payload)
    return normalize_tiktok_user(payload)


class XpozToolError(Exception):
    def __init__(self, code="provider_error"):
        self.code = code
        super().__init__(code)


async def fetch_xpoz_items(query: str, api_key: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
        response = await client.get(URL, params={"q": query, "fields": FIELDS, "sortBy": "latest"},
                                    headers={"Authorization": f"Bearer {api_key}"})
        response.raise_for_status()
        payload = response.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
        raise ValueError("Invalid provider response")
    return normalize_posts(payload["results"])


def normalize_posts(rows, limit=PAGE_ROWS):
    items = []
    for row in rows[:limit]:
        post_id = str(row.get("id") or "")
        if not post_id.isdigit():
            continue
        metrics = observed_metrics(row, {"likeCount": "likes", "replyCount": "comments",
                                         "retweetCount": "shares", "impressionCount": "views"})
        metrics = mark_repost(metrics)
        if row.get("authorId"):
            metrics["author_id"] = str(row["authorId"])
        items.append({"source": "xpoz", "platform": "x", "url": f"https://x.com/i/status/{post_id}",
                      "text": row.get("text") or "", "title": (row.get("text") or "")[:500],
                      "author": row.get("authorUsername"), "published_at": published(row.get("createdAt") or row.get("createdAtDate")),
                      "metrics": metrics})
    # Do not infer coordinates from place names, bounding boxes or profile locations.
    return items


async def _rpc(client, message):
    """A single Streamable HTTP request. Never reconnect/replay on failure."""
    async with client.stream("POST", MCP_URL, json=message) as response:
        response.raise_for_status()
        session = response.headers.get("mcp-session-id")
        if session:
            client.headers["Mcp-Session-Id"] = session
        if "id" not in message:
            return None
        if "text/event-stream" not in response.headers.get("content-type", ""):
            await response.aread()
            result = response.json()
        else:
            data, result = [], None
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data.append(line[5:].lstrip())
                elif not line and data:
                    event = json.loads("\n".join(data))
                    data = []
                    if event.get("id") == message["id"]:
                        result = event
                        break
            if result is None:
                raise ValueError("Missing MCP response")
        if not isinstance(result, dict) or result.get("id") != message["id"]:
            raise ValueError("Invalid MCP response")
        if result.get("error"):
            _tool_error(result["error"])
        return result.get("result")


def _tool_error(payload):
    # Classify remote text internally, but never return it to clients or logs.
    text = json.dumps(payload).lower()
    code = str(payload.get('code', '')) if isinstance(payload, dict) else ''
    if code == '401' or any(word in text for word in ('unauthorized', 'unauthenticated', 'invalid api key', 'authentication failed')):
        raise XpozToolError('authentication_failed')
    if code == '429' or any(word in text for word in ('rate limit', 'rate_limit', 'too many requests')):
        raise XpozToolError('rate_limited')
    if code in ('402', '403') or any(word in text for word in ('permission denied', 'access denied', 'insufficient permission')):
        raise XpozToolError('access_or_quota_restricted')
    restricted = any(word in text for word in ("trial", "plan", "credit", "quota", "subscription", "forbidden"))
    raise XpozToolError("plan_restricted" if restricted else "provider_error")


def _stored_rows(payload):
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        raise ValueError("Invalid stored-search response")
    if payload.get("error") or payload.get("success") in (False, "false") or payload.get("status") in ("failed", "cancelled"):
        _tool_error(payload)
    if payload.get("status") in ("running", "pending", "processing"):
        raise XpozToolError("pending")
    for key in ("data", "results", "posts", "items", "comments"):
        value = payload.get(key)
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            return _stored_rows(value)
    if payload.get("operationId"):
        raise XpozToolError("pending")
    raise ValueError("Missing stored-search results")


POLL_SECONDS = 5          # the provider asks for a status check every five seconds
MAX_POLLS = 120           # ten minutes for one operation
COMPLETE_TIMEOUT = 1800   # a complete search reads one page after another
CONNECT_TRIES, CONNECT_PAUSE = 4, 4   # the provider's front door drops a connection now and then


async def _delivered(client, message):
    """One request, asked again only when the connection never opened: nothing reached the provider then, so nothing
    was charged. Any failure after the request was sent is not repeated."""
    for attempt in range(CONNECT_TRIES):
        try:
            return await _rpc(client, message)
        except (httpx.ConnectError, httpx.ConnectTimeout):
            if attempt == CONNECT_TRIES - 1:
                raise
            await asyncio.sleep(CONNECT_PAUSE)


def _answer_text(result):
    if not isinstance(result, dict):
        raise ValueError('Invalid MCP tool result')
    if result.get('isError'):
        _tool_error(result)
    return ''.join(block.get('text', '') for block in result.get('content', []) if isinstance(block, dict) and block.get('type') == 'text')


async def _finished(client, tool, arguments, ids):
    """Start one provider operation and return its final answer text.
    Paging mode answers with an operation id first; the result arrives when a status check says it is done."""
    text = _answer_text(await _delivered(client, {'jsonrpc': '2.0', 'id': next(ids), 'method': 'tools/call', 'params': {'name': tool, 'arguments': arguments}}))
    for _ in range(MAX_POLLS):
        status = re.search(r'^status: *"?(\w+)', text, re.M)
        operation = re.search(r'^operationId: *"?([A-Za-z0-9_\-]+)', text, re.M)
        if not (operation and status and status.group(1) in ('running', 'pending', 'processing')):
            return text
        await asyncio.sleep(POLL_SECONDS)
        text = _answer_text(await _delivered(client, {'jsonrpc': '2.0', 'id': next(ids), 'method': 'tools/call',
                                                'params': {'name': 'checkOperationStatus', 'arguments': {'operationId': operation.group(1)}}}))
    raise XpozToolError('pending')


def _page_rows(text):
    if re.search(r'^\s*totalRows: *0\s*$', text, re.M) or re.search(r'^\s*results\[0\]', text, re.M):
        return []
    return _stored_rows(parse_tool_text(text))


async def _complete_rows(client, tool, arguments, key='query'):
    """Every row a search matched, not only the first direct answer (100 to 300 rows).
    The search runs once in the provider's paging mode; the remaining pages are read from its result table, one
    page a request (measured 14 Nov 2026: 2 credits a page of 100 rows). No row limit of ours is sent."""
    ids = iter(range(10, 10 ** 6))
    text = await _finished(client, tool, {**arguments, 'responseType': 'paging'}, ids)
    rows = list(_page_rows(text))
    pages = re.search(r'^\s*totalPages: *(\d+)', text, re.M)
    table = re.search(r'^\s*tableName: *"?([A-Za-z0-9_\-]+)', text, re.M)
    for number in range(2, (int(pages.group(1)) if pages and table else 1) + 1):
        text = await _finished(client, tool, {key: arguments[key], 'responseType': 'paging', 'tableName': table.group(1),
                                              'pageNumber': number, 'fields': arguments['fields']}, ids)
        rows.extend(_page_rows(text))
    return rows


async def fetch_xpoz_stored_items(query: str, api_key: str, *, start=None, end=None, complete=False) -> list[dict]:
    """X posts for a query. The default is one direct answer (the newest posts, at most 300).
    `complete` reads every post the search matched through the provider's paging mode, at a cost per page."""
    if not query.strip() or len(query) > 250:
        raise ValueError("Stored query must be 1-250 characters")
    if complete:
        async with asyncio.timeout(COMPLETE_TIMEOUT):
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=False, headers={
                "Authorization": f"Bearer {api_key}", "Accept": "application/json, text/event-stream"}) as client:
                await _initialize(client)
                rows = await _complete_rows(client, 'getTwitterPostsByKeywords', {
                    # Fresh from the platform: measured 14 Nov 2026, 313 rows against 276 from the stored answer, same price.
                    'query': query, 'forceLatest': True, 'sortBy': 'latest', **_window(start, end), 'fields': FIELDS.split(',')})
        return normalize_posts(rows, limit=None)
    async with asyncio.timeout(45):
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=False, headers={
            "Authorization": f"Bearer {api_key}", "Accept": "application/json, text/event-stream",
        }) as client:
            init = await _rpc(client, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
                "protocolVersion": "2025-03-26", "capabilities": {},
                "clientInfo": {"name": "gerak-pulse", "version": "1.0"},
            }})
            if not isinstance(init, dict) or not init.get("protocolVersion"):
                raise ValueError("Invalid MCP initialization")
            client.headers["MCP-Protocol-Version"] = init["protocolVersion"]
            await _rpc(client, {"jsonrpc": "2.0", "method": "notifications/initialized"})
            result = await _rpc(client, {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {
                "name": "getTwitterPostsByKeywords", "arguments": {
                    "query": query, "responseType": "fast", "limit": PAGE_ROWS, "forceLatest": False,
                    # Newest first: a repeated relevance search keeps returning the same top posts.
                    "sortBy": "latest", **_window(start, end),
                    "fields": FIELDS.split(","),
                },
            }})
    if not isinstance(result, dict):
        raise ValueError("Invalid MCP tool result")
    if result.get("isError"):
        _tool_error(result)
    if result.get("structuredContent") is not None:
        return normalize_posts(_stored_rows(result["structuredContent"]))
    text = "".join(block.get("text", "") for block in result.get("content", []) if block.get("type") == "text")
    return normalize_posts(_stored_rows(parse_tool_text(text)))

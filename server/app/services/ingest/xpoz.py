"""Xpoz REST live search: exactly one page, no retries or trial fallback.

Contract: https://docs.xpoz.ai/rest-api/overview
Live search requires a compatible plan (trial keys are not supported).
"""
import httpx
import asyncio
import json
import re
from urllib.parse import urlsplit, urlunsplit
from datetime import datetime, timezone
from .common import observed_metrics, published
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
    for field in ('createdAtDate', 'createdAt'):
        date = published(row.get(field))
        if date is not None:
            return date
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


async def fetch_xpoz_social_items(query, api_key, platform, limit=5, *, start=None, end=None):
    if platform not in SOCIAL_TOOLS or not query.strip() or len(query)>250 or not 1<=limit<=PAGE_ROWS:
        raise ValueError('Invalid bounded social search')
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


async def fetch_xpoz_comments(platform, post_id, api_key, post_url, limit=PAGE_ROWS):
    """One fast call: up to 300 comments of one post. No paging, polling or retry."""
    if platform not in COMMENT_TOOLS or not re.fullmatch(r'[0-9]+(_[0-9]+)?', post_id or '') or not 1 <= limit <= PAGE_ROWS:
        raise ValueError('Invalid bounded comment request')
    async with asyncio.timeout(60):
        async with httpx.AsyncClient(timeout=45, follow_redirects=False, headers={
            'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
            await _initialize(client)
            result = await _rpc(client, {'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
                'name':COMMENT_TOOLS[platform], 'arguments':{'postId':post_id, 'responseType':'fast',
                'limit':limit, 'forceLatest':False, 'fields':COMMENT_FIELDS[platform].split(',')}}})
    rows = _stored_rows(_payload(result))
    return {'items': normalize_comments(platform, rows, post_url), 'has_more': len(rows) >= limit}


def normalize_profiles(rows):
    """Provider rows to {account id: {photo_url, followers}}. The small default picture is swapped for the 200px one."""
    profiles = {}
    for row in rows[:100]:
        if not isinstance(row, dict) or not re.fullmatch(r'[0-9]{1,25}', str(row.get('id') or '')):
            continue
        photo = _public_image_url(row.get('profileImageUrl'))
        if photo and urlsplit(photo).hostname == 'pbs.twimg.com':
            photo = re.sub(r'_normal(\.[A-Za-z]{3,4})$', r'_200x200\1', photo)
        followers = row.get('followersCount')
        profiles[str(row['id'])] = {'photo_url': photo, 'followers': int(followers) if str(followers).isdigit() else None}
    return profiles


async def fetch_xpoz_profiles(ids, api_key):
    """One call: picture and follower count for up to 100 X accounts, by account id. No paging or retry."""
    ids = [str(value) for value in ids]
    if not ids or len(ids) > 100 or not all(re.fullmatch(r'[0-9]{1,25}', value) for value in ids):
        raise ValueError('Invalid bounded profile request')
    async with asyncio.timeout(60):
        async with httpx.AsyncClient(timeout=45, follow_redirects=False, headers={
            'Authorization':f'Bearer {api_key}', 'Accept':'application/json, text/event-stream'}) as client:
            await _initialize(client)
            result = await _rpc(client, {'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
                'name':'getTwitterUsers', 'arguments':{'identifiers':ids, 'identifierType':'id',
                'fields':['id','username','profileImageUrl','followersCount']}}})
    return normalize_profiles(_stored_rows(_payload(result)))


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


def normalize_posts(rows):
    items = []
    for row in rows[:PAGE_ROWS]:
        post_id = str(row.get("id") or "")
        if not post_id.isdigit():
            continue
        metrics = observed_metrics(row, {"likeCount": "likes", "replyCount": "comments",
                                         "retweetCount": "shares", "impressionCount": "views"})
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


async def fetch_xpoz_stored_items(query: str, api_key: str, *, start=None, end=None) -> list[dict]:
    """Trial-oriented stored search: one fast tool call; no forceLatest, polls or fallback."""
    if not query.strip() or len(query) > 250:
        raise ValueError("Stored query must be 1-250 characters")
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

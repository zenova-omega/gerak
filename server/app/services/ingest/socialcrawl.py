"""Public Threads posts through SocialCrawl's search: every search word of the project, every page, the query checked here.

Unlike the platform's own API before app approval, this search reaches every public post, and each row carries its
likes, replies and reposts. It is paid: one credit per window of about 15 posts returned (measured 15 Nov 2026: 18 rows
for 1 credit, and the whole week for one word, 30 rows, for 2). Nothing is capped here: each word is read to its last
page, and the run ends early only when the source refuses (an empty balance included). Query widening is switched off
and nothing is retried. The credits spent and left are read from each answer and returned in `stats`.
"""
import re

import httpx

from .common import count, observed_engagement, published
from .query_match import matches_query, search_words
from .threads import POST_LINK
from .xpoz import _public_image_url

BASE = 'https://www.socialcrawl.dev/v1'
PAGE = 45           # rows asked for per call: three windows. A call of 100 rows took over two minutes on a busy word (15 Nov 2026)
USERNAME = re.compile(r'[A-Za-z0-9._]{1,60}')
REFUSALS = {401: 'token', 402: 'credits', 403: 'permission', 429: 'quota'}


def _number(value):
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


def _item(row):
    """One search row as the row PULSE ingests, or None when it is not a public post with a link and a text."""
    post = row.get('post') if isinstance(row, dict) else None
    if not isinstance(post, dict):
        return None
    content, author, engagement = (post.get(key) if isinstance(post.get(key), dict) else {} for key in ('content', 'author', 'engagement'))
    link, text = post.get('url'), content.get('text')
    if not isinstance(link, str) or not POST_LINK.fullmatch(link) or not isinstance(text, str) or not text.strip():
        return None
    metrics = {name: count(engagement[name]) for name in ('likes', 'comments', 'shares', 'views') if _number(engagement.get(name)) is not None}
    metrics['engagement'] = observed_engagement(metrics)
    name = author.get('username')
    name = name if isinstance(name, str) and USERNAME.fullmatch(name) else None
    # Who wrote it and what it carries, under the names the other sources use, so account pages, pictures and the
    # network read a Threads post like any other. The source reports no place for a post or an account.
    ext = post.get('ext') if isinstance(post.get('ext'), dict) else {}
    if name:
        metrics['author_username'] = name
    shown = author.get('display_name')
    if isinstance(shown, str) and shown.strip():
        metrics['author_name'] = ' '.join(shown.split())[:120]
    if isinstance(author.get('verified'), bool):
        metrics['author_verified'] = author['verified']
    if re.fullmatch(r'[0-9]{1,30}', str(ext.get('author_id') or '')):
        metrics['author_id'] = str(ext['author_id'])
    if re.fullmatch(r'[0-9]{1,30}', str(post.get('id') or '')):
        metrics['provider_post_id'] = str(post['id'])
    picture = _public_image_url(author.get('avatar_url'))
    if picture:
        metrics['profile_image_url'] = picture       # a signed link: it stops working after some hours
    media = content.get('media_urls')
    media = [media] if isinstance(media, str) else media if isinstance(media, list) else []
    preview = _public_image_url(content.get('thumbnail_url')) or next((link for link in map(_public_image_url, media) if link), None)
    if preview:
        metrics['media_url'] = preview
        metrics['media_type'] = 'carousel' if len(media) > 1 else 'video' if content.get('duration_seconds') else 'image'
    tags = [tag for tag in (ext.get('hashtags') or []) if isinstance(tag, str) and tag][:30] if isinstance(ext.get('hashtags'), list) else []
    if tags:
        metrics['hashtags'] = tags
    if _number(ext.get('quote_count')) is not None:
        metrics['quotes'] = ext['quote_count']
    if isinstance(ext.get('topic_tag'), str) and ext['topic_tag'].strip():
        metrics['topic_tag'] = ext['topic_tag'].strip()[:120]
    return {'source': 'threads', 'platform': 'threads', 'url': link, 'title': None, 'text': text,
            'author': name, 'published_at': published(post.get('published_at')), 'metrics': metrics}


async def fetch_socialcrawl_threads_items(query, key, *, since=None, client=None):
    """Recent public posts that match `query`, newest first. Returns `(items, stats)` in the shape of the official lane.

    `stats['stopped']` is 'token' (key refused), 'credits' (balance empty), 'permission', 'quota' (too many calls) or
    'network' (two words in a row, or every word, unanswered) when the run ended early; `stats['skipped']` counts the
    words that got no answer; what was read until then is kept. The key travels in a header only."""
    if client is None:
        async with httpx.AsyncClient() as session:
            return await fetch_socialcrawl_threads_items(query, key, since=since, client=session)
    words = search_words(query)
    stats = {'searches': len(words), 'calls': 0, 'read': 0, 'matched': 0, 'stopped': None, 'credits': 0, 'credits_remaining': None, 'skipped': 0}
    failed_in_a_row = 0
    floor = since.replace(tzinfo=None) if since is not None else None
    found = {}
    for word in words:
        cursor, asked = None, set()
        while stats['stopped'] is None:
            params = {'query': word, 'limit': PAGE, 'expand': 'false'}
            if floor is not None:
                params['start_date'] = floor.date().isoformat()
            if cursor:
                params['cursor'] = cursor
            stats['calls'] += 1
            try:
                response = await client.get(BASE + '/threads/search', params=params, headers={'x-api-key': key},
                                            follow_redirects=False, timeout=120)
                payload = response.json()
            except httpx.HTTPError:
                # One slow word is skipped and the next is asked; two in a row, or every word, is a dead line.
                stats['skipped'] += 1
                failed_in_a_row += 1
                if failed_in_a_row >= 2 or stats['skipped'] == len(words):
                    stats['stopped'] = 'network'
                break
            except ValueError:
                break                     # a passing error on one word: the next word may still answer
            failed_in_a_row = 0
            if isinstance(payload, dict):
                stats['credits'] += _number(payload.get('credits_used')) or 0
                if _number(payload.get('credits_remaining')) is not None:
                    stats['credits_remaining'] = payload['credits_remaining']
            if response.status_code in REFUSALS:
                stats['stopped'] = REFUSALS[response.status_code]
                break
            data = payload.get('data') if response.status_code == 200 and isinstance(payload, dict) else None
            rows = data.get('items') if isinstance(data, dict) else None
            if not isinstance(rows, list):
                break
            for row in rows:
                stats['read'] += 1
                item = _item(row)
                if item is None or item['url'] in found:
                    continue
                if floor is not None and (item['published_at'] is None or item['published_at'] < floor):
                    continue
                if matches_query(query, item['text']):
                    found[item['url']] = item
            more = payload.get('pagination') if isinstance(payload.get('pagination'), dict) else {}
            cursor = more.get('next_cursor') if more.get('has_more') is True else None
            # The next page is asked for only while the source says there is one; an empty page or a cursor seen
            # before ends the word, so a source that never says "no more" cannot keep charging.
            if not isinstance(cursor, str) or not cursor or cursor in asked or not rows:
                break
            asked.add(cursor)
        if stats['stopped']:
            break
    stats['matched'] = len(found)
    return sorted(found.values(), key=lambda item: (item['published_at'] is not None, item['published_at']), reverse=True), stats

"""Threads through the platform's official API: one keyword search per search word, the project's query checked here.

The search takes a single word or phrase and returns up to 100 recent public posts. Until the platform has approved
the app, it only searches the posts of the account that owns the token. Nothing is retried: a refusal that asking
again cannot cure (no permission, an expired token, a spent allowance) stops the run and is named in `stats`.
"""
import re
from datetime import timezone

import httpx

from .common import published
from .query_match import matches_query, search_words

BASE = 'https://graph.threads.net/v1.0'
FIELDS = 'id,text,media_type,permalink,timestamp,username,has_replies,is_quote_post,is_reply'
PAGE = 100          # the most one search returns
MAX_SEARCHES = 12   # per run; the platform allows 2,200 searches in 24 hours
POST_LINK = re.compile(r'https://(?:www\.)?threads\.(?:net|com)/@[A-Za-z0-9._]{1,60}/post/[A-Za-z0-9_-]{1,80}')
SPENT = {4, 17, 32, 613}     # the platform's codes for "too many calls"


def _refusal(response, payload):
    """Why the platform refused in a way the next search cannot cure, or None."""
    error = payload.get('error') if isinstance(payload, dict) else None
    code = error.get('code') if isinstance(error, dict) else None
    if response.status_code == 401 or code == 190:
        return 'token'
    if response.status_code == 429 or code in SPENT:
        return 'quota'
    if response.status_code == 403 or code in (10, 200):
        return 'permission'
    return None


async def fetch_threads_items(query, token, *, since=None, client=None):
    """Recent public posts that match `query`, newest first, as the rows PULSE ingests. Returns `(items, stats)`.

    `stats['stopped']` is 'permission', 'token', 'quota' or 'network' when the run ended early; what was read until
    then is kept. The token is sent in a header, never in the address."""
    if client is None:
        async with httpx.AsyncClient() as session:
            return await fetch_threads_items(query, token, since=since, client=session)
    words = search_words(query)[:MAX_SEARCHES]
    stats = {'searches': len(words), 'calls': 0, 'read': 0, 'matched': 0, 'stopped': None}
    found = {}
    for word in words:
        params = {'q': word, 'search_type': 'RECENT', 'fields': FIELDS, 'limit': PAGE}
        if since is not None:
            params['since'] = int(since.replace(tzinfo=since.tzinfo or timezone.utc).timestamp())
        stats['calls'] += 1
        try:
            response = await client.get(BASE + '/keyword_search', params=params, headers={'Authorization': f'Bearer {token}'},
                                        follow_redirects=False, timeout=30)
            payload = response.json()
        except httpx.HTTPError:
            stats['stopped'] = 'network'
            break
        except ValueError:
            continue
        reason = _refusal(response, payload)
        if reason:
            stats['stopped'] = reason
            break
        rows = payload.get('data') if response.status_code == 200 and isinstance(payload, dict) else None
        if not isinstance(rows, list):
            continue                      # a passing error on one word: the next word may still answer
        for row in rows[:PAGE]:
            if not isinstance(row, dict):
                continue
            stats['read'] += 1
            link, text, when = row.get('permalink'), row.get('text'), published(row.get('timestamp'))
            if not isinstance(link, str) or not POST_LINK.fullmatch(link) or not isinstance(text, str) or link in found:
                continue
            if since is not None and (when is None or when < since.replace(tzinfo=None)):
                continue
            if not matches_query(query, text):
                continue
            author = row.get('username')
            found[link] = {'source': 'threads', 'platform': 'threads', 'url': link, 'title': None, 'text': text,
                           'author': author if isinstance(author, str) else None, 'published_at': when, 'metrics': {}}
    stats['matched'] = len(found)
    return sorted(found.values(), key=lambda item: (item['published_at'] is not None, item['published_at']), reverse=True), stats

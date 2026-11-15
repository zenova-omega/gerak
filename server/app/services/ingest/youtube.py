"""YouTube Data API: one search page and at most one videos batch, no retries."""
import re
import httpx
from .common import observed_metrics, published

BASE = "https://www.googleapis.com/youtube/v3"
ALL_PAGES = 40   # far beyond what the API hands out for one search (about ten pages); a stop for a token that never ends


def youtube_query(query: str) -> str:
    # Translate the seeded grouped OR expression to YouTube's documented OR (|).
    match = re.fullmatch(r"\(([^()]+)\)\s+AND\s+(.+)", query)
    if match:
        alternatives = list(dict.fromkeys(re.split(r"\s+OR\s+", match[1])))
        return "|".join(f"{term} {match[2]}" for term in alternatives)
    return query


async def fetch_youtube_items(query: str, api_key: str, *, pages: int = 2, published_after=None, published_before=None) -> list[dict]:
    """Newest videos first: up to `pages` search pages of 50, one statistics batch per page. No retries.

    `pages=None` follows the API's next-page token until there is none (the API itself ends a search after about 500
    results). Each search page costs 100 of the day's 10,000 API units; when the day's units run out mid-search, the
    pages already read are returned instead of being thrown away.
    """
    # Header auth keeps credentials out of HTTP request URL logs.
    ids, videos, token = [], [], None
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False,
                                 headers={"X-Goog-Api-Key": api_key}) as client:
        for index in range(max(1, pages) if pages is not None else ALL_PAGES):
            params = {"part": "snippet", "type": "video", "q": youtube_query(query), "maxResults": 50, "order": "date",
                      "regionCode": "ID", "relevanceLanguage": "id"}
            if token:
                params["pageToken"] = token
            if published_after:
                params["publishedAfter"] = published_after
            if published_before:
                params["publishedBefore"] = published_before
            response = await client.get(f"{BASE}/search", params=params)
            if response.status_code == 403 and ids and pages is None:
                break   # the day's API units ran out mid-search: keep the pages already read
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
                raise ValueError("Invalid provider response")
            page = list(dict.fromkeys(row.get("id", {}).get("videoId") for row in payload["items"][:50]))
            page = [v for v in page if isinstance(v, str) and re.fullmatch(r"[A-Za-z0-9_-]+", v) and v not in ids]
            if page:
                ids.extend(page)
                response = await client.get(f"{BASE}/videos", params={"part": "snippet,statistics", "id": ",".join(page)})
                response.raise_for_status()
                detail = response.json()
                if not isinstance(detail, dict) or not isinstance(detail.get("items"), list):
                    raise ValueError("Invalid provider response")
                videos.extend(detail["items"][:50])
            token = payload.get("nextPageToken") if isinstance(payload.get("nextPageToken"), str) else None
            if not token:
                break
    if not ids:
        return []
    return _items(videos, ids)


def _items(videos, ids):
    """Video rows of the API as the rows PULSE ingests. Only ids that were asked for are kept."""
    items = []
    for row in videos:
        if row.get("id") not in ids:
            continue
        snippet, stats = row.get("snippet") or {}, row.get("statistics") or {}
        metrics = observed_metrics(stats, {"likeCount": "likes", "commentCount": "comments", "viewCount": "views"})
        if snippet.get("channelId"):
            metrics["author_id"] = snippet["channelId"]
        items.append({"source": "youtube", "platform": "youtube", "url": f"https://www.youtube.com/watch?v={row['id']}",
                      "title": (snippet.get("title") or "")[:500], "text": snippet.get("description") or "",
                      "author": snippet.get("channelTitle"), "published_at": published(snippet.get("publishedAt")),
                      "metrics": metrics})
    return items


CHANNEL_ID = re.compile(r"UC[A-Za-z0-9_-]{22}")


async def fetch_youtube_channel_uploads(channel_ids, query, api_key, *, since, known_urls=(), parallel=6):
    """New videos of known channels that match a project's keywords, read without the keyword search.

    A channel's upload list is the playlist with its id's `UC` replaced by `UU`. Reading one page of it (the 50 newest
    uploads) and one batch of video details each cost one unit of the large shared daily allowance; the keyword search
    has its own small one and is not touched here. A video is kept when it was published on or after `since`, matches
    `query` in its title or description, and is not in `known_urls`. Returns `(items, stats)`; `stats['stopped']` is
    'quota' when the day's allowance ran out, and what was read until then is kept.
    """
    import asyncio
    from datetime import timezone
    from .query_match import matches_query
    channels = [value for value in dict.fromkeys(channel_ids) if isinstance(value, str) and CHANNEL_ID.fullmatch(value)]
    known, wanted, stats = set(known_urls), [], {"channels": len(channels), "read": 0, "matched": 0, "calls": 0, "stopped": None}
    gate = asyncio.Semaphore(max(1, parallel))
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False, headers={"X-Goog-Api-Key": api_key}) as client:
        async def uploads(channel):
            async with gate:
                if stats["stopped"]:
                    return
                stats["calls"] += 1
                response = await client.get(f"{BASE}/playlistItems", params={"part": "snippet,contentDetails", "playlistId": "UU" + channel[2:], "maxResults": 50})
            if response.status_code in (403, 429):
                stats["stopped"] = "quota"          # the day's allowance is spent: asking the next channel cannot help
                return
            if response.status_code != 200:
                return                              # a channel without a public upload list, or a passing error: skip it
            payload = response.json()
            rows = payload.get("items") if isinstance(payload, dict) else None
            if not isinstance(rows, list):
                return
            stats["read"] += 1
            for row in rows[:50]:
                snippet, content = row.get("snippet") or {}, row.get("contentDetails") or {}
                video, when = content.get("videoId"), published(content.get("videoPublishedAt") or snippet.get("publishedAt"))
                if not isinstance(video, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", video) or when is None:
                    continue
                if when.tzinfo is not None:
                    when = when.astimezone(timezone.utc).replace(tzinfo=None)
                if when < since or f"https://www.youtube.com/watch?v={video}" in known:
                    continue
                if matches_query(query, f"{snippet.get('title') or ''} {snippet.get('description') or ''}") and video not in wanted:
                    wanted.append(video)
        await asyncio.gather(*(uploads(channel) for channel in channels))
        stats["matched"] = len(wanted)
        videos = []
        for start in range(0, len(wanted), 50):
            stats["calls"] += 1
            response = await client.get(f"{BASE}/videos", params={"part": "snippet,statistics", "id": ",".join(wanted[start:start + 50])})
            if response.status_code in (403, 429):
                stats["stopped"] = "quota"
                break
            response.raise_for_status()
            detail = response.json()
            if isinstance(detail, dict) and isinstance(detail.get("items"), list):
                videos.extend(detail["items"][:50])
    return _items(videos, wanted), stats


async def fetch_youtube_channels(ids, api_key):
    """One request: picture and subscriber count for up to 50 channels. Hidden subscriber counts stay unknown."""
    ids = [value for value in ids if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value)]
    if not ids or len(ids) > 50:
        raise ValueError("Invalid bounded channel request")
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False, headers={"X-Goog-Api-Key": api_key}) as client:
        response = await client.get(f"{BASE}/channels", params={"part": "snippet,statistics", "id": ",".join(ids), "maxResults": 50})
        response.raise_for_status()
        payload = response.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("items", []), list):
        raise ValueError("Invalid provider response")
    channels = {}
    for row in payload.get("items", [])[:50]:
        if not isinstance(row, dict) or row.get("id") not in ids:
            continue
        thumbs, stats = (row.get("snippet") or {}).get("thumbnails") or {}, row.get("statistics") or {}
        photo = next((thumbs[size].get("url") for size in ("medium", "default", "high") if isinstance(thumbs.get(size), dict) and thumbs[size].get("url")), None)
        subscribers = stats.get("subscriberCount")
        channels[row["id"]] = {"photo_url": photo, "followers": int(subscribers) if not stats.get("hiddenSubscriberCount") and str(subscribers).isdigit() else None}
    return channels

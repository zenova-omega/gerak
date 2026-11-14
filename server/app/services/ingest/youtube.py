"""YouTube Data API: one search page and at most one videos batch, no retries."""
import re
import httpx
from .common import observed_metrics, published

BASE = "https://www.googleapis.com/youtube/v3"


def youtube_query(query: str) -> str:
    # Translate the seeded grouped OR expression to YouTube's documented OR (|).
    match = re.fullmatch(r"\(([^()]+)\)\s+AND\s+(.+)", query)
    if match:
        alternatives = list(dict.fromkeys(re.split(r"\s+OR\s+", match[1])))
        return "|".join(f"{term} {match[2]}" for term in alternatives)
    return query


async def fetch_youtube_items(query: str, api_key: str, *, pages: int = 2, published_after=None, published_before=None) -> list[dict]:
    """Newest videos first: up to `pages` search pages of 50, one statistics batch per page. No retries.

    Each search page costs provider quota, so the page count is fixed by the caller, never open-ended.
    """
    # Header auth keeps credentials out of HTTP request URL logs.
    ids, videos, token = [], [], None
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False,
                                 headers={"X-Goog-Api-Key": api_key}) as client:
        for _ in range(max(1, pages)):
            params = {"part": "snippet", "type": "video", "q": youtube_query(query), "maxResults": 50, "order": "date",
                      "regionCode": "ID", "relevanceLanguage": "id"}
            if token:
                params["pageToken"] = token
            if published_after:
                params["publishedAfter"] = published_after
            if published_before:
                params["publishedBefore"] = published_before
            response = await client.get(f"{BASE}/search", params=params)
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
    payload = {"items": videos}
    if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
        raise ValueError("Invalid provider response")
    items = []
    for row in payload["items"]:
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

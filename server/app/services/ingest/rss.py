"""Google News RSS ingest."""
import httpx
import feedparser
from datetime import datetime

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"


def parse_rss_feed(xml: str) -> list[dict]:
    feed = feedparser.parse(xml)
    items = []
    for e in feed.entries:
        published = None
        if getattr(e, "published_parsed", None):
            published = datetime(*e.published_parsed[:6])
        source_title = None
        src = getattr(e, "source", None)
        if src is not None:
            source_title = src.get("title") if hasattr(src, "get") else getattr(src, "title", None)
        items.append({
            "source": "rss",
            "platform": "news",
            "url": getattr(e, "link", None),
            "title": getattr(e, "title", None),
            "text": getattr(e, "summary", "") or getattr(e, "title", "") or "",
            "author": source_title,
            "published_at": published,
        })
    return items


async def fetch_rss_items(query: str, lang: str = "id", country: str = "ID", *, after=None, before=None) -> list[dict]:
    """One feed for the query plus one restricted to the last day, merged by link.

    The feed returns about a hundred entries ranked by the provider; the second request surfaces
    the newest ones a busy topic would otherwise push out. With `after`/`before` (YYYY-MM-DD)
    it fetches that publication window only.
    """
    base = {"hl": lang, "gl": country, "ceid": f"{country}:{lang}"}
    window = "".join(f" {name}:{value}" for name, value in (("after", after), ("before", before)) if value)
    queries = [query + window] if window else [query, query + " when:1d"]
    seen, items = set(), []
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as c:
        for index, q in enumerate(queries):
            try:
                res = await c.get(GOOGLE_NEWS_RSS, params={"q": q, **base})
                res.raise_for_status()
            except httpx.HTTPError:
                if index == 0:
                    raise
                break  # the extra request is a bonus; the main feed already succeeded
            for item in parse_rss_feed(res.text):
                if item["url"] and item["url"] not in seen:
                    seen.add(item["url"])
                    items.append(item)
    return items

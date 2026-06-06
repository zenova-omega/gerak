"""Pulse core: ingest items, cluster into issues, crawl, enrich."""
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models.pulse import WatchTopic, Issue, SourceItem
from .dedup import simhash, is_near_duplicate
from .ranking import issue_score
from .ai import get_ai_service

NEAR_DUP_THRESHOLD = 3


async def _find_or_create_issue(db: AsyncSession, topic: WatchTopic, sh: str, title: str | None) -> Issue:
    result = await db.execute(select(Issue).where(Issue.topic_id == topic.id))
    for issue in result.scalars().all():
        if is_near_duplicate(issue.simhash, sh, NEAR_DUP_THRESHOLD):
            return issue
    issue = Issue(topic_id=topic.id, title=title or "", simhash=sh)
    db.add(issue)
    await db.flush()
    return issue


async def ingest_items(db: AsyncSession, topic: WatchTopic, items: list[dict]) -> int:
    """Insert new SourceItems, clustering each into an Issue. Returns count inserted."""
    created = 0
    for raw in items:
        url = raw.get("url")
        if not url:
            continue
        existing = await db.execute(
            select(SourceItem).where(SourceItem.topic_id == topic.id, SourceItem.url == url)
        )
        if existing.scalar_one_or_none():
            continue
        combined = f"{raw.get('title') or ''} {raw.get('text') or ''}".strip()
        sh = simhash(combined)
        issue = await _find_or_create_issue(db, topic, sh, raw.get("title"))
        pub = raw.get("published_at")
        if pub is not None and pub.tzinfo is not None:
            pub = pub.astimezone(timezone.utc).replace(tzinfo=None)
        seen_at = pub or datetime.utcnow()
        metrics = raw.get("metrics") or None
        db.add(SourceItem(
            topic_id=topic.id, issue_id=issue.id, source=raw["source"],
            platform=raw.get("platform"), url=url, title=raw.get("title"),
            text=raw.get("text", "") or "", author=raw.get("author"),
            published_at=pub, simhash=sh, metrics=metrics,
        ))
        issue.item_count += 1
        if seen_at > issue.last_seen_at:
            issue.last_seen_at = seen_at
        # Aggregate metrics + platforms to the issue level for list-view triage.
        issue.reach_total = (issue.reach_total or 0) + int((metrics or {}).get("reach") or 0)
        issue.engagement_total = (issue.engagement_total or 0) + int((metrics or {}).get("engagement") or 0)
        if raw.get("platform"):
            issue.platforms = sorted(set(issue.platforms or []) | {raw["platform"]})
        issue.score = issue_score(issue.item_count, issue.last_seen_at)
        created += 1
    await db.flush()
    return created


async def crawl_topic(db: AsyncSession, topic: WatchTopic, settings) -> int:
    """Fetch from configured sources and ingest. Network-bound; failures are swallowed per source."""
    from .ingest.rss import fetch_rss_items
    from .ingest.browserless import scrape_content, is_allowed
    total = 0
    sources = topic.sources or ["rss"]
    if "rss" in sources:
        try:
            total += await ingest_items(db, topic, await fetch_rss_items(topic.query))
        except Exception:
            pass
    if "browserless" in sources and settings.BROWSERLESS_API_KEY and topic.browserless_targets:
        scraped = []
        for url in topic.browserless_targets:
            if not is_allowed(url, settings.BROWSERLESS_ALLOWLIST):
                continue
            try:
                scraped.append(await scrape_content(url, settings.BROWSERLESS_API_KEY, settings.BROWSERLESS_BASE))
            except Exception:
                continue
        if scraped:
            total += await ingest_items(db, topic, scraped)
    topic.last_crawled_at = datetime.utcnow()
    return total


async def enrich_issue(db: AsyncSession, issue: Issue) -> Issue:
    """Add AI sentiment + summary if an AI provider is configured; otherwise no-op."""
    ai = get_ai_service()
    if ai is None:
        return issue
    items = (await db.execute(
        select(SourceItem).where(SourceItem.issue_id == issue.id).limit(10)
    )).scalars().all()
    blob = "\n".join(f"- {i.title or i.text}" for i in items)[:4000]
    if not blob:
        return issue
    issue.sentiment = await ai.analyze_sentiment(blob)
    issue.summary = await ai.generate_text(
        "Ringkas isu berikut dalam satu kalimat bahasa Indonesia:\n" + blob, max_tokens=120
    )
    return issue

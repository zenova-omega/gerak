"""Pulse core: ingest items, cluster into issues, crawl, enrich."""
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from ..models.pulse import WatchTopic, Issue, SourceItem, PulseCrawlRun
from .ingest.common import observed_engagement, credential, count
from .pulse_public import metrics_for_reader
from .pulse_measures import RULES, interactions, interactions_total, local_day, post_measures, reported, shares_total, zone
import httpx
from .dedup import simhash, is_near_duplicate
from .ai import get_ai_service
from ..models.pulse_monitor import MetricSnapshot

NEAR_DUP_THRESHOLD = 3


def snapshot_metrics(raw):
    values = raw or {}
    # Current observations only. Omitted fields are unknown, never carried forward.
    return {key: reported(values.get(key)) for key in ('likes', 'comments', 'shares', 'views')}


def _engagement(metrics):
    """interactions_v1 for the stored issue score, which needs a number: the known value, else 0 for the score only.
    The issue card's `engagement_total` is computed from the posts and stays unknown when nothing is known."""
    return interactions(metrics) or 0


async def _find_or_create_issue(db: AsyncSession, topic: WatchTopic, sh: str, title: str | None) -> Issue:
    result = await db.execute(select(Issue).where(Issue.topic_id == topic.id))
    for issue in result.scalars().all():
        if is_near_duplicate(issue.simhash, sh, NEAR_DUP_THRESHOLD):
            return issue
    issue = Issue(topic_id=topic.id, title=title or "", simhash=sh)
    db.add(issue)
    await db.flush()
    return issue


async def ingest_items(db: AsyncSession, topic: WatchTopic, items: list[dict], *, created_ids: set | None = None) -> int:
    """Insert new SourceItems, clustering each into an Issue. Returns count inserted."""
    # Serialize ALL ingestion entry points for this topic, not only provider lanes.
    # The no-op UPDATE acquires a transaction-scoped row lock (SQLite writer lock).
    await db.execute(update(WatchTopic).where(WatchTopic.id == topic.id).values(id=WatchTopic.id))
    created = 0
    for raw in items:
        url = raw.get("url")
        if not url:
            continue
        existing = await db.execute(
            select(SourceItem).where(SourceItem.topic_id == topic.id, SourceItem.url == url)
        )
        existing = existing.scalar_one_or_none()
        if existing:
            db.add(MetricSnapshot(item_id=existing.id, topic_id=topic.id, metrics=snapshot_metrics(raw.get('metrics'))))
            previous = existing.metrics or {}
            # Keep earlier observations if a later response omits a metric.
            refreshed = {**previous, **{k: v for k, v in (raw.get("metrics") or {}).items() if v is not None}}
            if any(k in refreshed for k in ("likes", "comments", "shares")):
                refreshed["engagement"] = observed_engagement(refreshed)
            issue = await db.get(Issue, existing.issue_id) if existing.issue_id else None
            if issue:
                issue.engagement_total = max(0, (issue.engagement_total or 0) + _engagement(refreshed) - _engagement(previous))
                issue.reach_total = max(0, (issue.reach_total or 0) + count(refreshed.get("reach")) - count(previous.get("reach")))
                issue.score = float(issue.engagement_total)
            existing.metrics = refreshed or None
            existing.crawled_at = datetime.utcnow()
            if raw.get("author"):
                existing.author = raw["author"]
            continue
        combined = f"{raw.get('title') or ''} {raw.get('text') or ''}".strip()
        sh = simhash(combined)
        issue = await _find_or_create_issue(db, topic, sh, raw.get("title"))
        pub = raw.get("published_at")
        if pub is not None and pub.tzinfo is not None:
            pub = pub.astimezone(timezone.utc).replace(tzinfo=None)
        seen_at = pub or datetime.utcnow()
        metrics = raw.get("metrics") or None
        item = SourceItem(
            topic_id=topic.id, issue_id=issue.id, source=raw["source"],
            platform=raw.get("platform"), url=url, title=raw.get("title"),
            text=raw.get("text", "") or "", author=raw.get("author"),
            published_at=pub, simhash=sh, metrics=metrics,
        )
        db.add(item)
        await db.flush()
        if created_ids is not None:
            created_ids.add(item.id)
        db.add(MetricSnapshot(item_id=item.id, topic_id=topic.id, metrics=snapshot_metrics(raw.get('metrics'))))
        issue.item_count += 1
        if seen_at > issue.last_seen_at:
            issue.last_seen_at = seen_at
        # Aggregate metrics + platforms to the issue level for list-view triage.
        issue.reach_total = (issue.reach_total or 0) + count((metrics or {}).get("reach"))
        issue.engagement_total = (issue.engagement_total or 0) + _engagement(metrics)
        if raw.get("platform"):
            issue.platforms = sorted(set(issue.platforms or []) | {raw["platform"]})
        issue.score = float(issue.engagement_total)
        created += 1
    await db.flush()
    return created


async def crawl_topic(db: AsyncSession, topic: WatchTopic, settings) -> int:
    """Backward-compatible scheduler entry point. Metered providers are manual only."""
    return (await crawl_topic_run(db, topic, settings))["ingested"]


def _provider_error(exc: Exception, provider: str) -> dict:
    from .ingest.xpoz import XpozToolError
    # Never serialize exceptions or remote bodies: URLs/bodies may contain secrets.
    status, code, message = "error", "provider_error", "Provider request failed; no retry was attempted."
    http_status = None
    if isinstance(exc, XpozToolError):
        code = exc.code
        if code == "plan_restricted":
            status, message = "plan_restricted", "The source denied this query for the current plan or credit allowance. No upgrade or fallback was attempted."
        elif code == "pending":
            status, message = "pending", "The source started a background operation. Automatic polling is disabled; no second query was issued."
    elif isinstance(exc, httpx.HTTPStatusError):
        http_status = exc.response.status_code
        if http_status == 401:
            code, message = "authentication_failed", "Provider credentials were rejected."
        elif http_status in (402, 403):
            status, code = "plan_restricted", "access_or_quota_restricted"
            message = ("Access or credits at the source are restricted. No upgrade or fallback was attempted."
                       if provider == "xpoz" else "Provider access or quota is restricted. No retry was attempted.")
        elif http_status == 429:
            code, message = "rate_limited", "Provider rate or quota limit reached. No retry was attempted."
        else:
            code = "http_error"
    elif isinstance(exc, (httpx.TimeoutException, TimeoutError)):
        code, message = "timeout", "Provider timed out. No retry was attempted."
    elif isinstance(exc, ValueError):
        code, message = "invalid_response", "Provider returned an invalid response."
    return {"status": status, "ingested": 0, "error": code, "message": message, "http_status": http_status}


async def crawl_topic_run(db: AsyncSession, topic: WatchTopic, settings, *, manual: bool = False) -> dict:
    """One bounded attempt per provider. A savepoint isolates each ingestion failure."""
    from .ingest.rss import fetch_rss_items
    from .ingest.browserless import scrape_content, is_allowed
    from .ingest.xpoz import fetch_xpoz_items, fetch_xpoz_stored_items, fetch_xpoz_social_items, fetch_xpoz_tiktok_items, tiktok_recent_window, PAGE_ROWS
    from .ingest.youtube import fetch_youtube_items
    social = {"instagram", "tiktok", "reddit"}  # collected through the same provider account as X
    run = PulseCrawlRun(topic_id=topic.id, manual=manual)
    db.add(run)
    await db.flush()
    providers = {}
    total = 0
    for source in dict.fromkeys(topic.sources or ["rss"]):
        if source not in {"rss", "browserless", "xpoz", "youtube"} | social:
            providers["unsupported"] = {"status": "unsupported", "ingested": 0}
            continue
        if source != "rss" and not manual:
            providers[source] = {"status": "manual_only", "ingested": 0}
            continue
        key = credential(settings, f"{'XPOZ' if source in social else source.upper()}_API_KEY") if source != "rss" else ""
        if source != "rss" and not key:
            providers[source] = {"status": "not_configured", "ingested": 0}
            continue
        try:
            if source == "rss":
                items = await fetch_rss_items(topic.query)
            elif source == "xpoz":
                fetch = fetch_xpoz_items if getattr(settings, "XPOZ_MODE", "mcp_stored") == "rest_live" else fetch_xpoz_stored_items
                items = await fetch(topic.query, key)
            elif source == "youtube":
                items = await fetch_youtube_items(topic.query, key)
            elif source == "tiktok":
                items = await fetch_xpoz_tiktok_items(topic.query, key, **tiktok_recent_window())
            elif source in social:
                items = await fetch_xpoz_social_items(topic.query, key, source, limit=PAGE_ROWS)
            else:
                items = []
                for url in (topic.browserless_targets or [])[:10]:
                    if is_allowed(url, settings.BROWSERLESS_ALLOWLIST):
                        items.append(await scrape_content(url, key, settings.BROWSERLESS_BASE))
            async with db.begin_nested():
                count = await ingest_items(db, topic, items)
            total += count
            providers[source] = {"status": "success", "ingested": count, "fetched": len(items)}
        except Exception as exc:
            providers[source] = _provider_error(exc, source)
    run.providers, run.ingested = providers, total
    run.finished_at = datetime.utcnow()
    topic.last_crawled_at = run.finished_at
    await db.flush()
    return {"topic_id": topic.id, "ingested": total, "run_id": run.id, "providers": providers}


async def pulse_analytics(db: AsyncSession, topic_id: str | None = None, *, issue_id=None, start=None, end=None) -> dict:
    from collections import Counter
    query = select(SourceItem)
    if topic_id:
        query = query.where(SourceItem.topic_id == topic_id)
    if issue_id:
        query = query.where(SourceItem.issue_id == issue_id)
    if start:
        query = query.where(SourceItem.published_at >= start)
    if end:
        query = query.where(SourceItem.published_at <= end)
    items = (await db.execute(query.order_by(SourceItem.crawled_at.desc(), SourceItem.id))).scalars().all()
    comment_snapshots = {}
    for item in items:
        snapshot = (item.metrics or {}).get('comment_snapshot')
        key = (item.platform or 'unknown', item.url)
        if isinstance(snapshot, dict):
            previous = comment_snapshots.get(key)
            priority = lambda s: (s.get('status') == 'success', s.get('fetched_at') or '')
            if previous is None or priority(snapshot) > priority(previous):
                comment_snapshots[key] = snapshot
    if not topic_id:
        # Shared posts can match multiple topics. Use the latest observed snapshot once.
        unique = {}
        for item in items:
            unique.setdefault((item.platform or "unknown", item.url), item)
        items = list(unique.values())
    from sqlalchemy import func
    first_seen_query = select(MetricSnapshot.item_id, func.min(MetricSnapshot.observed_at)).join(
        SourceItem, (SourceItem.id == MetricSnapshot.item_id) & (SourceItem.topic_id == MetricSnapshot.topic_id))
    if topic_id:
        first_seen_query = first_seen_query.where(SourceItem.topic_id == topic_id)
    first_seen = dict((await db.execute(first_seen_query.group_by(MetricSnapshot.item_id))).all())
    platforms, timeline, influencers = Counter(), Counter(), {}
    for item in items:
        platform = item.platform or "unknown"
        platforms[platform] += 1
        if item.published_at:
            timeline[local_day(item.published_at)] += 1
        if item.author:
            key = ((item.metrics or {}).get("author_id") or item.author, platform)
            author = influencers.setdefault(key, {"author": item.author, "platform": platform,
                                                  "mentions": 0, "engagement": None, "interaction_posts": 0, "url": item.url})
            author["mentions"] += 1
            author.setdefault("_metrics", []).append(item.metrics)
    for author in influencers.values():
        total = interactions_total(author.pop("_metrics"))
        author["engagement"], author["interaction_posts"] = total["value"], total["posts"]
    # No provider currently supplies verified point coordinates with provenance.
    # In particular, profile locations and place centroids are NOT observed locations.
    posts = [{"id": item.id, "issue_id": item.issue_id, "platform": item.platform or "unknown", "url": item.url,
              "title": item.title, "text": item.text, "author": item.author,
              "published_at": item.published_at, "crawled_at": item.crawled_at,
              "first_observed_at": first_seen.get(item.id),
              "metrics": {**metrics_for_reader(item.metrics), "engagement": observed_engagement(item.metrics)}} for item in items]
    for post in posts:
        post['measures'] = post_measures(post['published_at'], post['platform'], post['author'], post['metrics'], post['id'])
        snapshot = comment_snapshots.get((post['platform'], post['url']))
        if snapshot is not None:
            post['metrics']['comment_snapshot'] = snapshot
    from .pulse_profiles import attach_profiles
    await attach_profiles(db, posts)   # account pictures and follower counts looked up separately
    totals = {}
    for metric in ("likes", "comments", "views"):
        values = [n for n in (reported(p["metrics"].get(metric)) for p in posts) if n is not None]
        totals[metric] = {"value": sum(values) if values else None, "coverage": len(values)}
    # shares_total_v1: a repost carries none of its own, so nothing is counted twice.
    totals["shares"] = {"value": shares_total(posts), "coverage": sum(reported(p["metrics"].get("shares")) is not None for p in posts)}
    # interactions_v1 over the posts whose interactions are known, with how many posts that is.
    known = interactions_total(posts)
    totals["engagement"] = {"value": known["value"], "coverage": known["posts"]}
    from .pulse_network import analyze_network
    return {"total_mentions": len(items), "posts": posts, "metric_totals": totals, "network": analyze_network(posts),
            "platforms": [{"platform": p, "count": n} for p, n in sorted(platforms.items())],
            "timeline": [{"date": d, "count": n} for d, n in sorted(timeline.items())],
            "influencers": sorted(influencers.values(), key=lambda a: (a["engagement"] is None, -(a["engagement"] or 0), -a["mentions"], a["author"], a["platform"])),
            "locations": [], "unknown_location_count": len(items),
            "measures": {"zone": dict(zip(("offset_minutes", "name"), zone())), "rules": RULES}}


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

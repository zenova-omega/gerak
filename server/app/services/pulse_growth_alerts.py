"""Observed interaction thresholds for automatic ingestion; no provider access.

These are explicit activity thresholds, not calibrated virality predictions.
Only posts touched by the worker batch are considered. Existing scheduling,
provider budgets, and collection behavior are deliberately unchanged.
"""
from collections import defaultdict
import uuid

from sqlalchemy import func, select

from ..models.pulse import Issue, SourceItem
from ..models.pulse_monitor import MetricSnapshot, PulseAlert
from .pulse_growth import _post_growth

MIN_DELTA_ENGAGEMENT = 100
MIN_RATE_PER_HOUR = 50


async def create_growth_alerts(db, topic_id, item_urls, now):
    """Called only after successful automatic ingestion, in its transaction.

    Publication-time windows preserve the existing click-analysis contract;
    observation-time evidence lives in detail, never in the publication window.
    """
    from .pulse_monitor import insert_once

    urls = list(dict.fromkeys(url for url in item_urls if url))[:100]
    if not urls:
        return
    items = (await db.scalars(select(SourceItem).join(Issue, SourceItem.issue_id == Issue.id).where(
        SourceItem.topic_id == topic_id, Issue.topic_id == topic_id,
        SourceItem.url.in_(urls), SourceItem.published_at.is_not(None),
    ))).all()
    if not items:
        return
    # Fetch only the last two distinct observation instants per touched item.
    # Include ALL timestamp ties so conflicts cannot masquerade as reliable data.
    ranked = select(
        MetricSnapshot.id,
        func.dense_rank().over(partition_by=MetricSnapshot.item_id,
                               order_by=MetricSnapshot.observed_at.desc()).label('position'),
    ).where(MetricSnapshot.topic_id == topic_id,
            MetricSnapshot.item_id.in_([item.id for item in items])).subquery()
    snapshots = (await db.scalars(select(MetricSnapshot).join(
        ranked, MetricSnapshot.id == ranked.c.id
    ).where(ranked.c.position <= 2).order_by(MetricSnapshot.observed_at, MetricSnapshot.id))).all()
    history = defaultdict(list)
    for snapshot in snapshots:
        history[snapshot.item_id].append(snapshot)
    for item in items:
        growth = _post_growth(item, history[item.id])
        if (not growth['availability']['growth'] or growth['reset_detected']
                or growth['delta_engagement'] < MIN_DELTA_ENGAGEMENT
                or growth['rate_per_hour'] < MIN_RATE_PER_HOUR):
            continue
        await insert_once(db, PulseAlert, {
            'id': str(uuid.uuid4()),
            'dedup_key': f"engagement_growth:{item.id}:{growth['latest_observed_at']}",
            'topic_id': topic_id, 'issue_id': item.issue_id, 'kind': 'engagement_growth',
            'title': (item.title or item.url)[:500], 'created_at': now,
            'window_start': item.published_at, 'window_end': item.published_at,
            'evidence_ids': [item.id],
            'detail': {
                'rule': 'observed_engagement_growth_v1', 'item_id': item.id,
                'snapshot_ids': [row.id for row in history[item.id]],
                'previous_observed_at': growth['previous_observed_at'],
                'latest_observed_at': growth['latest_observed_at'],
                'delta_engagement': growth['delta_engagement'],
                'elapsed_hours': growth['elapsed_hours'], 'rate_per_hour': growth['rate_per_hour'],
                'engagement_metrics': growth['engagement_metrics'], 'reset_detected': False,
                'minimum_delta_engagement': MIN_DELTA_ENGAGEMENT,
                'minimum_rate_per_hour': MIN_RATE_PER_HOUR,
                'window_basis': 'published_at',
                'note': 'Observed interaction growth threshold; not a calibrated virality claim.',
            },
        })

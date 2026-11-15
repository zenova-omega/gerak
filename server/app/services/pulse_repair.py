"""Corrections to rows stored before a rule existed. Each is safe to run at every start: once applied, it finds nothing."""
from sqlalchemy import select, update

from ..models.pulse import Issue, SourceItem
from ..models.pulse_monitor import MetricSnapshot
from .ingest.common import count, mark_repost

CHUNK = 500


def repair_reposts(connection) -> int:
    """Apply `mark_repost` to X posts collected before reposts were recognised. Run inside `conn.run_sync`.

    The original figure is kept as `original_shares`, the post's cluster total drops by what the post no longer claims,
    and the post's earlier observations lose the carried shares too, so growth is not measured against them.
    Returns the number of posts corrected."""
    items, snapshots, issues = SourceItem.__table__, MetricSnapshot.__table__, Issue.__table__
    fixed, removed = [], {}
    for row in connection.execute(select(items.c.id, items.c.issue_id, items.c.metrics).where(items.c.platform == 'x')).all():
        marked = mark_repost(dict(row.metrics or {}))
        if not marked['repost']:
            continue
        connection.execute(update(items).where(items.c.id == row.id).values(metrics=marked))
        fixed.append(row.id)
        if row.issue_id:
            removed[row.issue_id] = removed.get(row.issue_id, 0) + count((row.metrics or {}).get('engagement')) - count(marked['engagement'])
    for issue_id, amount in removed.items():
        total = connection.execute(select(issues.c.engagement_total).where(issues.c.id == issue_id)).scalar()
        if total is not None and amount:
            left = max(0, (total or 0) - amount)
            connection.execute(update(issues).where(issues.c.id == issue_id).values(engagement_total=left, score=float(left)))
    for start in range(0, len(fixed), CHUNK):
        chunk = fixed[start:start + CHUNK]
        for row in connection.execute(select(snapshots.c.id, snapshots.c.metrics).where(snapshots.c.item_id.in_(chunk))).all():
            if mark_repost(dict(row.metrics or {}))['repost']:
                connection.execute(update(snapshots).where(snapshots.c.id == row.id).values(metrics={**row.metrics, 'shares': 0, 'original_shares': count(row.metrics.get('shares'))}))
    return len(fixed)

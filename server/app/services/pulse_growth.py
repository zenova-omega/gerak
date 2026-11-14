"""Read-only observed growth. Never fetch providers or infer pre-observation growth.

Engagement is the sum of the SAME observed subset of likes/comments/shares
at both endpoints. Missing components remain null, not zero. Acceleration uses
adjacent interval velocities divided by the distance between interval midpoints.
"""
from collections import defaultdict
from datetime import timezone

from sqlalchemy import and_, select

from ..models.pulse import SourceItem
from ..models.pulse_monitor import MetricSnapshot

METRICS = ('likes', 'comments', 'shares', 'views')
ENGAGEMENT = METRICS[:3]


def _stamp(value):
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')


def _values(raw):
    raw = raw if isinstance(raw, dict) else {}
    return {key: int(raw[key]) if not isinstance(raw.get(key), bool)
            and str(raw.get(key, '')).isascii() and str(raw.get(key, '')).isdigit()
            else None for key in METRICS}


def _interval(before, after):
    hours = (after['at'] - before['at']).total_seconds() / 3600
    metrics = {}
    for key in METRICS:
        a, b = before['values'][key], after['values'][key]
        delta = b - a if a is not None and b is not None else None
        metrics[key] = {'previous': a, 'latest': b, 'delta': delta,
                        'rate_per_hour': delta / hours if delta is not None and delta >= 0 and hours > 0 else None,
                        'reset_detected': delta is not None and delta < 0}
    fields = [key for key in ENGAGEMENT if after['values'][key] is not None]
    previous_fields = [key for key in ENGAGEMENT if before['values'][key] is not None]
    reset = any(m['reset_detected'] for m in metrics.values())
    reason = None
    if before['ambiguous'] or after['ambiguous'] or hours <= 0:
        reason = 'ambiguous_timestamp'
    elif not fields or not previous_fields:
        reason = 'missing_metrics'
    elif fields != previous_fields:
        reason = 'metric_coverage_changed'
    elif reset:
        reason = 'counter_reset'
    delta = sum(metrics[key]['delta'] for key in fields) if fields and fields == previous_fields else None
    if before['ambiguous'] or after['ambiguous']:
        delta = None
        for metric in metrics.values():
            metric['delta'] = metric['rate_per_hour'] = None
    return {'elapsed_hours': hours, 'delta_engagement': delta,
            'rate_per_hour': delta / hours if reason is None else None,
            'engagement_metrics': fields if fields == previous_fields else [],
            'reset_detected': reset, 'metrics': metrics, 'reason': reason}


def _post_growth(item, snapshots):
    grouped = defaultdict(list)
    for snapshot in snapshots:
        grouped[snapshot.observed_at].append(_values(snapshot.metrics))
    points = []
    for at, values in sorted(grouped.items()):
        ambiguous = any(v != values[0] for v in values[1:])
        # Conflicting simultaneous observations have no meaningful ordering.
        merged = {key: values[0][key] if all(v[key] == values[0][key] for v in values) else None
                  for key in METRICS}
        points.append({'at': at, 'values': merged, 'ambiguous': ambiguous})
    latest = points[-1] if points else None
    reason = ('no_snapshots' if not points else 'ambiguous_timestamp'
              if latest['ambiguous'] else 'insufficient_snapshots')
    result = {
        'id': item.id, 'topic_id': item.topic_id, 'platform': item.platform or 'unknown',
        'url': item.url, 'title': item.title, 'author': item.author,
        'published_at': _stamp(item.published_at), 'snapshot_count': len(snapshots),
        'distinct_observation_count': len(points),
        'previous_observed_at': _stamp(points[-2]['at']) if len(points) >= 2 else None,
        'latest_observed_at': _stamp(latest['at']) if latest else None,
        'delta_engagement': None, 'elapsed_hours': None, 'rate_per_hour': None,
        'acceleration_per_hour_squared': None, 'engagement_metrics': [],
        'reset_detected': False, 'first_observed_growth_at': None,
        'metrics': {key: {'previous': None, 'latest': latest['values'][key] if latest else None,
                          'delta': None, 'rate_per_hour': None, 'reset_detected': False} for key in METRICS},
    }
    intervals = [_interval(a, b) for a, b in zip(points, points[1:])]
    if intervals:
        current = intervals[-1]
        reason = current['reason']
        result.update({key: value for key, value in current.items() if key != 'reason'})
        if len(intervals) >= 2:
            previous = intervals[-2]
            if (current['reason'] is None and previous['reason'] is None
                    and current['engagement_metrics'] == previous['engagement_metrics']):
                result['acceleration_per_hour_squared'] = (
                    (current['rate_per_hour'] - previous['rate_per_hour'])
                    / ((current['elapsed_hours'] + previous['elapsed_hours']) / 2)
                )
        for point, interval in zip(points[1:], intervals):
            if interval['reason'] is None and interval['delta_engagement'] > 0:
                result['first_observed_growth_at'] = _stamp(point['at'])
                break
    result['availability'] = {
        'growth': reason is None, 'acceleration': result['acceleration_per_hour_squared'] is not None,
        'first_observed_growth': result['first_observed_growth_at'] is not None, 'reason': reason,
    }
    return result


async def pulse_growth(db, topic_id=None, *, start=None, end=None):
    """Filter publication time, then use all stored observations of selected posts.

    Across topics, dedup by (platform, URL), taking the most recently crawled
    SourceItem (ID tie-break) just like pulse_analytics. Never splice histories
    from different topic copies, which could manufacture a velocity.
    """
    query = select(SourceItem)
    if topic_id:
        query = query.where(SourceItem.topic_id == topic_id)
    if start is not None:
        query = query.where(SourceItem.published_at >= start)
    if end is not None:
        query = query.where(SourceItem.published_at <= end)
    items = (await db.scalars(query.order_by(SourceItem.crawled_at.desc(), SourceItem.id))).all()
    unique = {}
    for item in items:
        unique.setdefault((item.platform or 'unknown', item.url), item)
    history = defaultdict(list)
    # Join the scoped selection instead of a potentially unbounded SQL IN list.
    selected = query.with_only_columns(SourceItem.id, SourceItem.topic_id).subquery()
    rows = (await db.scalars(select(MetricSnapshot).join(selected, and_(
        MetricSnapshot.item_id == selected.c.id, MetricSnapshot.topic_id == selected.c.topic_id
    )).order_by(MetricSnapshot.observed_at, MetricSnapshot.id))).all()
    selected_ids = {item.id for item in unique.values()}
    for snapshot in rows:
        if snapshot.item_id in selected_ids:
            history[snapshot.item_id].append(snapshot)
    posts = [_post_growth(item, history[item.id]) for item in unique.values()]
    return {'topic_id': topic_id, 'posts': posts, 'availability': {
        'source': 'stored_metric_snapshots', 'total_posts': len(posts),
        'posts_with_snapshots': sum(p['snapshot_count'] > 0 for p in posts),
        'posts_with_growth': sum(p['availability']['growth'] for p in posts),
        'posts_with_acceleration': sum(p['availability']['acceleration'] for p in posts),
        'posts_with_first_observed_growth': sum(p['availability']['first_observed_growth'] for p in posts),
        'deduplicated_posts': len(items) - len(posts),
        'growth_start_basis': 'first_positive_reliable_interval_end_not_actual_onset',
    }}

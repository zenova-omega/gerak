"""Beranda's project rows: which projects are collecting, and how busy each was in the last day."""
from datetime import timedelta

from sqlalchemy import case, func, select

from ..models.pulse import SourceItem, WatchTopic
from ..models.pulse_monitor import MonitorSchedule, PulseAlert


DAYS = 7
TONES = ('positive', 'neutral', 'negative')


def _tones(counted):
    """Tone counts of a project's last seven days. A post without a reading is unknown, never neutral."""
    known = {name: int(getattr(counted, name) or 0) if counted else 0 for name in TONES}
    return {**known, 'unknown': max(0, (int(counted.week or 0) if counted else 0) - sum(known.values()))}


async def project_rows(db, now):
    """One row per project, collecting projects first, then the busiest of the last 24 hours. Posts are counted on the
    time they were published; a post without one counts in the total only. Three grouped queries, whatever the
    number of projects. `series_7d` is seven steps of 24 hours ending now, oldest first, so its last two entries are
    `posts_prev_24h` and `posts_24h`; `sentiment_7d` is the tone of the posts in those seven days."""
    day, two = now - timedelta(hours=24), now - timedelta(hours=48)
    edges = [now - timedelta(hours=24 * step) for step in range(DAYS, -1, -1)]         # oldest edge first
    tone = SourceItem.metrics['sentiment']['label'].as_string()
    week = SourceItem.published_at > edges[0]
    topics = (await db.execute(select(WatchTopic.id, WatchTopic.label))).all()
    posts = {row.topic_id: row for row in (await db.execute(select(
        SourceItem.topic_id, func.count().label('total'),
        func.sum(case((SourceItem.published_at > day, 1), else_=0)).label('last'),
        func.sum(case(((SourceItem.published_at > two) & (SourceItem.published_at <= day), 1), else_=0)).label('before'),
        func.max(SourceItem.published_at).label('newest'),
        *[func.sum(case(((SourceItem.published_at > edges[step]) & (SourceItem.published_at <= edges[step + 1]), 1), else_=0)).label(f'd{step}') for step in range(DAYS)],
        *[func.sum(case((week & (tone == name), 1), else_=0)).label(name) for name in TONES],
        func.sum(case((week, 1), else_=0)).label('week')).group_by(SourceItem.topic_id))).all()}
    schedules = {row.topic_id: row for row in (await db.execute(select(
        MonitorSchedule.topic_id, func.sum(case((MonitorSchedule.enabled.is_(True), 1), else_=0)).label('on'),
        func.max(MonitorSchedule.last_success_at).label('collected')).group_by(MonitorSchedule.topic_id))).all()}
    unread = dict((await db.execute(select(PulseAlert.topic_id, func.count()).where(PulseAlert.acknowledged_at.is_(None)).group_by(PulseAlert.topic_id))).all())
    rows = []
    for topic in topics:
        counted, schedule = posts.get(topic.id), schedules.get(topic.id)
        rows.append({'id': topic.id, 'label': topic.label, 'collecting': bool(schedule and schedule.on),
                     'posts_total': counted.total if counted else 0, 'posts_24h': int(counted.last or 0) if counted else 0,
                     'posts_prev_24h': int(counted.before or 0) if counted else 0, 'alerts_unread': unread.get(topic.id, 0),
                     'last_collected_at': schedule.collected if schedule else None, 'newest_post_at': counted.newest if counted else None,
                     'series_7d': [int(getattr(counted, f'd{step}') or 0) if counted else 0 for step in range(DAYS)],
                     'sentiment_7d': _tones(counted)})
    return sorted(rows, key=lambda row: (not row['collecting'], -row['posts_24h'], row['label'].lower()))

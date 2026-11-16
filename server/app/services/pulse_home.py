"""Beranda's project rows: which projects are collecting, and how busy each was in the last day."""
from collections import Counter, defaultdict
from datetime import timedelta

from sqlalchemy import case, func, select

from ..models.pulse import SourceItem, WatchTopic
from ..models.pulse_monitor import MonitorSchedule, PulseAlert
from . import pulse_measures


DAYS = 7
TONES = ('positive', 'neutral', 'negative')


def _tones(counted):
    """Tone counts of a project's last seven days, each post read by tone_share_v2 (`pulse_measures.tone`, either stored
    form, any letter case). A post without a reading is unknown, never neutral."""
    counted = counted or {}
    return {name: counted.get(name, 0) for name in (*TONES, 'unknown')}


async def project_rows(db, now):
    """One row per project, collecting projects first, then the busiest of the last 24 hours. Posts are counted on the
    time they were published; a post without one counts in the total only. Four grouped queries, whatever the
    number of projects. `series_7d` is seven steps of 24 hours ending now, oldest first, so its last two entries are
    `posts_prev_24h` and `posts_24h`; `sentiment_7d` is the tone of the posts in those seven days."""
    day, two = now - timedelta(hours=24), now - timedelta(hours=48)
    edges = [now - timedelta(hours=24 * step) for step in range(DAYS, -1, -1)]         # oldest edge first
    # The stored label in either form: the object's label, else the value itself (a plain string). The module reads it.
    stored = func.coalesce(SourceItem.metrics['sentiment']['label'].as_string(), SourceItem.metrics['sentiment'].as_string())
    week = SourceItem.published_at > edges[0]
    topics = (await db.execute(select(WatchTopic.id, WatchTopic.label))).all()
    posts = {row.topic_id: row for row in (await db.execute(select(
        SourceItem.topic_id, func.count().label('total'),
        func.sum(case((SourceItem.published_at > day, 1), else_=0)).label('last'),
        func.sum(case(((SourceItem.published_at > two) & (SourceItem.published_at <= day), 1), else_=0)).label('before'),
        func.max(SourceItem.published_at).label('newest'),
        *[func.sum(case(((SourceItem.published_at > edges[step]) & (SourceItem.published_at <= edges[step + 1]), 1), else_=0)).label(f'd{step}') for step in range(DAYS)]).group_by(SourceItem.topic_id))).all()}
    tones = defaultdict(Counter)
    for topic_id, label, count in (await db.execute(select(SourceItem.topic_id, stored, func.count()).where(week).group_by(SourceItem.topic_id, stored))).all():
        tones[topic_id][pulse_measures.tone({'sentiment': label})] += count
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
                     'sentiment_7d': _tones(tones.get(topic.id))})
    return sorted(rows, key=lambda row: (not row['collecting'], -row['posts_24h'], row['label'].lower()))

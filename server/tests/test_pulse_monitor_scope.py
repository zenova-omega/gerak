"""Project scope regressions. GET only: no dispatch or provider calls."""
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select

from app.models.pulse import WatchTopic
from app.models.pulse_monitor import CrawlJob, MonitorSchedule, PulseAlert, WorkerPolicy, WorkerUsage
from app.services.pulse_monitor import ensure_policies


@pytest.fixture
async def scoped_monitor(db):
    now = datetime.utcnow()
    for topic_id in ('project-a', 'project-b', 'project-empty'):
        db.add(WatchTopic(id=topic_id, label=topic_id, query=topic_id))
    await db.flush()
    for suffix in ('a', 'b'):
        db.add(MonitorSchedule(id=f'schedule-{suffix}', topic_id=f'project-{suffix}',
                               provider='rss', enabled=False))
    await db.flush()
    # All B jobs/alerts are newer: filtering after LIMIT would hide A entirely.
    for suffix, count, offset in (('a', 55, 0), ('b', 60, 100)):
        for index in range(count):
            created = now + timedelta(seconds=offset + index)
            db.add(CrawlJob(id=f'job-{suffix}-{index}', schedule_id=f'schedule-{suffix}',
                            topic_id=f'project-{suffix}', provider='rss',
                            status='retry' if suffix == 'b' else ('queued' if index < 53 else 'running'),
                            created_at=created))
            db.add(PulseAlert(id=f'alert-{suffix}-{index}', dedup_key=f'alert-{suffix}-{index}',
                              topic_id=f'project-{suffix}', kind='collection_error', title='Test',
                              created_at=created, window_start=now, window_end=created,
                              acknowledged_at=now if suffix == 'a' and index == 0 else None))
    await ensure_policies(db)
    db.add(WorkerUsage(id='rss-scope-today', provider='rss', day=now.date().isoformat(), used=7))
    await db.flush()


async def get_state(client, admin_token, **params):
    response = await client.get('/api/admin/pulse/monitor', params=params,
                                headers={'Authorization': f'Bearer {admin_token}'})
    assert response.status_code == 200
    return response.json()


@pytest.mark.asyncio
async def test_project_jobs_filter_before_limit_and_counts_cover_all_jobs(client, admin_token, scoped_monitor):
    data = await get_state(client, admin_token, topic_id='project-a')
    assert [job['id'] for job in data['jobs']] == [f'job-a-{i}' for i in range(54, 4, -1)]
    assert data['job_counts'] == {'queued': 53, 'running': 2}
    assert [schedule['id'] for schedule in data['schedules']] == ['schedule-a']


@pytest.mark.asyncio
async def test_project_alert_totals_and_unread_are_independent_of_page(client, admin_token, scoped_monitor):
    first = await get_state(client, admin_token, topic_id='project-a')
    second = await get_state(client, admin_token, topic_id='project-a', alert_offset=50)
    assert [alert['id'] for alert in first['alerts']] == [f'alert-a-{i}' for i in range(54, 4, -1)]
    assert [alert['id'] for alert in second['alerts']] == [f'alert-a-{i}' for i in range(4, -1, -1)]
    assert first['alert_total'] == second['alert_total'] == 55
    assert first['unread'] == second['unread'] == 54


@pytest.mark.asyncio
@pytest.mark.parametrize('topic_id', ['project-empty', 'missing-project'])
async def test_empty_scope_never_falls_back_to_other_projects(client, admin_token, scoped_monitor, topic_id):
    data = await get_state(client, admin_token, topic_id=topic_id)
    assert data['jobs'] == data['schedules'] == data['alerts'] == []
    assert data['job_counts'] == {}
    assert data['unread'] == data['alert_total'] == 0
    assert len(data['workers']) == 10  # news, X, YouTube, the comment lane, the four profile lanes and the issue radar's two switches


@pytest.mark.asyncio
async def test_omitted_topic_preserves_legacy_all_topic_state(client, admin_token, scoped_monitor):
    data = await get_state(client, admin_token)
    assert [job['id'] for job in data['jobs']] == [f'job-b-{i}' for i in range(59, 9, -1)]
    assert data['job_counts'] == {'queued': 53, 'running': 2, 'retry': 60}
    assert {schedule['id'] for schedule in data['schedules']} == {'schedule-a', 'schedule-b'}
    assert data['alert_total'] == 115
    assert data['unread'] == 114


@pytest.mark.asyncio
async def test_scoped_reads_keep_global_worker_quota_and_schedules_unchanged(db, client, admin_token, scoped_monitor):
    policies = (await db.execute(select(WorkerPolicy).order_by(WorkerPolicy.provider))).scalars().all()
    before = [(p.provider, p.daily_limit, p.blocked_reason, p.lease_until) for p in policies]
    global_data = await get_state(client, admin_token)
    project = await get_state(client, admin_token, topic_id='project-a')
    assert project['workers'] == global_data['workers']
    assert next(w for w in project['workers'] if w['provider'] == 'rss')['used'] == 7
    for policy in policies:
        await db.refresh(policy)
    assert [(p.provider, p.daily_limit, p.blocked_reason, p.lease_until) for p in policies] == before
    assert (await db.execute(select(WorkerUsage))).scalar_one().used == 7
    schedules = (await db.execute(select(MonitorSchedule))).scalars().all()
    assert len(schedules) == 2
    assert all(not schedule.enabled for schedule in schedules)

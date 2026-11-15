"""Analysis never gives up on a text for good. Three failed attempts mean a rest, not the end: a stopped local model or
a restarted server must not leave posts and comments unanalysed forever."""
import uuid
from datetime import datetime, timedelta

import pytest

from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_response_analysis import ResponseAnalysisJob
from app.models.pulse_sentiment import SentimentJob
from app.services.pulse_analysis_retry import RETRY_AFTER, revive_failed

NOW = datetime(2026, 11, 14, 9, 0)


@pytest.mark.asyncio
async def test_failed_jobs_wait_and_then_return_to_the_queue(db):
    topic = WatchTopic(id=str(uuid.uuid4()), label='retry', query='retry')
    db.add(topic)
    await db.flush()
    def post(n):
        item = SourceItem(topic_id=topic.id, source='xpoz', platform='x', url=f'https://x.com/i/status/77{n}', text='isi')
        db.add(item)
        return item
    items = [post(n) for n in range(5)]
    await db.flush()
    long_ago, just_now = NOW - RETRY_AFTER - timedelta(minutes=1), NOW - timedelta(minutes=30)
    db.add_all([
        SentimentJob(item_id=items[0].id, status='failed', attempts=3, available_at=long_ago, error='inference_failed'),
        SentimentJob(item_id=items[1].id, status='failed', attempts=3, available_at=long_ago, error='attempts_exhausted'),
        SentimentJob(item_id=items[2].id, status='failed', attempts=3, available_at=just_now, error='inference_failed'),   # still resting
        SentimentJob(item_id=items[3].id, status='skipped', attempts=0, available_at=long_ago, error='no_text'),          # nothing to analyse
        SentimentJob(item_id=items[4].id, status='done', attempts=1, available_at=long_ago),
        ResponseAnalysisJob(id='r-old', post_id=items[0].id, subject_id='c1', kind='comment', content_target_hash='h', status='failed', attempts=3, available_at=long_ago, error='inference_failed'),
        ResponseAnalysisJob(id='r-new', post_id=items[0].id, subject_id='c2', kind='comment', content_target_hash='h', status='failed', attempts=3, available_at=just_now, error='inference_failed'),
    ])
    await db.flush()

    assert await revive_failed(db, SentimentJob, SentimentJob.item_id, NOW) == 2
    assert await revive_failed(db, ResponseAnalysisJob, ResponseAnalysisJob.id, NOW) == 1
    state = {}
    for index, item in enumerate(items):
        job = await db.get(SentimentJob, item.id, populate_existing=True)
        state[index] = (job.status, job.attempts, job.error)
    assert state == {0: ('pending', 0, None), 1: ('pending', 0, None), 2: ('failed', 3, 'inference_failed'),
                     3: ('skipped', 0, 'no_text'), 4: ('done', 1, None)}
    assert (await db.get(SentimentJob, items[0].id)).available_at == NOW
    assert (await db.get(ResponseAnalysisJob, 'r-old', populate_existing=True)).status == 'pending'
    assert (await db.get(ResponseAnalysisJob, 'r-new', populate_existing=True)).status == 'failed'
    assert await revive_failed(db, SentimentJob, SentimentJob.item_id, NOW) == 0          # nothing left to revive

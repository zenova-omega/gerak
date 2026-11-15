"""The hosted batch interface for a long queue of posts, and the choice between the local and the hosted model."""
import json
from datetime import datetime, timedelta
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_ai_usage import AIBatch
from app.models.pulse_sentiment import SentimentJob
from app.services import pulse_ai_batch as batch
from app.services.ai import hosted

NOW = datetime(2026, 11, 15, 12)
SETTINGS = SimpleNamespace(XAI_API_KEY='k', XAI_BULK_MODEL='labels-model', PULSE_AI_BATCH_MIN_QUEUE=2)
ANSWER = '{"label":"negative","confidence":0.9,"reason":"Keluhan","kind":"statement","emotion":{"label":"anger","confidence":0.8,"reason":"Marah"}}'


@pytest.fixture
async def store(tmp_path):
    engine = create_async_engine(f'sqlite+aiosqlite:///{tmp_path}/batch.db')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(WatchTopic(id='t', label='Pelayanan', query='pelayanan'))
        await db.flush()
        for index in range(4):
            db.add(SourceItem(id=f'p{index}', topic_id='t', source='x', platform='x', url=f'https://x.com/a/status/{index}', text=f'Pelayanan buruk {index}',
                              published_at=datetime(2026, 11, 9, 3), crawled_at=datetime(2026, 11, 9, 4, index), metrics={'likes': index}))
            db.add(SentimentJob(item_id=f'p{index}', status='pending', attempts=0, available_at=NOW - timedelta(hours=1)))
        await db.commit()
    hosted.reset()
    yield factory
    await engine.dispose()


class Service:
    """A stand-in for the batch interface that keeps what it is sent."""
    def __init__(self, results=None, state=None, **batch_fields):
        self.added, self.cancelled, self.results, self.state, self.fields = [], False, results or [], state or {'num_requests': 4, 'num_pending': 4, 'num_success': 0, 'num_error': 0}, batch_fields

    def __call__(self, request):
        path = request.url.path
        if request.method == 'POST' and path == '/v1/batches':
            return httpx.Response(200, json={'batch_id': 'b1', 'expire_time': '2026-12-15'})
        if path.endswith('/requests'):
            self.added += json.loads(request.content)['batch_requests']
            return httpx.Response(200, json=None)
        if path.endswith(':cancel'):
            self.cancelled = True
            return httpx.Response(200, json={})
        if path.endswith('/results'):
            return httpx.Response(200, json={'results': self.results, 'pagination_token': None})
        return httpx.Response(200, json={'batch_id': 'b1', 'state': self.state, 'cancel_time': None, 'expire_time': '2026-12-15', **self.fields})


def ok(item_id, shape='responses'):
    response = ({'responses': {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': ANSWER}]}], 'usage': {'input_tokens': 400, 'output_tokens': 90, 'cost_in_usd_ticks': 10_000_000}}}
                if shape == 'responses' else {'chat_get_completion': {'choices': [{'message': {'content': ANSWER}}], 'usage': {'input_tokens': 400, 'output_tokens': 90}}})
    return {'batch_request_id': item_id, 'batch_result': {'response': response}}


def test_the_answer_is_found_in_either_shape():
    assert batch.answer_text(ok('x')['batch_result']) == ANSWER
    assert batch.answer_text(ok('x', 'chat')['batch_result']) == ANSWER
    assert batch.answer_text({'error': 'x'}) is None


@pytest.mark.asyncio
async def test_a_long_queue_goes_out_as_one_batch_oldest_first_and_only_one_batch_is_open(store):
    service = Service()
    transport = httpx.MockTransport(service)
    assert await batch.submit(store, SETTINGS, transport, NOW) == 'b1'
    assert sorted(row['batch_request_id'] for row in service.added) == ['p0', 'p1', 'p2', 'p3']
    body = service.added[0]['batch_request']['responses']
    assert body['model'] == 'labels-model' and body['store'] is False and body['instructions'] == batch.PROMPT
    async with store() as db:
        assert {(await db.get(SentimentJob, f'p{i}')).status for i in range(4)} == {'batched'}
        assert (await db.get(AIBatch, 'b1')).state == 'open'
    assert await batch.submit(store, SETTINGS, transport, NOW) is None, 'one open batch at a time'


@pytest.mark.asyncio
async def test_a_short_queue_or_a_switched_off_setting_sends_nothing(store):
    service = Service()
    assert await batch.submit(store, SimpleNamespace(**{**SETTINGS.__dict__, 'PULSE_AI_BATCH_MIN_QUEUE': 4}), httpx.MockTransport(service), NOW) is None
    assert await batch.submit(store, SimpleNamespace(**{**SETTINGS.__dict__, 'PULSE_AI_BATCH_MIN_QUEUE': 0}), httpx.MockTransport(service), NOW) is None
    assert service.added == []


@pytest.mark.asyncio
async def test_finished_answers_become_labels_and_a_failed_one_is_asked_again(store):
    transport = httpx.MockTransport(Service())
    await batch.submit(store, SETTINGS, transport, NOW)
    results = [ok('p0'), ok('p1', 'chat'), {'batch_request_id': 'p2', 'batch_result': {'error': 'boom'}}, {'batch_request_id': 'p3', 'batch_result': {'response': {'responses': {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': 'bukan json'}]}]}}}}]
    done = Service(results, {'num_requests': 4, 'num_pending': 0, 'num_success': 3, 'num_error': 1})
    assert await batch.collect(store, SETTINGS, httpx.MockTransport(done), NOW) == 2
    async with store() as db:
        assert (await db.get(SentimentJob, 'p0')).status == 'done'
        first = await db.get(SourceItem, 'p0')
        assert first.metrics['sentiment']['label'] == 'negative' and first.metrics['sentiment']['batch'] is True and first.metrics['emotion']['label'] == 'anger' and first.metrics['likes'] == 0
        assert (await db.get(SentimentJob, 'p2')).status == 'pending' and (await db.get(SentimentJob, 'p2')).error == 'batch_failed'
        assert 'sentiment' not in ((await db.get(SourceItem, 'p3')).metrics or {})
        assert (await db.get(AIBatch, 'b1')).state == 'done'
    assert hosted.usage()['calls'] == 2, 'the usage of each answer that reported one is counted'


@pytest.mark.asyncio
async def test_a_cancelled_batch_returns_what_it_still_holds_to_the_queue(store):
    await batch.submit(store, SETTINGS, httpx.MockTransport(Service()), NOW)
    cancelled = Service(cancel_time='2026-11-15')
    await batch.collect(store, SETTINGS, httpx.MockTransport(cancelled), NOW)
    async with store() as db:
        assert {(await db.get(SentimentJob, f'p{i}')).status for i in range(4)} == {'pending'}
        assert (await db.get(AIBatch, 'b1')).state == 'closed'


@pytest.mark.asyncio
async def test_a_failed_upload_cancels_the_batch_and_frees_the_posts(store):
    class Broken(Service):
        def __call__(self, request):
            if request.url.path.endswith('/requests'):
                return httpx.Response(500)
            return super().__call__(request)
    service = Broken()
    assert await batch.submit(store, SETTINGS, httpx.MockTransport(service), NOW) is None
    assert service.cancelled
    async with store() as db:
        assert {(await db.get(SentimentJob, f'p{i}')).status for i in range(4)} == {'pending'}


@pytest.mark.asyncio
async def test_the_local_model_takes_a_short_queue_only_when_switched_on_and_present(monkeypatch):
    from app.services import pulse_analysis_cycle as cycle
    from app.services import ai
    waiting = [10]

    async def fake_waiting():
        return waiting[0]
    reachable = [True]

    async def fake_reachable(settings=None):
        return reachable[0]
    monkeypatch.setattr(cycle, 'waiting_work', fake_waiting)
    monkeypatch.setattr(ai, 'local_reachable', fake_reachable)
    cycle._hosted_until_small = False
    assert await cycle.local_for_small_queue(SimpleNamespace(PULSE_AI_LOCAL_MAX_QUEUE=0)) is False, 'off by default'
    on = SimpleNamespace(PULSE_AI_LOCAL_MAX_QUEUE=100)
    assert await cycle.local_for_small_queue(on) is True
    waiting[0] = 500
    assert await cycle.local_for_small_queue(on) is False, 'a long queue goes to the hosted model'
    waiting[0] = 50
    assert await cycle.local_for_small_queue(on) is False, 'and stays there until it is down to a fifth of the limit'
    waiting[0] = 20
    assert await cycle.local_for_small_queue(on) is True
    reachable[0] = False
    assert await cycle.local_for_small_queue(on) is False, 'without the local model analysis goes on hosted'
    cycle._hosted_until_small = False

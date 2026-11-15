"""A hosted model (paid by the token) as the engine behind PULSE's AI, next to the local one.

The hosted lane answers the questions people wait for as soon as it is configured. Background labelling on paid tokens
is a second, separate switch that is off until someone turns it on. With it on, labelling runs several calls at once,
and stops by itself when the service refuses the key or the credit, instead of failing every job in the queue.
"""
import asyncio
import json
from datetime import datetime
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models.pulse import SourceItem, WatchTopic
from app.services import ai
from app.services.ai import hosted
from app.services.ai.providers.grok import GrokAIService


def settings(**values):
    base = dict(AI_PROVIDER='grok', XAI_API_KEY='test-key', XAI_MODEL='answers-model', XAI_BULK_MODEL='labels-model',
                XAI_REASONING_EFFORT='low', PULSE_SENTIMENT_ENABLED=True, PULSE_AI_HOSTED_BACKGROUND=False, PULSE_AI_PARALLEL=4,
                ANTHROPIC_API_KEY='', ANTHROPIC_MODEL='', OLLAMA_MODEL='local-model')
    return SimpleNamespace(**{**base, **values})


def answer(text, **usage):
    return {'output': [{'type': 'reasoning', 'summary': []}, {'type': 'message', 'content': [{'type': 'output_text', 'text': text}]}],
            'usage': {'input_tokens': 500, 'output_tokens': 40, 'input_tokens_details': {'cached_tokens': 100},
                      'output_tokens_details': {'reasoning_tokens': 0}, 'cost_in_usd_ticks': 7_250_000, **usage}}


@pytest.fixture(autouse=True)
def fresh_lane(monkeypatch):
    hosted.reset()
    monkeypatch.setattr('app.services.ai.providers.grok._wait', lambda seconds: asyncio.sleep(0))   # retries do not wait in tests
    yield
    hosted.reset()


# ── The request the service receives ────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_labelling_call_asks_for_json_keeps_nothing_stored_and_spends_no_reasoning():
    seen = []

    def handler(request):
        seen.append(request)
        return httpx.Response(200, json=answer('{"label":"negative"}'))
    service = GrokAIService('test-key', 'labels-model', transport=httpx.MockTransport(handler))
    text = await service.generate_text('Pelayanan mengecewakan', system='Balas JSON saja: label', max_tokens=450)
    assert text == '{"label":"negative"}'
    request = seen[0]
    assert str(request.url) == 'https://api.x.ai/v1/responses' and request.headers['authorization'] == 'Bearer test-key'
    body = json.loads(request.content)
    assert body == {'model': 'labels-model', 'input': [{'role': 'user', 'content': 'Pelayanan mengecewakan'}], 'instructions': 'Balas JSON saja: label',
                    'max_output_tokens': 450, 'store': False, 'temperature': 0, 'text': {'format': {'type': 'json_object'}}}


@pytest.mark.asyncio
async def test_an_answer_people_wait_for_reasons_briefly_and_is_free_text():
    seen = []

    def handler(request):
        seen.append(json.loads(request.content))
        return httpx.Response(200, json=answer('Isu utama adalah antrean panjang [P1].'))
    service = GrokAIService('test-key', 'answers-model', effort='low', transport=httpx.MockTransport(handler))
    assert await service.generate_text('DATA…\nPERTANYAAN: apa isu utama?', system='Anda analis.', max_tokens=400) == 'Isu utama adalah antrean panjang [P1].'
    assert seen[0]['reasoning'] == {'effort': 'low'}
    assert 'text' not in seen[0] and 'temperature' not in seen[0]


@pytest.mark.asyncio
async def test_what_each_call_cost_is_added_up():
    service = GrokAIService('test-key', 'labels-model', transport=httpx.MockTransport(lambda request: httpx.Response(200, json=answer('ok'))))
    await service.generate_text('a')
    await service.generate_text('b')
    assert hosted.usage() == {'calls': 2, 'input_tokens': 1000, 'cached_tokens': 200, 'output_tokens': 80, 'reasoning_tokens': 0, 'cost_usd': 0.00145}


@pytest.mark.asyncio
async def test_a_busy_service_is_tried_again_and_then_answers():
    replies = iter([httpx.Response(429), httpx.Response(503), httpx.Response(200, json=answer('jadi'))])
    service = GrokAIService('test-key', 'labels-model', transport=httpx.MockTransport(lambda request: next(replies)))
    assert await service.generate_text('a') == 'jadi'
    assert hosted.state() == 'ok'


@pytest.mark.asyncio
@pytest.mark.parametrize('status', [401, 402, 403])
async def test_a_refused_key_or_empty_credit_stops_the_paid_lane_instead_of_failing_job_after_job(status):
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(status, json={'error': 'secret detail from the service'})
    service = GrokAIService('test-key', 'labels-model', transport=httpx.MockTransport(handler))
    with pytest.raises(hosted.AIUnavailable) as raised:
        await service.generate_text('a')
    assert len(calls) == 1, 'a refusal is not retried'
    assert hosted.state() == 'access'
    assert 'secret detail' not in str(raised.value)


@pytest.mark.asyncio
async def test_a_service_that_stays_busy_pauses_the_lane_briefly():
    service = GrokAIService('test-key', 'labels-model', transport=httpx.MockTransport(lambda request: httpx.Response(429)))
    with pytest.raises(hosted.AIUnavailable):
        await service.generate_text('a')
    assert hosted.state() == 'busy'


@pytest.mark.asyncio
async def test_an_empty_answer_is_an_error_not_a_label():
    empty = {'output': [{'type': 'reasoning', 'summary': []}], 'usage': {}}
    service = GrokAIService('test-key', 'labels-model', transport=httpx.MockTransport(lambda request: httpx.Response(200, json=empty)))
    with pytest.raises(ValueError):
        await service.generate_text('a')


# ── Which engine serves what ────────────────────────────────────────────────────────────────────────────────────────

def test_answers_and_labels_use_their_own_models():
    answers, labels = ai.get_ai_service(settings()), ai.get_bulk_ai_service(settings())
    assert (answers.model, answers.effort, answers.name) == ('answers-model', 'low', 'grok')
    assert (labels.model, labels.effort) == ('labels-model', None)
    assert ai.get_ai_service(settings(XAI_API_KEY='')) is None and not ai.is_configured(settings(XAI_API_KEY=''))
    assert ai.is_configured(settings()) and ai.is_configured(settings(AI_PROVIDER='ollama'))
    local = ai.get_bulk_ai_service(settings(AI_PROVIDER='ollama'))
    assert local.model == 'local-model'


def test_background_labelling_on_paid_tokens_is_off_until_it_is_switched_on():
    assert ai.background_mode(settings()) is None
    assert ai.background_mode(settings(PULSE_AI_HOSTED_BACKGROUND=True)) == 'hosted'
    assert ai.background_mode(settings(PULSE_AI_HOSTED_BACKGROUND=True, XAI_API_KEY='')) is None
    assert ai.background_mode(settings(PULSE_AI_HOSTED_BACKGROUND=True, PULSE_SENTIMENT_ENABLED=False)) is None
    assert ai.background_mode(settings(AI_PROVIDER='ollama')) == 'local'
    assert ai.background_mode(settings(AI_PROVIDER='claude', ANTHROPIC_API_KEY='k', PULSE_AI_HOSTED_BACKGROUND=True)) is None


# ── Several labelling calls at once ─────────────────────────────────────────────────────────────────────────────────

@pytest.fixture
async def store(tmp_path):
    engine = create_async_engine(f'sqlite+aiosqlite:///{tmp_path}/hosted.db')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(WatchTopic(id='t', label='Pelayanan', query='pelayanan'))
        await db.flush()
        for index in range(3):
            db.add(SourceItem(id=f'p{index}', topic_id='t', source='x', platform='x', url=f'https://x.com/a/status/{index}', text=f'Pelayanan buruk {index}',
                              published_at=datetime(2026, 11, 9, 3), crawled_at=datetime(2026, 11, 9, 4, index), metrics={'likes': index}))
        await db.commit()
    yield factory
    await engine.dispose()


class Together:
    """A model that answers only once two calls are in flight, which proves they overlap."""
    model, name = 'labels-model', 'grok'

    def __init__(self, needed=2):
        self.waiting, self.needed, self.all_in, self.texts = 0, needed, asyncio.Event(), []

    async def generate_text(self, content, **kwargs):
        self.texts.append(content)
        self.waiting += 1
        if self.waiting >= self.needed:
            self.all_in.set()
        await asyncio.wait_for(self.all_in.wait(), 5)
        return '{"label":"negative","confidence":0.9,"reason":"Keluhan"}'


@pytest.mark.asyncio
async def test_two_lanes_label_two_different_posts_at_the_same_time(store, monkeypatch):
    from app.services import pulse_sentiment
    from app.services.pulse_sentiment import run_one
    monkeypatch.setattr(pulse_sentiment, 'POST_BATCH', 1)      # one post a call, so each lane has a post of its own
    model = Together()
    done = await asyncio.gather(run_one(store, model, lane='hosted-0'), run_one(store, model, lane='hosted-1'))
    assert done == ['done', 'done']
    assert len(set(model.texts)) == 2, 'each lane took its own post'
    async with store() as db:
        labelled = [item for item in [await db.get(SourceItem, f'p{index}') for index in range(3)] if (item.metrics or {}).get('sentiment')]
        assert len(labelled) == 2
        assert {item.metrics['sentiment']['method'] for item in labelled} == {'grok_post_v1'}      # the record says which engine wrote it
        assert all(item.metrics['likes'] is not None for item in labelled)


@pytest.mark.asyncio
async def test_one_hosted_call_labels_several_short_posts_and_an_entry_left_out_is_asked_again(store):
    import json
    from app.models.pulse_sentiment import SentimentJob
    from app.services.pulse_sentiment import run_one
    calls = []

    class Batch:
        model, name = 'labels-model', 'grok'

        async def generate_text(self, content, **kwargs):
            calls.append(json.loads(content))
            entry = lambda n: {'n': n, 'label': 'negative', 'confidence': 0.9, 'reason': 'Keluhan', 'kind': 'statement',
                               'emotion': {'label': 'anger', 'confidence': 0.8, 'reason': 'Marah'}}
            return json.dumps({'results': [entry(1), entry(2)]})      # the third text gets no entry
    assert await run_one(store, Batch(), lane='hosted-0') == 'done'
    assert len(calls) == 1 and len(calls[0]['texts']) == 3, 'three posts, one call'
    async with store() as db:
        jobs = {f'p{index}': await db.get(SentimentJob, f'p{index}') for index in range(3)}
        assert sorted(job.status for job in jobs.values()) == ['done', 'done', 'pending']
        labelled = [await db.get(SourceItem, name) for name, job in jobs.items() if job.status == 'done']
        assert all(item.metrics['sentiment']['label'] == 'negative' and item.metrics['emotion']['label'] == 'anger' and item.metrics['likes'] is not None for item in labelled)


@pytest.mark.asyncio
async def test_a_post_with_the_exact_text_of_a_labelled_one_copies_its_label_and_costs_no_call(store):
    from app.models.pulse_sentiment import SentimentJob
    from app.services.pulse_sentiment import run_one
    async with store() as db:
        first = await db.get(SourceItem, 'p0')
        first.metrics = {'likes': 0, 'sentiment': {'label': 'negative', 'confidence': 0.9, 'reason': 'Keluhan'}}
        db.add(SourceItem(id='copy', topic_id='t', source='x', platform='x', url='https://x.com/a/status/copy', text=first.text,
                          published_at=datetime(2026, 11, 9, 3), crawled_at=datetime(2026, 11, 9, 5), metrics={'likes': 5}))
        await db.commit()
    asked = []

    class Counting:
        model, name = 'labels-model', 'grok'

        async def generate_text(self, content, **kwargs):
            asked.append(content)
            raise AssertionError('the copy must not be sent')
    import json
    class Answering(Counting):
        async def generate_text(self, content, **kwargs):
            asked.append(content)
            rows = json.loads(content)['texts']
            return json.dumps({'results': [{'n': row['n'], 'label': 'neutral', 'confidence': 0.6, 'reason': 'x'} for row in rows]})
    await run_one(store, Answering(), lane='hosted-0')
    async with store() as db:
        copy = await db.get(SourceItem, 'copy')
        assert copy.metrics['sentiment']['label'] == 'negative' and copy.metrics['sentiment']['reused_from'] == 'p0' and copy.metrics['likes'] == 5
        assert (await db.get(SentimentJob, 'copy')).status == 'done'
    assert all('Pelayanan buruk 0' not in text for text in asked), 'the repeated text was not asked again'


@pytest.mark.asyncio
async def test_usage_is_written_per_day_lane_and_model_and_survives_a_restart(store):
    from app.models.pulse_ai_usage import AIUsageDay
    hosted.reset()
    hosted.set_lane('labels_posts')
    hosted.record({'input_tokens': 500, 'output_tokens': 100, 'input_tokens_details': {'cached_tokens': 300}, 'cost_in_usd_ticks': 20_000_000}, 'labels-model')
    hosted.record({'input_tokens': 500, 'output_tokens': 100, 'cost_in_usd_ticks': 20_000_000}, 'labels-model')
    await hosted.flush(store)
    await hosted.flush(store)     # nothing new: nothing added twice
    async with store() as db:
        rows = (await db.execute(select(AIUsageDay))).scalars().all()
    assert len(rows) == 1 and (rows[0].lane, rows[0].model, rows[0].calls, rows[0].input_tokens, rows[0].cached_tokens, rows[0].output_tokens, rows[0].cost_ticks) == \
        ('labels_posts', 'labels-model', 2, 1000, 300, 200, 40_000_000)
    hosted.set_lane('answers')


@pytest.mark.asyncio
async def test_a_job_cut_short_by_an_unavailable_service_keeps_its_attempts(store):
    from app.models.pulse_sentiment import SentimentJob
    from app.services.pulse_sentiment import run_one

    class Refused:
        model, name = 'labels-model', 'grok'

        async def generate_text(self, content, **kwargs):
            raise hosted.AIUnavailable('access')
    assert await run_one(store, Refused(), lane='hosted-0') == 'unavailable'
    async with store() as db:
        jobs = [await db.get(SentimentJob, f'p{index}') for index in range(3)]
        assert sorted((job.status, job.attempts) for job in jobs) == [('pending', 0)] * 3


@pytest.mark.asyncio
async def test_the_hosted_round_runs_its_lanes_side_by_side_and_stops_when_the_service_refuses(monkeypatch):
    from app.services import pulse_analysis_cycle as cycle
    running, most, lanes = 0, 0, set()

    async def labelling(lane):
        nonlocal running, most
        lanes.add(lane)
        running += 1
        most = max(most, running)
        await asyncio.sleep(0.01)
        running -= 1
        if len(lanes) == 3 and lane == 'hosted-0':
            hosted.pause(60, 'access')
        return 'done'

    async def nothing(lane):
        return 'idle'
    result = await cycle.hosted_round(3, response=labelling, caption=labelling, kind=nothing, budget=5)
    assert lanes == {'hosted-0', 'hosted-1', 'hosted-2'} and most == 3
    assert result['stopped'] == 'access'
    assert await cycle.hosted_round(3, response=labelling, caption=labelling, kind=nothing, budget=5) == {'stopped': 'access', 'turns': 0}


# ── What the app is told ────────────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_the_app_learns_that_ai_works_and_whether_labelling_needs_attention_without_any_name(client, admin_token, monkeypatch):
    from app.config import get_settings
    live = get_settings()
    for key, value in dict(AI_PROVIDER='grok', XAI_API_KEY='test-key', XAI_MODEL='answers-model', XAI_BULK_MODEL='labels-model',
                           PULSE_SENTIMENT_ENABLED=True, PULSE_AI_HOSTED_BACKGROUND=True).items():
        monkeypatch.setattr(live, key, value, raising=False)
    headers = {'Authorization': f'Bearer {admin_token}'}
    assert (await client.get('/api/admin/pulse/chat/status', headers=headers)).json() == {'configured': True}
    status = await client.get('/api/admin/pulse/sentiment/status', headers=headers)
    assert status.json() == {'configured': True, 'mode': 'automatic_and_manual', 'max_characters': 6000}
    progress = await client.get('/api/admin/pulse/sentiment/progress', headers=headers)
    assert progress.json()['enabled'] is True and progress.json()['ai_state'] == 'ok'
    hosted.pause(600, 'access')
    progress = await client.get('/api/admin/pulse/sentiment/progress', headers=headers)
    assert progress.json()['ai_state'] == 'access'
    for body in (status.text, progress.text):
        assert not [word for word in ('grok', 'x.ai', 'answers-model', 'labels-model') if word in body.lower()]


# ── Measuring before the queue is switched on ───────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_the_trial_measures_real_items_and_writes_nothing(store):
    from app.models.pulse_sentiment import SentimentJob
    from app.pulse_ai_check import measure
    from app.services.pulse_sentiment import enqueue_missing
    async with store() as db:
        item = await db.get(SourceItem, 'p0')
        item.metrics = {**item.metrics, 'comment_snapshot': {'status': 'success', 'items': [{'id': f'c{n}', 'text': f'Komentar {n}', 'likes': n} for n in range(6)]}}
        await enqueue_missing(db)
        await db.commit()

    class Counting:
        name = 'grok'

        def __init__(self, model, reply):
            self.model, self.reply, self.calls = model, reply, 0

        async def generate_text(self, content, **kwargs):
            self.calls += 1
            hosted.record({'input_tokens': 400, 'output_tokens': 50, 'cost_in_usd_ticks': 6_250_000})
            return self.reply
    labels = Counting('labels-model', '{"label":"negative","confidence":0.9,"reason":"Keluhan"}')
    answers = Counting('answers-model', 'Isu utama adalah pelayanan [P1].')
    report = await measure(store, labels, answers, posts=2)
    assert [row['what'] for row in report['calls']] == ['posting', 'posting', 'komentar (6 sekaligus)', 'jawaban Tanya AI']
    assert all(row['input_tokens'] == 400 and row['cost_usd'] == 0.000625 for row in report['calls'])
    assert report['calls'][0]['result'] == 'negative'
    assert (labels.calls, answers.calls) == (3, 1)
    assert report['queue']['posts'] == 3 and report['queue']['estimated_usd'] > 0
    async with store() as db:
        stored = [(await db.get(SourceItem, f'p{index}')).metrics.get('sentiment') for index in range(3)]
        assert stored == [None, None, None], 'no label is stored by a trial'
        assert [(await db.get(SentimentJob, f'p{index}')).status for index in range(3)] == ['pending'] * 3


# ── Live X search (the radar's discovery of what X is talking about) ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_live_x_search_carries_the_tool_with_its_dates_keeps_nothing_stored_and_records_what_it_cost():
    seen = []

    def handler(request):
        seen.append(json.loads(request.content))
        return httpx.Response(200, json=answer('{"issues": []}', cost_in_usd_ticks=3_926_500_000, server_side_tool_usage_details={'x_posts_fetched': 59}))
    engine = GrokAIService('test-key', 'answers-model', effort='low', transport=httpx.MockTransport(handler))
    text = await engine.search_x('Cari isu di X', from_date='2026-11-14', to_date='2026-11-16', system='Jawab JSON')
    assert text == '{"issues": []}'
    [body] = seen
    assert body['tools'] == [{'type': 'x_search', 'from_date': '2026-11-14', 'to_date': '2026-11-16'}]
    assert body['store'] is False and body['model'] == 'answers-model' and body['instructions'] == 'Jawab JSON' and body['max_output_tokens'] == 4000
    assert hosted.usage()['calls'] == 1 and hosted.usage()['cost_usd'] == 0.39265


@pytest.mark.asyncio
async def test_a_search_that_is_busy_is_given_up_without_pausing_everything_else():
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(429, json={'code': 'resource-exhausted', 'error': 'at capacity'})
    engine = GrokAIService('test-key', 'answers-model', effort='low', transport=httpx.MockTransport(handler))
    with pytest.raises(hosted.AIUnavailable) as failure:
        await engine.search_x('Cari isu di X', from_date='2026-11-14', to_date='2026-11-16')
    assert failure.value.reason == 'busy' and len(calls) == 2, 'one retry, then the refresh goes on without X'
    assert hosted.state() == 'ok', 'answers and labelling are not paused because a search was busy'
    refused = GrokAIService('test-key', 'answers-model', transport=httpx.MockTransport(lambda request: httpx.Response(402, json={'error': 'credit'})))
    with pytest.raises(hosted.AIUnavailable):
        await refused.search_x('Cari', from_date='2026-11-14', to_date='2026-11-16')
    assert hosted.state() == 'access', 'a refused key or empty credit still stops the lane: no retry helps'

import json
from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.database import Base
from app.models.pulse import WatchTopic, SourceItem
from app.models.pulse_response_analysis import ResponseAnalysisJob as Job
from app.models.pulse_sentiment import SentimentLane
from app.services import pulse_text_kind as kinds, pulse_response_analysis as response

NEUTRAL = {'label': 'neutral', 'confidence': 0.9, 'reason': 'Datar'}


@pytest.fixture
async def store(tmp_path, monkeypatch):
    monkeypatch.setattr(kinds, '_idle_until', 0.0)
    monkeypatch.setattr(kinds, '_gave_up', set())
    monkeypatch.setattr(kinds, '_tries', {})
    engine = create_async_engine(f'sqlite+aiosqlite:///{tmp_path}/kind.db')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(WatchTopic(id='t', label='Usulan kenaikan pajak', query='pajak'))
        db.add(SentimentLane(id='local'))
        await db.flush()
        db.add(SourceItem(id='ask', topic_id='t', source='xpoz', platform='x', url='https://x/1', text='Kapan aturannya berlaku?', metrics={'likes': 3, 'sentiment': NEUTRAL}))
        db.add(SourceItem(id='news', topic_id='t', source='rss', platform='news', url='https://n/1', text='Pemerintah mengumumkan aturan', metrics={'sentiment': NEUTRAL}))
        db.add(SourceItem(id='angry', topic_id='t', source='xpoz', platform='x', url='https://x/2', text='Parah', metrics={'sentiment': {**NEUTRAL, 'label': 'negative'}}))
        db.add(SourceItem(id='typed', topic_id='t', source='xpoz', platform='x', url='https://x/3', text='Ayo ikut', metrics={'sentiment': {**NEUTRAL, 'kind': 'call'}}))
        db.add(SourceItem(id='host', topic_id='t', source='xpoz', platform='x', url='https://x/4', text='Induk', metrics={
            'sentiment': {**NEUTRAL, 'kind': 'statement'}, 'comment_snapshot': {'items': [{'id': 'c1', 'text': 'Hebat sekali ya, luar biasa'}]}}))
        db.add(Job(id='j1', post_id='host', subject_id='c1', kind='comment', content_target_hash='h', status='done', attempts=1,
                   finished_at=datetime(2026, 11, 14), result={'sentiment': dict(NEUTRAL), 'stance': {'label': 'unclear', 'confidence': 0.5, 'reason': 'x', 'review_needed': True}}))
        await db.commit()
    yield factory
    await engine.dispose()


class KindAI:
    model = 'installed-test-model'

    def __init__(self, answer):
        self.asked, self.answer = [], answer

    async def generate_text(self, content, **kwargs):
        self.asked.append(json.loads(content))
        extra = [{'n': 7, 'kind': 'question'}, {'n': 1, 'kind': 'call'}] if self.answer in kinds.KINDS else []   # out of range, and a repeat: both ignored
        return json.dumps({'results': [{'n': row['n'], 'kind': self.answer} for row in self.asked[-1]['texts']] + extra})


async def test_fills_the_form_for_neutral_posts_then_comments_and_stops(store):
    ai = KindAI('question')
    assert await kinds.run_one(store, ai) == 'done'
    assert ai.asked[0] == {'texts': [{'n': 1, 'text': 'Kapan aturannya berlaku?'}]}     # not the news report, the negative post or the one already typed
    async with store() as db:
        post = await db.get(SourceItem, 'ask')
        assert post.metrics == {'likes': 3, 'sentiment': {**NEUTRAL, 'kind': 'question'}}
        assert 'kind' not in (await db.get(SourceItem, 'news')).metrics['sentiment']
    ai.answer = 'sarcasm'
    assert await kinds.run_one(store, ai) == 'done'
    assert ai.asked[1] == {'texts': [{'n': 1, 'text': 'Hebat sekali ya, luar biasa'}]}
    async with store() as db:
        job = await db.get(Job, 'j1')
        assert job.result['sentiment'] == {**NEUTRAL, 'kind': 'sarcasm'} and job.result['stance']['label'] == 'unclear'
        assert (await db.get(SentimentLane, 'local')).lease_token is None
    assert await kinds.run_one(store, ai) == 'idle' and len(ai.asked) == 2
    assert await kinds.run_one(store, ai) == 'idle'                                    # resting: it does not look again right away


async def test_an_invalid_answer_is_never_stored_and_the_text_is_dropped_after_two_tries(store):
    ai = KindAI('shouting')
    assert await kinds.run_one(store, ai) == 'failed'
    assert await kinds.run_one(store, ai) == 'failed'
    async with store() as db:
        assert 'kind' not in (await db.get(SourceItem, 'ask')).metrics['sentiment']
    assert 'ask' in kinds._gave_up
    assert (await kinds.run_one(store, ai)) == 'failed' and ai.asked[-1]['texts'][0]['text'].startswith('Hebat')   # moves on to the comment


async def test_busy_lane_is_left_alone_and_answers_are_validated(store):
    async with store() as db:
        lane = await db.get(SentimentLane, 'local')
        lane.lease_token, lane.lease_until = 'other', datetime(2999, 1, 1)
        await db.commit()
    ai = KindAI('question')
    assert await kinds.run_one(store, ai) == 'busy' and not ai.asked
    assert kinds.parse_kinds(json.dumps({'results': [{'n': 1, 'kind': 'call'}, {'n': 1, 'kind': 'question'}, {'n': 3, 'kind': 'call'}, {'n': True, 'kind': 'call'}, 'x']}), 2) == {1: 'call'}
    with pytest.raises(ValueError):
        kinds.parse_kinds('[]', 2)


async def test_a_neutral_post_is_read_by_tone_share_v2_in_either_stored_form(store):
    """A plain-string label or one in another letter case is neutral too (pulse_measures.tone), so it gets a form instead
    of staying "Belum dirinci"; a plain string is stored as an object that keeps the label as it was."""
    async with store() as db:
        db.add(SourceItem(id='plain', topic_id='t', source='xpoz', platform='x', url='https://x/5', text='Siapa yang setuju?', metrics={'sentiment': 'neutral'}))
        db.add(SourceItem(id='cased', topic_id='t', source='xpoz', platform='x', url='https://x/6', text='Bagaimana nasibnya?', metrics={'sentiment': {'label': ' Neutral '}}))
        db.add(SourceItem(id='loud', topic_id='t', source='xpoz', platform='x', url='https://x/7', text='Tolak!', metrics={'sentiment': 'NEGATIVE'}))
        await db.commit()
    ai = KindAI('question')
    assert await kinds.run_one(store, ai) == 'done'
    assert sorted(row['text'] for row in ai.asked[0]['texts']) == ['Bagaimana nasibnya?', 'Kapan aturannya berlaku?', 'Siapa yang setuju?']
    async with store() as db:
        assert (await db.get(SourceItem, 'plain')).metrics['sentiment'] == {'label': 'neutral', 'kind': 'question'}
        assert (await db.get(SourceItem, 'cased')).metrics['sentiment'] == {'label': ' Neutral ', 'kind': 'question'}
        assert (await db.get(SourceItem, 'loud')).metrics['sentiment'] == 'NEGATIVE'

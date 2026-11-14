import json
from datetime import datetime

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.database import Base
from app.models.pulse import WatchTopic, SourceItem
from app.models.pulse_response_analysis import ResponseAnalysisJob as Job
from app.services import pulse_response_analysis as s

TARGET = 'Usulan kenaikan pajak'


def comments(prefix, count):
    return {'items': [{'id': f'{prefix}{i}', 'text': f'Komentar {prefix} nomor {i}'} for i in range(count)]}


@pytest.fixture
async def store(tmp_path):
    engine = create_async_engine(f'sqlite+aiosqlite:///{tmp_path}/batch.db')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(WatchTopic(id='t', label=TARGET, query='pajak'))
        await db.flush()
        db.add(SourceItem(id='quiet', topic_id='t', source='xpoz', platform='x', url='https://x/quiet', text='Sepi',
                          crawled_at=datetime(2026, 11, 14), metrics={'comments': 3, 'comment_snapshot': comments('q', 3)}))
        db.add(SourceItem(id='busy', topic_id='t', source='xpoz', platform='x', url='https://x/busy', text='Ramai',
                          crawled_at=datetime(2026, 11, 1), metrics={'comments': 900, 'comment_snapshot': comments('b', 40)}))
        await db.commit()
    yield factory
    await engine.dispose()


class BatchAI:
    model = 'installed-test-model'

    def __init__(self, skip=()):
        self.asked, self.skip = [], set(skip)

    async def generate_text(self, content, **kwargs):
        payload = json.loads(content)
        self.asked.append((payload, kwargs))
        if 'comments' not in payload:    # a single subject: the original contract
            return json.dumps({'target_is_issue': True, 'kind': 'question', 'sentiment': {'label': 'neutral', 'confidence': 0.9, 'reason': 'Bertanya'},
                               'stance': {'label': 'unclear', 'confidence': 0.9, 'reason': 'Tidak bersikap'}})
        return json.dumps({'target_is_issue': True, 'results': [
            {'n': row['n'], 'stance': 'opposes', 'stance_confidence': 0.9, 'sentiment': 'neutral' if row['n'] % 2 else 'negative',
             'sentiment_confidence': 0.6 if row['n'] == 2 else 0.9, 'kind': 'sarcasm' if row['n'] == 1 else 'statement', 'reason': 'Menolak usulan'}
            for row in payload['comments'] if row['n'] not in self.skip] + [{'n': 99, 'stance': 'opposes'}] + [
            {'n': n, 'stance': 'maybe', 'stance_confidence': 0.9, 'sentiment': 'neutral', 'sentiment_confidence': 0.9, 'reason': 'Label salah'} for n in sorted(self.skip)[1:]]})


async def done(factory):
    async with factory() as db:
        return {job.subject_id: job for job in (await db.execute(select(Job).where(Job.kind == 'comment', Job.status == 'done'))).scalars()}


async def test_busiest_post_first_top_comments_in_one_inference(store):
    ai = BatchAI(skip={3, 4})   # n=3 gets no answer at all, n=4 an answer with an invalid label
    assert await s.run_one(store, ai) == 'done'
    payload, options = ai.asked[0]
    assert payload['target'] == TARGET and [row['text'] for row in payload['comments']] == [f'Komentar b nomor {i}' for i in range(10)]
    assert 'JSON' in options['system'] and options['max_tokens'] >= 1000
    rows = await done(store)
    # Ten asked; the two without a valid answer stay pending for a later turn.
    assert sorted(rows) == ['b0', 'b1', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9']
    first = rows['b0'].result
    assert first['sentiment'] == {'label': 'neutral', 'confidence': 0.9, 'reason': 'Menolak usulan', 'review_needed': False, 'kind': 'sarcasm'}
    assert first['stance']['label'] == 'opposes' and first['method'] == 'response_batch_v1' and first['target'] == TARGET
    assert rows['b1'].result['sentiment']['review_needed'] is True          # confidence under 0.7
    async with store() as db:
        waiting = {job.subject_id: job for job in (await db.execute(select(Job).where(Job.kind == 'comment', Job.status == 'pending', Job.attempts == 1))).scalars()}
        assert sorted(waiting) == ['b2', 'b3'] and waiting['b2'].error == 'inference_failed'
        assert (await db.get(Job, rows['b9'].id)).comment_rank == 9


async def test_top_thirty_of_every_post_before_the_deep_tail(store):
    ai = BatchAI()
    async with store() as db:
        await s.enqueue_missing(db)
        await db.execute(update(Job).where(Job.kind == 'post').values(status='done'))   # leave only comments in the queue
        await db.commit()
    seen = []
    for _ in range(6):
        if await s.run_one(store, ai) != 'done':
            break
        seen.append([row['text'] for row in ai.asked[-1][0].get('comments', [{'text': ai.asked[-1][0].get('text')}])])
    flat = [text for group in seen for text in group]
    assert flat[:30] == [f'Komentar b nomor {i}' for i in range(30)]                       # the busy post's top thirty
    assert flat[30:33] == [f'Komentar q nomor {i}' for i in range(3)]                      # then the quiet post's comments
    assert flat[33:43] == [f'Komentar b nomor {i}' for i in range(30, 40)]                 # only then deeper into the busy post


async def test_single_comment_keeps_the_original_call_and_its_kind(store):
    async with store() as db:
        await db.execute(SourceItem.__table__.delete().where(SourceItem.id == 'busy'))
        quiet = await db.get(SourceItem, 'quiet')
        quiet.metrics = {'comments': 1, 'comment_snapshot': comments('q', 1)}
        await db.commit()
    ai = BatchAI()
    assert await s.run_one(store, ai) == 'done'
    payload, _ = ai.asked[0]
    assert payload == {'kind': 'comment', 'target': TARGET, 'text': 'Komentar q nomor 0'}
    assert (await done(store))['q0'].result['sentiment']['kind'] == 'question'


def test_batch_answer_is_validated_entry_by_entry():
    answer = {'target_is_issue': False, 'results': [
        {'n': 1, 'stance': 'supports', 'stance_confidence': 0.9, 'sentiment': 'positive', 'sentiment_confidence': 0.9, 'kind': 'shout', 'reason': 'Setuju'},
        {'n': 1, 'stance': 'opposes', 'stance_confidence': 0.9, 'sentiment': 'negative', 'sentiment_confidence': 0.9, 'reason': 'Duplikat'},
        {'n': 2, 'stance': 'supports', 'stance_confidence': 2, 'sentiment': 'positive', 'sentiment_confidence': 0.9, 'reason': 'Angka salah'},
        {'n': True, 'stance': 'supports', 'stance_confidence': 0.9, 'sentiment': 'positive', 'sentiment_confidence': 0.9, 'reason': 'Nomor salah'},
        'not an object']}
    parsed = s.parse_batch(json.dumps(answer), [False, True], TARGET)
    assert list(parsed) == [1]
    assert parsed[1]['stance']['label'] == 'unclear' and parsed[1]['stance']['review_needed']   # the target was judged too vague to take a side on
    assert parsed[1]['sentiment']['label'] == 'positive' and 'kind' not in parsed[1]['sentiment']
    with pytest.raises(ValueError):
        s.parse_batch(json.dumps({'results': []}), [False], TARGET)

import pytest
from app.models.pulse import WatchTopic, SourceItem


@pytest.mark.asyncio
async def test_worker_backfills_once_preserves_metrics_and_ignores_existing_sentiment(db):
    from app.services.pulse_sentiment import enqueue_missing, progress
    topic = WatchTopic(id='ai-topic',label='AI',query='AI')
    db.add(topic)
    await db.flush()
    for i, metrics in enumerate([{'likes':0},{'sentiment':{'label':'negative'}},{}]):
        db.add(SourceItem(id=f'ai-{i}',topic_id=topic.id,source='rss',url=f'https://example.com/ai/{i}',text='Bagus' if i<2 else '',metrics=metrics))
    await db.flush()
    await enqueue_missing(db)
    await enqueue_missing(db)
    state = await progress(db,topic.id)
    assert state['total'] == 3
    assert state['analyzed'] == 1
    assert state['pending'] == 1
    assert state['skipped'] == 1


@pytest.mark.asyncio
async def test_disabled_or_cloud_worker_never_runs(monkeypatch):
    from app.config import get_settings
    from app.services.pulse_sentiment import sentiment_tick
    monkeypatch.setattr(get_settings(),'AI_PROVIDER','claude')
    assert await sentiment_tick() == 'disabled'


@pytest.mark.asyncio
async def test_run_preserves_concurrent_metrics_and_excludes_second_worker():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.database import Base
    from app.services.pulse_sentiment import run_one, claim, progress
    from datetime import datetime
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    factory = async_sessionmaker(engine,expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with factory() as db:
            db.add(WatchTopic(id='one',label='One',query='one'))
            await db.flush()
            db.add(SourceItem(id='post',topic_id='one',source='rss',url='https://example.com/new',text='Saya senang',metrics={'likes':1}))
            await db.commit()
        class LocalModel:
            model='test-local'
            async def generate_text(self,content,**kwargs):
                async with factory() as db:
                    assert await claim(db,datetime.utcnow()) is None
                    post = await db.get(SourceItem,'post')
                    post.metrics={'likes':9,'views':100}
                    await db.commit()
                return '{"label":"positive","confidence":0.8,"reason":"Ungkapan senang","emotion":{"label":"joy","confidence":0.9,"reason":"Menyatakan senang"}}'
        assert await run_one(factory,LocalModel()) == 'done'
        assert await run_one(factory,LocalModel()) == 'idle'
        async with factory() as db:
            post = await db.get(SourceItem,'post')
            assert post.metrics['likes'] == 9
            assert post.metrics['views'] == 100
            assert post.metrics['sentiment']['label'] == 'positive'
            assert post.metrics['emotion']['label'] == 'joy'
            assert post.metrics['emotion']['model'] == 'test-local'
            assert post.metrics['emotion']['method'] == 'ollama_emotion_v1'
            assert (await progress(db,'one'))['analyzed'] == 1
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_invalid_response_retries_bounded_without_neutral_label():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.database import Base
    from app.models.pulse_sentiment import SentimentJob
    from app.services.pulse_sentiment import run_one
    from datetime import datetime, timedelta
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    factory = async_sessionmaker(engine,expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with factory() as db:
            db.add(WatchTopic(id='bad',label='Bad',query='bad'))
            await db.flush()
            db.add(SourceItem(id='bad-post',topic_id='bad',source='rss',url='https://example.com/bad',text='Text',metrics={}))
            await db.commit()
        class BadModel:
            model='test-local'
            async def generate_text(self,*args,**kwargs): return 'not json'
        for attempt in range(3):
            assert await run_one(factory,BadModel()) == 'failed'
            async with factory() as db:
                job=await db.get(SentimentJob,'bad-post')
                assert job.attempts == attempt+1
                job.available_at=datetime.utcnow()-timedelta(seconds=1)
                await db.commit()
        assert await run_one(factory,BadModel()) == 'idle'
        async with factory() as db:
            assert (await db.get(SentimentJob,'bad-post')).status == 'failed'
            assert 'sentiment' not in (await db.get(SourceItem,'bad-post')).metrics
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_form_of_the_text_is_stored_with_the_label_and_an_answer_without_a_label_is_refused():
    import json
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.database import Base
    from app.models.pulse_sentiment import SentimentJob
    from app.services import pulse_sentiment as service
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    emotion = {'label': 'none', 'confidence': 0.9, 'reason': 'Datar'}
    class AI:
        model = 'installed-test-model'
        def __init__(self, answer): self.answer = answer
        async def generate_text(self, content, **kwargs): return json.dumps(self.answer)
    try:
        async with factory() as db:
            db.add(WatchTopic(id='k', label='K', query='k'))
            await db.flush()
            db.add(SourceItem(id='ask', topic_id='k', source='xpoz', platform='x', url='https://example.com/ask', text='Kapan berlaku?', metrics={'likes': 2}))
            await db.commit()
        # The model once answered with emotion and kind only. Without a label nothing may be stored.
        assert await service.run_one(factory, AI({'emotion': emotion, 'kind': 'question'})) == 'failed'
        async with factory() as db:
            assert (await db.get(SourceItem, 'ask')).metrics == {'likes': 2}
            job = await db.get(SentimentJob, 'ask')
            job.available_at = job.available_at.replace(year=2000)
            await db.commit()
        assert await service.run_one(factory, AI({'label': 'neutral', 'confidence': 0.9, 'reason': 'Bertanya', 'kind': 'question', 'emotion': emotion})) == 'done'
        async with factory() as db:
            sentiment = (await db.get(SourceItem, 'ask')).metrics['sentiment']
            assert sentiment['label'] == 'neutral' and sentiment['kind'] == 'question'
        # The answer format names the label before anything optional, so the model cannot skip it.
        assert service.PROMPT.index('label (positive/neutral/negative)') < service.PROMPT.index('kind (') < service.PROMPT.index('emotion (')
        assert 'semuanya wajib' in service.PROMPT
    finally:
        await engine.dispose()

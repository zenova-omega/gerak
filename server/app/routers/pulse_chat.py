"""Mount with prefix /api/admin/pulse. One question, one grounded answer; nothing is stored."""
import asyncio
from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..services.pulse_chat import ANSWER_TOKENS, CONTEXT_TOKENS, SYSTEM, build_context, build_prompt, cited, data_block
from ..services.ai.priority import interactive
from ..services.pulse_identity import require_pulse_access

router = APIRouter(dependencies=[Depends(require_pulse_access)])


class ChatTurn(BaseModel):
    model_config = ConfigDict(extra='forbid')
    role: Literal['user', 'assistant']
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', populate_by_name=True)
    topic_id: str = Field(min_length=1, max_length=36)
    question: str = Field(min_length=2, max_length=600)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)
    date_from: date | None = Field(default=None, alias='from')
    date_to: date | None = Field(default=None, alias='to')
    platforms: list[str] | None = Field(default=None, max_length=12)
    post_id: str | None = Field(default=None, max_length=36)


def configured(settings):
    return settings.AI_PROVIDER == 'ollama' or (settings.AI_PROVIDER == 'claude' and bool(settings.ANTHROPIC_API_KEY))


@router.get('/chat/status')
async def chat_status():
    # Availability only. Which engine answers is an operations detail, not product surface.
    return {'configured': configured(get_settings())}


class KeywordRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    seed: str = Field(min_length=2, max_length=300)
    existing: list[str] = Field(default_factory=list, max_length=40)
    topic_id: str | None = Field(default=None, max_length=36)


@router.post('/keywords/suggest')
async def suggest_keywords(req: KeywordRequest, db: AsyncSession = Depends(get_db)):
    from ..services.ai import get_ai_service
    from ..services import pulse_keywords as keywords
    ai = get_ai_service()
    if ai is None:
        raise HTTPException(503, 'Saran keyword belum tersedia di server ini.')
    existing = [term.strip()[:60] for term in req.existing if term.strip()]
    texts = await keywords.stored_texts(db, req.topic_id)
    try:
        async with interactive():
            raw = await asyncio.wait_for(ai.generate_text(
                keywords.build_prompt(req.seed.strip(), existing, keywords.frequent_terms(texts, existing + [req.seed])),
                system=keywords.SYSTEM, max_tokens=500), timeout=90)
    except Exception:
        raise HTTPException(502, 'Saran keyword tidak berhasil dibuat. Coba lagi.')
    suggestions = keywords.count_usage(keywords.parse_suggestions(raw, existing + [req.seed.strip()]), texts)
    # Terms already visible in stored posts first: they are in use, not only plausible.
    suggestions.sort(key=lambda row: -(row['seen_in_posts'] or 0))
    return {'suggestions': suggestions, 'checked_posts': len(texts)}


class PrepareRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', populate_by_name=True)
    topic_id: str = Field(min_length=1, max_length=36)
    date_from: date | None = Field(default=None, alias='from')
    date_to: date | None = Field(default=None, alias='to')
    platforms: list[str] | None = Field(default=None, max_length=12)
    post_id: str | None = Field(default=None, max_length=36)


def _bounds(date_from, date_to):
    # Project dates are WIB calendar days; stored timestamps are naive UTC.
    return (datetime.combine(date_from, time.min) - timedelta(hours=7) if date_from else None,
            datetime.combine(date_to, time.max) - timedelta(hours=7) if date_to else None)


_warming: set[str] = set()


@router.post('/chat/prepare', status_code=202)
async def prepare(req: PrepareRequest, db: AsyncSession = Depends(get_db)):
    """Read the project data ahead of the first question, so the answer does not wait for it."""
    from ..services.ai import get_ai_service
    ai = get_ai_service()
    start, end = _bounds(req.date_from, req.date_to)
    built = await build_context(db, req.topic_id, datetime.utcnow(), start=start, end=end,
                                platforms=req.platforms or None, post_id=req.post_id)
    if ai is None or built is None:
        return {'preparing': False}
    block = data_block(built['context'])
    key = f'{req.topic_id}:{hash(block)}'
    if key in _warming:
        return {'preparing': True}

    async def warm():
        try:
            async with interactive():
                await asyncio.wait_for(ai.generate_text(block + 'PERTANYAAN ANALIS: siap', system=SYSTEM,
                                                        max_tokens=1, context_tokens=CONTEXT_TOKENS), timeout=90)
        except Exception:
            pass  # warming is an optimisation; the question itself still works without it
        finally:
            _warming.discard(key)
    _warming.add(key)
    asyncio.get_running_loop().create_task(warm())
    return {'preparing': True}


@router.post('/chat')
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    from ..services.ai import get_ai_service
    if req.date_from and req.date_to and req.date_from > req.date_to:
        raise HTTPException(422, 'Tanggal akhir harus sama atau setelah tanggal mulai.')
    start, end = _bounds(req.date_from, req.date_to)
    built = await build_context(db, req.topic_id, datetime.utcnow(), start=start, end=end,
                                platforms=req.platforms or None, post_id=req.post_id)
    if built is None:
        raise HTTPException(404, 'Project tidak ditemukan.')
    ai = get_ai_service()
    if ai is None:
        raise HTTPException(503, 'Model AI belum dikonfigurasi di server ini.')
    try:
        async with interactive():
            answer = await asyncio.wait_for(ai.generate_text(
                build_prompt(built['context'], req.question.strip(), [turn.model_dump() for turn in req.history]),
                system=SYSTEM, max_tokens=ANSWER_TOKENS, context_tokens=CONTEXT_TOKENS), timeout=115)
    except Exception:
        # Never relay provider errors: they can carry request content or credentials.
        raise HTTPException(502, 'Model AI tidak menjawab. Coba lagi; tidak ada data yang berubah.')
    scope = built['context']['scope']
    return {'answer': answer.strip(), 'sources': cited(answer, built['sources']),
            'scope': {'posts': scope['posts'], 'from': req.date_from, 'to': req.date_to,
                      'platforms': req.platforms or None, 'truncated': scope['truncated']},
            'answered_at': datetime.utcnow().isoformat() + 'Z'}


class SummaryRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', populate_by_name=True)
    format: Literal['brief', 'timeline', 'executive'] = 'brief'
    date_from: date | None = Field(default=None, alias='from')
    date_to: date | None = Field(default=None, alias='to')
    platforms: list[str] | None = Field(default=None, max_length=12)


@router.get('/topics/{topic_id}/summary')
async def stored_summaries(topic_id: str, db: AsyncSession = Depends(get_db)):
    """Summaries made earlier, one per format. Reading never calls the model."""
    from sqlalchemy import func, select
    from ..models.pulse import SourceItem, WatchTopic
    from ..models.pulse_summary import PulseSummary
    from ..services.pulse_summary import FORMATS, MIN_POSTS
    if await db.get(WatchTopic, topic_id) is None:
        raise HTTPException(404, 'Project tidak ditemukan.')
    rows = (await db.scalars(select(PulseSummary).where(PulseSummary.topic_id == topic_id))).all()
    posts = await db.scalar(select(func.count()).select_from(SourceItem).where(SourceItem.topic_id == topic_id))
    return {'available': configured(get_settings()), 'posts_now': posts or 0, 'min_posts': MIN_POSTS,
            'formats': [{'key': key, 'label': label} for key, (label, _) in FORMATS.items()],
            'summaries': {row.format: {**row.data, 'created_at': row.created_at.isoformat() + 'Z'} for row in rows}}


@router.post('/topics/{topic_id}/summary')
async def make_summary(topic_id: str, req: SummaryRequest, db: AsyncSession = Depends(get_db)):
    """Write (or rewrite) the summary in one format from stored data. Only runs when asked."""
    from ..models.pulse_summary import PulseSummary
    from ..services.ai import get_ai_service
    from ..services import pulse_summary as service
    if req.date_from and req.date_to and req.date_from > req.date_to:
        raise HTTPException(422, 'Tanggal akhir harus sama atau setelah tanggal mulai.')
    start, end = _bounds(req.date_from, req.date_to)
    built = await service.build_summary_input(db, topic_id, datetime.utcnow(), start=start, end=end, platforms=req.platforms or None)
    if built is None:
        raise HTTPException(404, 'Project tidak ditemukan.')
    if not built['posts']:
        raise HTTPException(409, 'Belum ada posting dalam cakupan ini untuk diringkas.')
    ai = get_ai_service()
    if ai is None:
        raise HTTPException(503, 'Ringkasan AI belum tersedia di instalasi ini.')
    try:
        async with interactive():
            text = await asyncio.wait_for(ai.generate_text(service.build_prompt(built['data'], req.format), system=service.BASE,
                                                           max_tokens=service.ANSWER_TOKENS, context_tokens=service.CONTEXT_TOKENS), timeout=170)
    except Exception:
        raise HTTPException(502, 'Ringkasan tidak berhasil disusun. Coba lagi; tidak ada data yang berubah.')
    sections = service.parse_sections(text)
    if not sections:
        raise HTTPException(502, 'Ringkasan tidak berhasil disusun. Coba lagi; tidak ada data yang berubah.')
    now = datetime.utcnow()
    data = {'format': req.format, 'sections': sections, 'facts': built['facts'],
            'sources': [{**source, 'published_at': source['published_at'].isoformat() + 'Z' if source.get('published_at') else None}
                        for source in service.cited(text, built['sources'])],
            'scope': {'posts': built['posts'], 'comments': built['comments'], 'truncated': built['truncated'],
                      'from': req.date_from.isoformat() if req.date_from else None, 'to': req.date_to.isoformat() if req.date_to else None,
                      'platforms': req.platforms or None}}
    row = await db.get(PulseSummary, (topic_id, req.format))
    if row is None:
        db.add(PulseSummary(topic_id=topic_id, format=req.format, created_at=now, data=data))
    else:
        row.data, row.created_at = data, now
    await db.flush()
    return {**data, 'created_at': now.isoformat() + 'Z'}

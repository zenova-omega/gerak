"""Mount with prefix /api/admin/pulse. One question, one grounded answer.

An answered question is kept as a turn of a conversation that belongs to the person who asked, inside one project.
Question and answer text is never written to the log."""
import asyncio
import logging
from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..models.pulse import WatchTopic
from ..models.pulse_chat import PulseChatConversation
from ..services.pulse_chat import ANSWER_TOKENS, CONTEXT_TOKENS, answer_tokens, system_prompt, build_context, build_prompt, cited, data_block, shape_answer
from ..services.ai.priority import interactive
from ..services.pulse_identity import require_pulse_access
from ..services.pulse_measures import period_closed_bounds

router = APIRouter(dependencies=[Depends(require_pulse_access)])
logger = logging.getLogger(__name__)

MAX_TURNS = 40          # questions in one conversation; the next one is asked in a new conversation
MAX_LISTED = 50         # conversations in the history list
TITLE_LENGTH = 80
NOT_FOUND = 'Percakapan ini tidak ditemukan atau sudah dihapus. Mulai percakapan baru untuk bertanya lagi.'


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
    conversation_id: str | None = Field(default=None, min_length=1, max_length=36)
    mode: Literal['answer', 'respons'] = 'answer'


def configured(settings):
    from ..services.ai import is_configured
    return is_configured(settings)


async def _release(db):
    """End the request's transaction before a slow model call.

    The standalone server writes an audit row for every POST, and SQLite has a single writer: a transaction left open
    while the model answers (a minute or more) makes every collection and analysis worker fail with 'database is
    locked'. What the route read stays in memory; anything it writes afterwards starts a new, short transaction."""
    await db.commit()


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
    await _release(db)
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
    # Project dates are whole days of the installation's zone; stored timestamps are naive UTC.
    return period_closed_bounds(date_from, date_to)


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
                await asyncio.wait_for(ai.generate_text(block + 'PERTANYAAN ANALIS: siap', system=system_prompt(),
                                                        max_tokens=1, context_tokens=CONTEXT_TOKENS), timeout=90)
        except Exception:
            pass  # warming is an optimisation; the question itself still works without it
        finally:
            _warming.discard(key)
    _warming.add(key)
    asyncio.get_running_loop().create_task(warm())
    return {'preparing': True}


def conversation_title(question):
    """The first question on one line, cut between words near TITLE_LENGTH characters."""
    text = ' '.join(question.split())
    if len(text) <= TITLE_LENGTH:
        return text
    cut = text[:TITLE_LENGTH - 1]
    space = cut.rfind(' ')
    return (cut[:space] if space >= TITLE_LENGTH - 25 else cut).rstrip() + '…'


def _when(value):
    return value.isoformat() + 'Z'


def _listed(conversation_id, title, updated_at, questions):
    """One line of the history list. `full` tells the page to offer a new conversation instead of the question box."""
    return {'id': conversation_id, 'title': title, 'updated_at': _when(updated_at), 'questions': questions, 'full': questions >= MAX_TURNS}


async def _own(db, conversation_id, user, topic_id=None):
    """The caller's conversation, read fresh. Someone else's, another project's and a missing one are the same 404."""
    row = await db.get(PulseChatConversation, conversation_id, populate_existing=True)
    if row is None or row.user_id != user.id or (topic_id is not None and row.topic_id != topic_id):
        raise HTTPException(404, NOT_FOUND)
    return row


async def remember(db, user, topic_id, conversation_id, turn, now):
    """Append an answered turn to the caller's conversation, or start one. Runs after the model wait, in its own short transaction.

    The wait can be a minute. If the conversation was deleted or filled up meanwhile (the same person in another tab),
    the turn starts a new conversation instead of bringing a deleted one back or passing the limit."""
    row = await db.get(PulseChatConversation, conversation_id, populate_existing=True) if conversation_id else None
    if row is None or row.user_id != user.id or row.topic_id != topic_id or len(row.turns or []) >= MAX_TURNS:
        row = PulseChatConversation(topic_id=topic_id, user_id=user.id, title=conversation_title(turn['question']), created_at=now, turns=[])
        db.add(row)
    row.turns = [*(row.turns or []), turn]      # a new list: a JSON column does not notice a change made in place
    row.updated_at = now
    await db.flush()
    return row


@router.post('/chat')
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db), user=Depends(require_pulse_access)):
    from ..services.ai import get_ai_service
    if req.date_from and req.date_to and req.date_from > req.date_to:
        raise HTTPException(422, 'Tanggal akhir harus sama atau setelah tanggal mulai.')
    start, end = _bounds(req.date_from, req.date_to)
    built = await build_context(db, req.topic_id, datetime.utcnow(), start=start, end=end,
                                platforms=req.platforms or None, post_id=req.post_id)
    if built is None:
        raise HTTPException(404, 'Project tidak ditemukan.')
    if req.conversation_id:
        # Checked before the model is asked: a question for a conversation that cannot take it costs nothing.
        if len((await _own(db, req.conversation_id, user, req.topic_id)).turns or []) >= MAX_TURNS:
            raise HTTPException(409, f'Percakapan ini sudah berisi {MAX_TURNS} pertanyaan. Mulai percakapan baru untuk bertanya lagi.')
    ai = get_ai_service()
    if ai is None:
        raise HTTPException(503, 'Model AI belum dikonfigurasi di server ini.')
    question = req.question.strip()
    await _release(db)
    try:
        async with interactive():
            answer = await asyncio.wait_for(ai.generate_text(
                build_prompt(built['context'], question, [turn.model_dump() for turn in req.history]),
                system=system_prompt(req.mode), max_tokens=answer_tokens(req.mode), context_tokens=CONTEXT_TOKENS), timeout=115)
    except Exception:
        # Never relay provider errors: they can carry request content or credentials.
        raise HTTPException(502, 'Model AI tidak menjawab. Coba lagi; tidak ada data yang berubah.')
    now = datetime.utcnow()
    scope = built['context']['scope']
    # Encoded once, so the stored turn is exactly what this response carries.
    shaped = shape_answer(answer, built['context'])
    shown = jsonable_encoder({'answer': shaped['answer'], 'sources': cited(answer, built['sources']),
                              'groups': shaped['groups'], 'charts': shaped['charts'],
                              'scope': {'posts': scope['posts'], 'from': req.date_from, 'to': req.date_to,
                                        'platforms': req.platforms or None, 'truncated': scope['truncated']},
                              'mode': req.mode, 'answered_at': _when(now)})
    try:
        row = await remember(db, user, req.topic_id, req.conversation_id, {'question': question, **shown}, now)
        kept = _listed(row.id, row.title, row.updated_at, len(row.turns))
        await db.commit()
    except Exception as error:
        # The answer exists: it is handed back even when it could not be kept, and the response says so with a null id.
        # Only the kind of failure is logged, never the text.
        await db.rollback()
        logger.warning('PULSE chat: answer not stored (%s)', type(error).__name__)
        kept = None
    return {**shown, 'conversation_id': kept and kept['id'], 'conversation': kept}


@router.get('/chat/conversations')
async def conversations(topic_id: str = Query(min_length=1, max_length=36), db: AsyncSession = Depends(get_db), user=Depends(require_pulse_access)):
    """The caller's stored conversations in one project, newest first. `total` says how many exist when the list is cut."""
    if await db.get(WatchTopic, topic_id) is None:
        raise HTTPException(404, 'Project tidak ditemukan.')
    mine = (PulseChatConversation.topic_id == topic_id, PulseChatConversation.user_id == user.id)
    # The number of questions is counted in the database, so listing never loads the conversations themselves.
    rows = (await db.execute(
        select(PulseChatConversation.id, PulseChatConversation.title, PulseChatConversation.updated_at,
               func.json_array_length(PulseChatConversation.turns, type_=Integer))
        .where(*mine).order_by(PulseChatConversation.updated_at.desc(), PulseChatConversation.id).limit(MAX_LISTED))).all()
    total = await db.scalar(select(func.count()).select_from(PulseChatConversation).where(*mine))
    return {'conversations': [_listed(*row) for row in rows], 'total': total or 0}


@router.get('/chat/conversations/{conversation_id}')
async def conversation(conversation_id: str, topic_id: str | None = Query(default=None, max_length=36),
                       db: AsyncSession = Depends(get_db), user=Depends(require_pulse_access)):
    row = await _own(db, conversation_id, user, topic_id)
    turns = row.turns or []
    return {'id': row.id, 'topic_id': row.topic_id, 'title': row.title, 'created_at': _when(row.created_at),
            'updated_at': _when(row.updated_at), 'full': len(turns) >= MAX_TURNS, 'turns': turns}


@router.delete('/chat/conversations/{conversation_id}')
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db), user=Depends(require_pulse_access)):
    await db.delete(await _own(db, conversation_id, user))
    await db.flush()
    return {'deleted': conversation_id}


class SummaryRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', populate_by_name=True)
    format: Literal['brief', 'timeline', 'executive', 'insights'] = 'brief'
    date_from: date | None = Field(default=None, alias='from')
    date_to: date | None = Field(default=None, alias='to')
    platforms: list[str] | None = Field(default=None, max_length=12)


@router.get('/topics/{topic_id}/summary')
async def stored_summaries(topic_id: str, db: AsyncSession = Depends(get_db)):
    """Summaries made earlier, one per format. Reading never calls the model.
    `formats` is the switch of the summary card; a format with a page of its own (insights) is stored but not listed there."""
    from sqlalchemy import func, select
    from ..models.pulse import SourceItem, WatchTopic
    from ..models.pulse_summary import PulseSummary
    from ..services.pulse_summary import MIN_POSTS, card_formats, tidy_stored, with_photos
    if await db.get(WatchTopic, topic_id) is None:
        raise HTTPException(404, 'Project tidak ditemukan.')
    rows = (await db.scalars(select(PulseSummary).where(PulseSummary.topic_id == topic_id))).all()

    async def read_back(row):
        data = tidy_stored(row.data or {})
        return {**data, 'sources': await with_photos(db, data.get('sources') or []), 'created_at': row.created_at.isoformat() + 'Z'}
    posts = await db.scalar(select(func.count()).select_from(SourceItem).where(SourceItem.topic_id == topic_id))
    return {'available': configured(get_settings()), 'posts_now': posts or 0, 'min_posts': MIN_POSTS,
            'formats': card_formats(),
            'summaries': {row.format: await read_back(row) for row in rows}}


@router.post('/topics/{topic_id}/summary')
async def make_summary(topic_id: str, req: SummaryRequest, db: AsyncSession = Depends(get_db)):
    """Write (or rewrite) the summary in one format from stored data. Only runs when asked."""
    from ..models.pulse_summary import PulseSummary
    from ..services.ai import get_ai_service
    from ..services import pulse_summary as service
    if req.date_from and req.date_to and req.date_from > req.date_to:
        raise HTTPException(422, 'Tanggal akhir harus sama atau setelah tanggal mulai.')
    # The summary card's formats always read the whole project, whatever the project bar chooses: a summary is never
    # narrowed by a filter, so changing the dates or platforms never loses what it covered (the owner, 15 Nov 2026).
    # AI Insights is written for the chosen period and platforms, as its page says.
    whole = req.format in service.WHOLE_PROJECT_FORMATS
    date_from, date_to, platforms = (None, None, None) if whole else (req.date_from, req.date_to, req.platforms or None)
    start, end = _bounds(date_from, date_to)
    built = await service.build_summary_input(db, topic_id, datetime.utcnow(), start=start, end=end, platforms=platforms)
    if built is None:
        raise HTTPException(404, 'Project tidak ditemukan.')
    if not built['posts']:
        raise HTTPException(409, 'Belum ada posting dalam cakupan ini untuk diringkas.')
    ai = get_ai_service()
    if ai is None:
        raise HTTPException(503, 'Ringkasan AI belum tersedia di instalasi ini.')
    await _release(db)
    try:
        async with interactive():
            text = await asyncio.wait_for(ai.generate_text(service.build_prompt(built['data'], req.format), system=service.BASE,
                                                           max_tokens=service.answer_tokens(req.format), context_tokens=service.CONTEXT_TOKENS), timeout=170)
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
                      'from': date_from.isoformat() if date_from else None, 'to': date_to.isoformat() if date_to else None,
                      'platforms': platforms, 'span': built['span']}}
    row = await db.get(PulseSummary, (topic_id, req.format))
    if row is None:
        db.add(PulseSummary(topic_id=topic_id, format=req.format, created_at=now, data=data))
    else:
        row.data, row.created_at = data, now
    await db.flush()
    return {**data, 'sources': await service.with_photos(db, data['sources']), 'created_at': now.isoformat() + 'Z'}

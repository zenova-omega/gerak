"""Posts for the hosted service's batch interface: a big backlog is sent as one batch at 20% off and read back later.

The live workers take the newest posts first; a batch takes the oldest pending ones, so the two never meet. A post in a
batch has the status 'batched' and a lease tag naming its batch; live workers ignore it. Results are read every few
minutes. A post whose answer is missing or unreadable goes back to 'pending'; a batch that was cancelled or expired
returns everything it still held. Nothing here runs unless the hosted background lane is on and the queue is longer
than PULSE_AI_BATCH_MIN_QUEUE (0 switches it off). Each request is the same single-post call as a live one, so a label
read from a batch is the label a live call would have given.
"""
import json
import logging
from datetime import datetime

import httpx
from sqlalchemy import func, select, update

from ..models.pulse import SourceItem
from ..models.pulse_ai_usage import AIBatch
from ..models.pulse_sentiment import SentimentJob
from .pulse_sentiment import PROMPT, _read_one, has_sentiment

log = logging.getLogger('uvicorn.error')
BASE = 'https://api.x.ai/v1'
BATCH_POSTS = 2000        # posts in one batch
ADD_CHUNK = 200           # requests per call that adds them (the service allows 1,000 such calls per 30 s)
TAG = 'batch:'
TIMEOUT = httpx.Timeout(60, connect=10)


def _headers(settings):
    return {'Authorization': f'Bearer {settings.XAI_API_KEY}'}


def _find(node, wanted):
    """The first value stored under the key `wanted` anywhere inside a nested answer."""
    if isinstance(node, dict):
        if wanted in node:
            return node[wanted]
        for value in node.values():
            found = _find(value, wanted)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = _find(value, wanted)
            if found is not None:
                return found
    return None


def answer_text(result):
    """The model's text from one batch result, whichever shape the service uses for it, or None."""
    def text(node):
        if isinstance(node, dict):
            if node.get('type') == 'output_text' and isinstance(node.get('text'), str):
                return node['text']
            choices = node.get('choices')
            if isinstance(choices, list) and choices and isinstance(choices[0], dict):
                content = (choices[0].get('message') or {}).get('content')
                if isinstance(content, str):
                    return content
            for value in node.values():
                found = text(value)
                if found:
                    return found
        elif isinstance(node, list):
            for value in node:
                found = text(value)
                if found:
                    return found
        return None
    found = text(result)
    return found.strip() if found else None


def request_body(settings, content):
    return {'model': settings.XAI_BULK_MODEL, 'input': [{'role': 'user', 'content': content}], 'instructions': PROMPT,
            'max_output_tokens': 450, 'store': False, 'temperature': 0, 'text': {'format': {'type': 'json_object'}}}


async def _release(db, tag, ids=None):
    """Return the posts a batch held to the queue."""
    query = update(SentimentJob).where(SentimentJob.status == 'batched', SentimentJob.lease_token == tag)
    if ids is not None:
        query = query.where(SentimentJob.item_id.in_(ids))
    await db.execute(query.values(status='pending', lease_token=None, lease_until=None, error='batch_returned', available_at=datetime.utcnow()))


async def submit(session_factory, settings, transport=None, now=None):
    """Send the oldest pending posts as one batch when the queue is long. Returns the batch id or None."""
    from .ai import hosted
    minimum = int(getattr(settings, 'PULSE_AI_BATCH_MIN_QUEUE', 0) or 0)
    if minimum <= 0 or hosted.state() != 'ok':
        return None
    now = now or datetime.utcnow()
    async with session_factory() as db:
        if await db.scalar(select(func.count()).select_from(AIBatch).where(AIBatch.state == 'open')):
            return None        # one open batch at a time
        waiting = await db.scalar(select(func.count()).select_from(SentimentJob).where(SentimentJob.status == 'pending', SentimentJob.available_at <= now))
        if waiting <= minimum:
            return None
        rows = (await db.execute(select(SentimentJob.item_id, SourceItem.text, SourceItem.title, SourceItem.metrics).join(SourceItem, SourceItem.id == SentimentJob.item_id)
                .where(SentimentJob.status == 'pending', SentimentJob.available_at <= now).order_by(SourceItem.crawled_at.asc(), SourceItem.id).limit(BATCH_POSTS))).all()
        work = [(item_id, (text or title or '').strip()[:6000]) for item_id, text, title, metrics in rows
                if (text or title or '').strip() and not has_sentiment(SourceItem(metrics=metrics))]
    if not work:
        return None
    async with httpx.AsyncClient(timeout=TIMEOUT, trust_env=False, transport=transport) as client:
        try:
            created = await client.post(f'{BASE}/batches', json={'name': f'pulse-posts-{now:%Y%m%d-%H%M}'}, headers=_headers(settings))
            created.raise_for_status()
            info = created.json()
            batch_id = info['batch_id']
        except (httpx.HTTPError, KeyError, ValueError):
            return None
        tag = TAG + batch_id
        async with session_factory() as db:
            db.add(AIBatch(id=batch_id, state='open', requests=len(work), created_at=now, expires_at=info.get('expire_time')))
            await db.execute(update(SentimentJob).where(SentimentJob.item_id.in_([item_id for item_id, _ in work]), SentimentJob.status == 'pending')
                             .values(status='batched', lease_token=tag, lease_until=None, attempts=SentimentJob.attempts + 1))
            await db.commit()
        try:
            for start in range(0, len(work), ADD_CHUNK):
                part = work[start:start + ADD_CHUNK]
                added = await client.post(f'{BASE}/batches/{batch_id}/requests', headers=_headers(settings), json={'batch_requests': [
                    {'batch_request_id': item_id, 'batch_request': {'responses': request_body(settings, content)}} for item_id, content in part]})
                added.raise_for_status()
        except httpx.HTTPError:
            try:
                await client.post(f'{BASE}/batches/{batch_id}:cancel', headers=_headers(settings))
            except httpx.HTTPError:
                pass
            async with session_factory() as db:
                await _release(db, tag)
                batch = await db.get(AIBatch, batch_id)
                batch.state = 'closed'
                await db.commit()
            return None
    log.info('batch: %s posts sent in %s', len(work), batch_id)
    return batch_id


async def collect(session_factory, settings, transport=None, now=None):
    """Read what open batches have finished; returns how many posts were labelled."""
    from .ai import hosted
    hosted.set_lane('labels_batch')
    now = now or datetime.utcnow()
    labelled = 0
    async with session_factory() as db:
        open_ids = [row for row in (await db.execute(select(AIBatch.id).where(AIBatch.state == 'open'))).scalars()]
        # Posts that name a batch that is not open any more go back to the queue.
        stray = (await db.execute(select(SentimentJob.item_id, SentimentJob.lease_token).where(SentimentJob.status == 'batched'))).all()
        for tag in {token for _, token in stray if token and token.removeprefix(TAG) not in open_ids}:
            await _release(db, tag)
        await db.commit()
    async with httpx.AsyncClient(timeout=TIMEOUT, trust_env=False, transport=transport) as client:
        for batch_id in open_ids:
            try:
                status = await client.get(f'{BASE}/batches/{batch_id}', headers=_headers(settings))
                if status.status_code == 404:
                    status = None
                else:
                    status.raise_for_status()
            except httpx.HTTPError:
                continue
            info = status.json() if status is not None else {}
            state = info.get('state') or {}
            tag = TAG + batch_id
            token, results = None, []
            if status is not None and (state.get('num_success', 0) or state.get('num_error', 0)):
                try:
                    while True:
                        page = await client.get(f'{BASE}/batches/{batch_id}/results', params={'limit': 1000, **({'pagination_token': token} if token else {})}, headers=_headers(settings))
                        page.raise_for_status()
                        body = page.json()
                        results += body.get('results') or []
                        token = body.get('pagination_token')
                        if not token:
                            break
                except httpx.HTTPError:
                    results = []
            labelled += await _store(session_factory, settings, tag, results, now)
            async with session_factory() as db:
                batch = await db.get(AIBatch, batch_id)
                held = await db.scalar(select(func.count()).select_from(SentimentJob).where(SentimentJob.status == 'batched', SentimentJob.lease_token == tag))
                batch.collected = batch.requests - (held or 0)
                gone = status is None or info.get('cancel_time') or (info.get('expire_time') and str(info['expire_time'])[:10] < now.strftime('%Y-%m-%d'))
                finished = state.get('num_pending') == 0 and state.get('num_requests', 0) > 0
                if gone or finished:
                    await _release(db, tag)     # whatever the batch did not answer is asked again, live
                    batch.state = 'done' if finished and not gone else 'closed'
                await db.commit()
    await hosted.flush(session_factory)
    return labelled


async def _store(session_factory, settings, tag, results, now):
    from .ai import hosted
    stamp = now.isoformat() + 'Z'
    done = 0
    async with session_factory() as db:
        for row in results:
            item_id = row.get('batch_request_id')
            outcome = row.get('batch_result') if isinstance(row.get('batch_result'), dict) else {}
            job = await db.get(SentimentJob, item_id) if isinstance(item_id, str) else None
            if not job or job.status != 'batched' or job.lease_token != tag:
                continue
            item = await db.get(SourceItem, item_id)
            raw = None if outcome.get('error') or outcome.get('error_message') else answer_text(outcome)
            usage = _find(outcome, 'usage')
            if isinstance(usage, dict):
                hosted.record(usage, settings.XAI_BULK_MODEL)
            made = None
            if raw and item is not None and not has_sentiment(item):
                try:
                    content = (item.text or item.title or '').strip()[:6000]
                    made = _read_one(raw, content, len(item.text or item.title or ''), 'grok', settings.XAI_BULK_MODEL, stamp)
                except (ValueError, KeyError, TypeError, json.JSONDecodeError):
                    made = None
            if made:
                item.metrics = {**(item.metrics or {}), 'sentiment': {**made[0], 'batch': True}}
                if made[1]:
                    item.metrics = {**item.metrics, 'emotion': made[1]}
            if item is not None and has_sentiment(item):
                job.status = 'done'; job.error = None; job.finished_at = now
                done += 1
            else:
                job.status = 'failed' if job.attempts >= 3 else 'pending'
                job.error = 'batch_failed'; job.available_at = now
            job.lease_token = None; job.lease_until = None
        await db.commit()
    return done


async def batch_tick(transport=None):
    from ..config import get_settings
    from ..database import async_session
    from .ai import background_mode
    settings = get_settings()
    if background_mode(settings) != 'hosted' or int(getattr(settings, 'PULSE_AI_BATCH_MIN_QUEUE', 0) or 0) <= 0:
        return 'disabled'
    try:
        labelled = await collect(async_session, settings, transport)
        sent = await submit(async_session, settings, transport)
    except Exception:
        log.exception('batch: tick failed')
        return 'failed'
    return {'labelled': labelled, 'sent': sent}

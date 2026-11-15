"""python -m app.pulse_ai_check: what the hosted model costs and how fast it is, on real items, before the queue is switched on.

Sends two waiting posts and one batch of stored comments with the workers' own instructions, and asks one Tanya AI
question, then prints tokens, cost and time for each call and what the waiting queue would cost at that rate.
It writes nothing: no label is stored and no job changes state. About four paid calls in all.
"""
import asyncio
import json
import time
from datetime import datetime

from sqlalchemy import func, select

from .models.pulse import SourceItem, WatchTopic
from .models.pulse_response_analysis import ResponseAnalysisJob
from .models.pulse_sentiment import SentimentJob
from .services.ai import hosted


async def _timed(what, call, read):
    before, started = hosted.usage(), time.monotonic()
    try:
        text = await call
        result = read(text)
    except Exception as failure:      # shown by kind only: a service's own message can carry the key
        text, result = '', f'gagal ({type(failure).__name__})'
    after = hosted.usage()
    return {'what': what, 'seconds': round(time.monotonic() - started, 1), 'result': result,
            **{key: after[key] - before[key] for key in ('input_tokens', 'cached_tokens', 'output_tokens', 'reasoning_tokens')},
            'cost_usd': round(after['cost_usd'] - before['cost_usd'], 6)}


async def measure(session_factory, labels, answers, posts=2):
    """Run the trial calls. Returns {'calls': [...], 'queue': {...}}; reads the database, never writes it."""
    from .services import pulse_response_analysis as comments_worker
    from .services.pulse_chat import ANSWER_TOKENS, CONTEXT_TOKENS, SYSTEM, build_context, build_prompt
    from .services.pulse_listening import parse_sentiment
    from .services.pulse_sentiment import PROMPT
    async with session_factory() as db:
        waiting = (await db.execute(select(SourceItem).join(SentimentJob, SentimentJob.item_id == SourceItem.id)
                   .where(SentimentJob.status == 'pending').order_by(SourceItem.crawled_at.desc(), SourceItem.id).limit(posts))).scalars().all()
        with_comments = None
        # A post that holds at least six stored comments (the sixth exists), newest first.
        has_six = func.json_extract(SourceItem.metrics, '$.comment_snapshot.items[5].text').is_not(None)
        for item in (await db.execute(select(SourceItem).where(has_six).order_by(SourceItem.crawled_at.desc()).limit(20))).scalars():
            rows = [row for row in ((item.metrics or {}).get('comment_snapshot') or {}).get('items') or [] if isinstance(row, dict) and (row.get('text') or '').strip()]
            if len(rows) >= 6:
                with_comments = (item, rows[:8])
                break
        topic = await db.get(WatchTopic, (with_comments[0] if with_comments else waiting[0]).topic_id) if (with_comments or waiting) else None
        context = await build_context(db, topic.id, datetime.utcnow()) if topic else None
        # Plain values are taken while the session is open; nothing below touches the database again.
        texts = [(item.text or item.title or '').strip()[:6000] for item in waiting]
        target = topic.label if topic else ''
        comment_texts = [row['text'] for row in with_comments[1]] if with_comments else []
        queue_posts = await db.scalar(select(func.count()).select_from(SentimentJob).where(SentimentJob.status == 'pending')) or 0
        queue_comments = await db.scalar(select(func.count()).select_from(ResponseAnalysisJob).where(ResponseAnalysisJob.status == 'pending', ResponseAnalysisJob.kind == 'comment')) or 0
        queue_stance = await db.scalar(select(func.count()).select_from(ResponseAnalysisJob).where(ResponseAnalysisJob.status == 'pending', ResponseAnalysisJob.kind == 'post')) or 0
    calls = []
    for content in texts:
        calls.append(await _timed('posting', labels.generate_text(content, system=PROMPT, max_tokens=450), lambda text: parse_sentiment(text)['label']))
    if comment_texts:
        payload = json.dumps({'target': target, 'comments': [{'n': index + 1, 'text': text[:comments_worker.BATCH_TEXT]} for index, text in enumerate(comment_texts)]}, ensure_ascii=False)
        calls.append(await _timed(f'komentar ({len(comment_texts)} sekaligus)', labels.generate_text(payload, system=comments_worker.BATCH_PROMPT, max_tokens=130 * len(comment_texts) + 120),
                                  lambda text: f'{len(comments_worker.parse_batch(text, [False] * len(comment_texts), target))} dari {len(comment_texts)} terbaca'))
    if context:
        prompt = build_prompt(context['context'], 'Apa isu utama dalam 7 hari terakhir?', [])
        calls.append(await _timed('jawaban Tanya AI', answers.generate_text(prompt, system=SYSTEM, max_tokens=ANSWER_TOKENS, context_tokens=CONTEXT_TOKENS),
                                  lambda text: f'{len(text.split())} kata'))
    post_calls = [row for row in calls if row['what'] == 'posting' and row['cost_usd'] > 0]
    batch = next((row for row in calls if row['what'].startswith('komentar') and row['cost_usd'] > 0), None)
    per_post = sum(row['cost_usd'] for row in post_calls) / len(post_calls) if post_calls else 0
    per_comment = batch['cost_usd'] / len(comment_texts) if batch else 0
    return {'calls': calls, 'queue': {'posts': queue_posts, 'post_stance': queue_stance, 'comments': queue_comments,
            'estimated_usd': round((queue_posts + queue_stance) * per_post + queue_comments * per_comment, 4)}}


async def main():
    from .config import get_settings
    from .database import async_session
    from .services.ai import get_ai_service, get_bulk_ai_service
    settings = get_settings()
    if settings.AI_PROVIDER != 'grok' or not settings.XAI_API_KEY:
        print('Belum siap: isi XAI_API_KEY dan AI_PROVIDER=grok di server/.env, lalu jalankan lagi.')
        return
    hosted.reset()
    report = await measure(async_session, get_bulk_ai_service(settings), get_ai_service(settings))
    print(f'{"panggilan":28} {"detik":>6} {"token masuk":>12} {"keluar":>8} {"berpikir":>9} {"USD":>10}  hasil')
    for row in report['calls']:
        print(f'{row["what"]:28} {row["seconds"]:>6} {row["input_tokens"]:>12} {row["output_tokens"]:>8} {row["reasoning_tokens"]:>9} {row["cost_usd"]:>10.6f}  {row["result"]}')
    queue = report['queue']
    print(f'\nAntrean sekarang: {queue["posts"]} posting, {queue["post_stance"]} sikap posting, {queue["comments"]} komentar.')
    print(f'Perkiraan biaya menghabiskan antrean dengan tarif di atas: USD {queue["estimated_usd"]:.2f}.')
    print(f'Paralel {settings.PULSE_AI_PARALLEL} panggilan. Untuk mulai: PULSE_AI_HOSTED_BACKGROUND=true di server/.env, lalu mulai ulang server.')


if __name__ == '__main__':
    asyncio.run(main())

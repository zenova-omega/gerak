"""Analysis never gives up on a text for good.

A job that failed three times rests and then returns to the queue. Failing three times usually says something about the
moment, not the text: the local model was stopped, or the server was restarted mid-answer. Without this, such posts and
comments stayed unanalysed until someone reset them by hand."""
from datetime import timedelta

from sqlalchemy import select, update

RETRY_AFTER = timedelta(hours=2)   # a text that truly cannot be read costs three short attempts every two hours, no more
RETRYABLE = ('inference_failed', 'attempts_exhausted')
BATCH = 200


async def revive_failed(db, model, key, now):
    """Return rested failures to the queue with a fresh set of attempts. `key` is the model's primary-key column.
    Reads first: an UPDATE that changes nothing still takes SQLite's single write lock."""
    rested = (await db.execute(select(key).where(model.status == 'failed', model.error.in_(RETRYABLE),
                                                 model.available_at <= now - RETRY_AFTER).limit(BATCH))).scalars().all()
    if rested:
        await db.execute(update(model).where(key.in_(rested), model.status == 'failed')
                         .values(status='pending', attempts=0, error=None, available_at=now))
    return len(rested)

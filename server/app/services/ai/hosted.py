"""The hosted model lane: is it usable right now, and what has it cost since this server started.

A hosted model is paid by the token and can refuse a call for reasons no retry fixes (a rejected key, an empty
credit). The provider reports that here once, and background labelling stops by itself until the pause ends, instead
of failing every job in the queue against a closed door. One process, one event loop: plain module state is enough.
"""
import contextvars
import time
from datetime import datetime


class AIUnavailable(Exception):
    """The service cannot be used right now. `reason` is 'access' (key or credit: a person has to act) or 'busy'
    (rate limit or outage: it clears by itself). Never carries the service's own message."""

    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


_paused_until = 0.0
_reason = None
_usage = {}
_pending = {}     # (day, lane, model) -> counts not yet written to the database
FIELDS = ('calls', 'input_tokens', 'cached_tokens', 'output_tokens', 'reasoning_tokens', 'cost_ticks')
lane_var = contextvars.ContextVar('hosted_lane', default='answers')   # which kind of work is calling: set by each worker, 'answers' for people's questions


def set_lane(name):
    lane_var.set(name)


def pause(seconds, reason):
    global _paused_until, _reason
    _paused_until, _reason = time.monotonic() + seconds, reason


def state():
    """'ok', 'access' or 'busy'."""
    return _reason if time.monotonic() < _paused_until and _reason else 'ok'


def record(counts, model=None):
    """Add one call's token counts as the service reported them. Cost arrives in ticks: ten billion to the dollar."""
    details_in, details_out = counts.get('input_tokens_details') or {}, counts.get('output_tokens_details') or {}
    for key, value in (('calls', 1), ('input_tokens', counts.get('input_tokens')), ('cached_tokens', details_in.get('cached_tokens')),
                       ('output_tokens', counts.get('output_tokens')), ('reasoning_tokens', details_out.get('reasoning_tokens')),
                       ('cost_ticks', counts.get('cost_in_usd_ticks'))):
        _usage[key] = _usage.get(key, 0) + (value or 0)
        slot = _pending.setdefault((datetime.utcnow().strftime('%Y-%m-%d'), lane_var.get(), model or '-'), dict.fromkeys(FIELDS, 0))
        slot[key] += value or 0


def usage():
    """Totals since the server started (or since `reset`)."""
    return {**{key: _usage.get(key, 0) for key in ('calls', 'input_tokens', 'cached_tokens', 'output_tokens', 'reasoning_tokens')},
            'cost_usd': round(_usage.get('cost_ticks', 0) / 10_000_000_000, 6)}


def reset():
    global _paused_until, _reason
    _paused_until, _reason = 0.0, None
    _usage.clear()
    _pending.clear()


async def flush(session_factory):
    """Add what was counted since the last flush to the day's rows. Called once a round; never raises, and what
    could not be written is kept for the next flush."""
    if not _pending:
        return
    taken = dict(_pending)
    _pending.clear()
    try:
        from ...models.pulse_ai_usage import AIUsageDay
        async with session_factory() as db:
            for (day, lane, model), counts in taken.items():
                row = await db.get(AIUsageDay, f'{day}|{lane}|{model}')
                if row is None:
                    row = AIUsageDay(id=f'{day}|{lane}|{model}', day=day, lane=lane, model=model, **dict.fromkeys(FIELDS, 0))
                    db.add(row)
                for key, value in counts.items():
                    setattr(row, key, (getattr(row, key) or 0) + value)
            await db.commit()
    except Exception:
        for key, counts in taken.items():
            slot = _pending.setdefault(key, dict.fromkeys(FIELDS, 0))
            for name, value in counts.items():
                slot[name] += value

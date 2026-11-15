"""The hosted model lane: is it usable right now, and what has it cost since this server started.

A hosted model is paid by the token and can refuse a call for reasons no retry fixes (a rejected key, an empty
credit). The provider reports that here once, and background labelling stops by itself until the pause ends, instead
of failing every job in the queue against a closed door. One process, one event loop: plain module state is enough.
"""
import time


class AIUnavailable(Exception):
    """The service cannot be used right now. `reason` is 'access' (key or credit: a person has to act) or 'busy'
    (rate limit or outage: it clears by itself). Never carries the service's own message."""

    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


_paused_until = 0.0
_reason = None
_usage = {}


def pause(seconds, reason):
    global _paused_until, _reason
    _paused_until, _reason = time.monotonic() + seconds, reason


def state():
    """'ok', 'access' or 'busy'."""
    return _reason if time.monotonic() < _paused_until and _reason else 'ok'


def record(counts):
    """Add one call's token counts as the service reported them. Cost arrives in ticks: ten billion to the dollar."""
    details_in, details_out = counts.get('input_tokens_details') or {}, counts.get('output_tokens_details') or {}
    for key, value in (('calls', 1), ('input_tokens', counts.get('input_tokens')), ('cached_tokens', details_in.get('cached_tokens')),
                       ('output_tokens', counts.get('output_tokens')), ('reasoning_tokens', details_out.get('reasoning_tokens')),
                       ('cost_ticks', counts.get('cost_in_usd_ticks'))):
        _usage[key] = _usage.get(key, 0) + (value or 0)


def usage():
    """Totals since the server started (or since `reset`)."""
    return {**{key: _usage.get(key, 0) for key in ('calls', 'input_tokens', 'cached_tokens', 'output_tokens', 'reasoning_tokens')},
            'cost_usd': round(_usage.get('cost_ticks', 0) / 10_000_000_000, 6)}


def reset():
    global _paused_until, _reason
    _paused_until, _reason = 0.0, None
    _usage.clear()

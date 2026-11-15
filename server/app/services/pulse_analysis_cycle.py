"""One sequential local inference cycle, giving both queues a turn."""
CAPTIONS_PER_CYCLE = 4   # a comment batch takes about as long as four or five posts; keep post sentiment moving beside it


async def run_cycle(response, caption, kind=None, captions=1):
    """One turn for each queue. `captions` post-sentiment jobs run per turn; `results['caption']` is the first one's outcome."""
    results = {}
    steps = [('response', response)] + [('caption' if index == 0 else f'caption_{index + 1}', caption) for index in range(max(1, captions))]
    for name, worker in steps + ([('kind', kind)] if kind else []):
        try:
            results[name] = await worker()
        except Exception:
            # Do not expose provider bodies; leases/retries remain worker-owned.
            results[name] = 'failed'
    return results


async def hosted_round(parallel, response, caption, kind, budget=50):
    """One scheduler turn on a hosted model: `parallel` lanes work side by side for up to `budget` seconds.

    Each lane keeps taking work until the queues are empty, the time is up, or the service refuses (key, credit, rate
    limit). The text-form worker has no claim of its own, so only the first lane runs it. A hosted model is not shared
    with the answers people wait for, so this does not yield to them."""
    import asyncio
    import time
    from .ai import hosted
    if hosted.state() != 'ok':
        return {'stopped': hosted.state(), 'turns': 0}
    deadline = time.monotonic() + budget

    async def lane(index):
        name, turns = f'hosted-{index}', 0
        while time.monotonic() < deadline and hosted.state() == 'ok':
            results = await run_cycle(lambda: response(name), lambda: caption(name), (lambda: kind(name)) if index == 0 else None, captions=CAPTIONS_PER_CYCLE)
            turns += 1
            if not any(outcome in ('done', 'failed', 'expired', 'stale') for outcome in results.values()):
                break   # nothing left for this lane right now
        return turns
    turns = sum(await asyncio.gather(*(lane(index) for index in range(max(1, parallel)))))
    if turns:
        # One line a round in the server log: the only place spend is visible besides the service's own console.
        import logging
        spent = hosted.usage()
        logging.getLogger('uvicorn.error').info('hosted AI since start: %s calls, %s tokens in, %s out, USD %.4f; lane %s',
                                                spent['calls'], spent['input_tokens'], spent['output_tokens'], spent['cost_usd'], hosted.state())
    return {'stopped': None if hosted.state() == 'ok' else hosted.state(), 'turns': turns}


async def analysis_tick():
    from .pulse_response_analysis import response_tick
    from .pulse_sentiment import sentiment_tick
    from .ai import background_mode
    from .ai.priority import background_allowed
    from ..config import get_settings
    if background_mode() == 'hosted':
        from .pulse_text_kind import text_kind_tick
        return await hosted_round(get_settings().PULSE_AI_PARALLEL, response_tick, sentiment_tick, text_kind_tick)
    if not background_allowed():
        return 'yielded'  # someone is waiting on an answer; the queue keeps its place
    from .pulse_text_kind import text_kind_tick
    return await run_cycle(response_tick, sentiment_tick, text_kind_tick, captions=CAPTIONS_PER_CYCLE)

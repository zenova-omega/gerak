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


async def analysis_tick():
    from .pulse_response_analysis import response_tick
    from .pulse_sentiment import sentiment_tick
    from .ai.priority import background_allowed
    if not background_allowed():
        return 'yielded'  # someone is waiting on an answer; the queue keeps its place
    from .pulse_text_kind import text_kind_tick
    return await run_cycle(response_tick, sentiment_tick, text_kind_tick, captions=CAPTIONS_PER_CYCLE)

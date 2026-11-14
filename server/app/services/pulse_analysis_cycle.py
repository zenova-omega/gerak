"""One sequential local inference cycle, giving both queues a turn."""
async def run_cycle(response, caption):
    results = {}
    for name, worker in [('response', response), ('caption', caption)]:
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
    return await run_cycle(response_tick, sentiment_tick)

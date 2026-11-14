import pytest

@pytest.mark.asyncio
async def test_local_cycle_runs_caption_even_if_response_analysis_fails():
    from app.services.pulse_analysis_cycle import run_cycle
    calls=[]
    async def response():
        calls.append('response')
        raise ValueError('provider body must not leak')
    async def caption():
        calls.append('caption')
        return 'done'
    result=await run_cycle(response,caption)
    assert calls==['response','caption']
    assert result=={'response':'failed','caption':'done'}

@pytest.mark.asyncio
async def test_cycle_preserves_disabled_status_and_processes_both_queues():
    from app.services.pulse_analysis_cycle import run_cycle
    async def disabled(): return 'disabled'
    assert await run_cycle(disabled,disabled)=={'response':'disabled','caption':'disabled'}

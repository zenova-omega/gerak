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


async def test_post_sentiment_gets_several_turns_beside_one_comment_batch():
    from app.services.pulse_analysis_cycle import run_cycle
    order = []
    async def response(): order.append('response'); return 'done'
    async def caption(): order.append('caption'); return 'done' if order.count('caption') < 3 else 'idle'
    async def kind(): order.append('kind'); return 'idle'
    result = await run_cycle(response, caption, kind, captions=3)
    assert order == ['response', 'caption', 'caption', 'caption', 'kind']
    assert result == {'response': 'done', 'caption': 'done', 'caption_2': 'done', 'caption_3': 'idle', 'kind': 'idle'}

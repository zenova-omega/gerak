"""One TikTok keyword search returns only some tens of posts, and a different set for each wording (measured
15 Nov 2026: 56 posts for a six-word query, 81 once every word was also asked for by itself). So a TikTok pull
asks for the whole query and for each of its words, and joins the answers."""
from datetime import date, timedelta
from types import SimpleNamespace

import pytest

from app.services import pulse_backfill, pulse_monitor
from app.services.ingest import xpoz


def post(number, text='isi'):
    return {'url': f'https://www.tiktok.com/@akun/video/{number}', 'text': text}


def provider(answers, calls):
    async def social(query, key, platform, limit=5, **options):
        calls.append((query, platform, options))
        answer = answers.get(query, [])
        if isinstance(answer, Exception):
            raise answer
        return answer
    return social


@pytest.mark.asyncio
async def test_a_tiktok_pull_asks_for_the_query_and_for_each_of_its_words_and_joins_the_answers(monkeypatch):
    calls = []
    monkeypatch.setattr(xpoz, 'fetch_xpoz_social_items', provider({
        'cawapres OR "wakil presiden"': [post(1), post(2)], 'cawapres': [post(2), post(3)], '"wakil presiden"': [post(4)]}, calls))
    items = await xpoz.fetch_xpoz_tiktok_items('cawapres OR "wakil presiden"', 'k', start='2026-11-08', end='2026-11-15')
    assert sorted(item['url'][-1] for item in items) == ['1', '2', '3', '4']
    assert sorted(query for query, _, _ in calls) == ['"wakil presiden"', 'cawapres', 'cawapres OR "wakil presiden"']
    assert all(platform == 'tiktok' and options == {'start': '2026-11-08', 'end': '2026-11-15', 'complete': True} for _, platform, options in calls)


@pytest.mark.asyncio
async def test_a_one_word_query_is_asked_for_once(monkeypatch):
    calls = []
    monkeypatch.setattr(xpoz, 'fetch_xpoz_social_items', provider({'Gibran': [post(1)]}, calls))
    assert len(await xpoz.fetch_xpoz_tiktok_items('Gibran', 'k')) == 1
    assert [query for query, _, _ in calls] == ['Gibran']


@pytest.mark.asyncio
async def test_a_word_that_is_only_part_of_the_query_keeps_only_the_posts_that_match_all_of_it(monkeypatch):
    calls = []
    monkeypatch.setattr(xpoz, 'fetch_xpoz_social_items', provider({
        'gibran AND mundur': [post(1, 'video tanpa kata di keterangannya')],        # the provider's own match is kept as it is
        'gibran': [post(2, 'Gibran diminta mundur'), post(3, 'Gibran meresmikan pasar')]}, calls))
    items = await xpoz.fetch_xpoz_tiktok_items('gibran AND mundur', 'k')
    assert sorted(item['url'][-1] for item in items) == ['1', '2']


@pytest.mark.asyncio
async def test_one_refused_search_does_not_lose_the_others_and_a_pull_with_no_answer_reports_the_refusal(monkeypatch):
    answers = {'a OR b': ValueError('Missing stored-search results'), 'a': [post(1)], 'b': xpoz.XpozToolError('provider_error')}
    monkeypatch.setattr(xpoz, 'fetch_xpoz_social_items', provider(answers, []))
    assert [item['url'][-1] for item in await xpoz.fetch_xpoz_tiktok_items('a OR b', 'k')] == ['1']
    answers['a'] = xpoz.XpozToolError('plan_restricted')
    with pytest.raises(xpoz.XpozToolError, match='plan_restricted'):
        await xpoz.fetch_xpoz_tiktok_items('a OR b', 'k')


@pytest.mark.asyncio
async def test_the_schedule_and_the_archive_pull_use_the_wide_tiktok_search(monkeypatch):
    seen = []

    async def wide(query, key, **options):
        seen.append((query, key, options))
        return [post(1)]
    monkeypatch.setattr(xpoz, 'fetch_xpoz_tiktok_items', wide)
    found = await pulse_monitor.fetch_provider('tiktok', 'a OR b', SimpleNamespace(XPOZ_API_KEY='k'))
    today = date.today()
    assert found == {'items': [post(1)]}
    assert seen == [('a OR b', 'k', {'budget': 150, 'start': (today - timedelta(days=7)).isoformat(), 'end': (today + timedelta(days=1)).isoformat()})]
    await pulse_backfill.fetch_window('tiktok', 'a OR b', 'k', date(2026, 11, 13), date(2026, 11, 13))
    assert seen[1] == ('a OR b', 'k', {'start': '2026-11-13', 'end': '2026-11-13'})


@pytest.mark.asyncio
async def test_the_searches_run_one_after_another_and_stop_at_the_first_too_many_requests(monkeypatch):
    """Three searches at once were answered with HTTP 429 on 15 Nov 2026, and the refusal paused the whole X,
    Instagram and TikTok lane. So: one at a time, and nothing more is asked once the provider says slow down."""
    import httpx
    running, most, asked = 0, 0, []

    async def social(query, key, platform, limit=5, **options):
        nonlocal running, most
        asked.append(query)
        running += 1
        most = max(most, running)
        await __import__('asyncio').sleep(0)
        running -= 1
        if query == 'b':
            raise httpx.HTTPStatusError('429', request=httpx.Request('POST', 'https://provider.invalid'), response=httpx.Response(429))
        return [post(len(asked))]
    monkeypatch.setattr(xpoz, 'fetch_xpoz_social_items', social)
    items = await xpoz.fetch_xpoz_tiktok_items('a OR b OR c', 'k')
    assert most == 1 and asked == ['a OR b OR c', 'a', 'b'] and len(items) == 2


@pytest.mark.asyncio
async def test_a_pull_with_a_time_budget_stops_asking_when_it_is_spent_and_keeps_what_it_has(monkeypatch):
    clock = iter([0, 0, 40, 200])              # read at the start and before each search: the third would start too late
    monkeypatch.setattr(xpoz, '_now', lambda: next(clock))
    monkeypatch.setattr(xpoz, '_turns', {})
    calls = []
    monkeypatch.setattr(xpoz, 'fetch_xpoz_social_items', provider({'a OR b': [post(1)], 'a': [post(2)], 'b': [post(3)]}, calls))
    items = await xpoz.fetch_xpoz_tiktok_items('a OR b', 'k', budget=150)
    assert [query for query, _, _ in calls] == ['a OR b', 'a'] and len(items) == 2


@pytest.mark.asyncio
async def test_a_budgeted_pull_starts_with_a_different_word_each_run_so_every_word_gets_its_turn(monkeypatch):
    monkeypatch.setattr(xpoz, '_turns', {})
    calls = []
    monkeypatch.setattr(xpoz, 'fetch_xpoz_social_items', provider({}, calls))
    for _ in range(2):
        await xpoz.fetch_xpoz_tiktok_items('a OR b OR c', 'k', budget=150)
    assert [query for query, _, _ in calls] == ['a OR b OR c', 'a', 'b', 'c', 'a OR b OR c', 'b', 'c', 'a']

"""The provider's direct answer stops at 100 to 300 rows. Its paging mode returns everything a search matched:
start the search, poll until it is done, then read the remaining pages of the same result table."""
import pytest

from app.services.ingest import xpoz

HEAD = 'id,authorId,authorUsername,text,createdAt,likeCount,replyCount,retweetCount,impressionCount'


def page(ids, *, total_rows, total_pages, table='REQ_fixture'):
    rows = '\n'.join(f'    {n},9,akun{n},"isi {n}",2026-11-13T01:00:00.000Z,5,1,2,100' for n in ids)
    return (f'status: success\ndata:\n  results[{len(ids)}]{{{HEAD}}}:\n{rows}\n  pagination:\n    totalRows: {total_rows}\n'
            f'    totalPages: {total_pages}\n    resultsCount: {len(ids)}\n    pageSize: 100\n    tableName: {table}\n  dataDumpExportOperationId: op_datadump_1')


def running(operation):
    return f'operationId: {operation}\nstatus: running\ntoolName: getTwitterPostsByKeywords'


class Provider:
    """Stands in for the provider: records every call and answers like the real one."""
    def __init__(self, answers):
        self.calls, self.answers = [], answers

    async def rpc(self, client, message):
        if message['method'] == 'initialize':
            return {'protocolVersion': '2025-03-26'}
        if message['method'] != 'tools/call':
            return {}
        params = message['params']
        self.calls.append((params['name'], params['arguments']))
        return {'content': [{'type': 'text', 'text': self.answers.pop(0)}]}


@pytest.fixture
def provider(monkeypatch):
    def install(answers):
        fake = Provider(answers)
        monkeypatch.setattr(xpoz, '_rpc', fake.rpc)
        monkeypatch.setattr(xpoz, 'POLL_SECONDS', 0)
        return fake
    return install


@pytest.mark.asyncio
async def test_a_complete_search_reads_every_page_of_the_result(provider):
    fake = provider([running('op_1'), running('op_1'), page(range(1, 101), total_rows=276, total_pages=3),
                     running('op_2'), page(range(101, 201), total_rows=276, total_pages=3),
                     running('op_3'), page(range(201, 277), total_rows=276, total_pages=3)])
    items = await xpoz.fetch_xpoz_stored_items('kata', 'k', start='2026-11-13', end='2026-11-13', complete=True)
    assert len(items) == 276 and items[0]['url'] == 'https://x.com/i/status/1' and items[-1]['url'] == 'https://x.com/i/status/276'
    names = [name for name, _ in fake.calls]
    assert names == ['getTwitterPostsByKeywords', 'checkOperationStatus', 'checkOperationStatus',
                     'getTwitterPostsByKeywords', 'checkOperationStatus', 'getTwitterPostsByKeywords', 'checkOperationStatus']
    start, more = fake.calls[0][1], fake.calls[3][1]
    assert start['responseType'] == 'paging' and start['startDate'] == '2026-11-13' and 'limit' not in start      # no cap of ours
    assert (more['tableName'], more['pageNumber']) == ('REQ_fixture', 2) and fake.calls[5][1]['pageNumber'] == 3
    assert fake.calls[1][1] == {'operationId': 'op_1'}


@pytest.mark.asyncio
async def test_a_search_that_fits_one_page_asks_for_nothing_more_and_an_empty_one_is_not_an_error(provider):
    fake = provider([running('op_1'), page([7, 8], total_rows=2, total_pages=1)])
    assert len(await xpoz.fetch_xpoz_stored_items('kata', 'k', complete=True)) == 2
    assert len(fake.calls) == 2
    provider([running('op_1'), 'status: success\ndata:\n  results[0]{' + HEAD + '}:\n  pagination:\n    totalRows: 0\n    totalPages: 0\n    tableName: REQ_empty'])
    assert await xpoz.fetch_xpoz_stored_items('kata', 'k', start='2026-11-13', end='2026-11-13', complete=True) == []


@pytest.mark.asyncio
async def test_a_refused_or_failed_search_is_reported_not_swallowed(provider):
    provider([running('op_1'), 'status: failed\nerror: insufficient credit for this request'])
    with pytest.raises(xpoz.XpozToolError) as refused:
        await xpoz.fetch_xpoz_stored_items('kata', 'k', complete=True)
    assert refused.value.code == 'plan_restricted'


@pytest.mark.asyncio
async def test_instagram_and_tiktok_use_the_same_complete_mode(provider):
    head = 'id,username,userId,caption,createdAt,createdAtDate,createdAtTimestamp,likeCount,commentCount,reshareCount,videoPlayCount,codeUrl,imageUrl,profilePicUrl,mediaType'
    row = '    1,akun,9,"isi",2026-11-13T03:00:00.000Z,2026-11-13,2026-11-13T03:00:00.000Z,5,1,0,10,https://www.instagram.com/p/AbC123/,null,null,image'
    fake = provider([running('op_1'), f'status: success\ndata:\n  results[1]{{{head}}}:\n{row}\n  pagination:\n    totalRows: 1\n    totalPages: 1\n    tableName: REQ_ig'])
    items = await xpoz.fetch_xpoz_social_items('kata', 'k', 'instagram', start='2026-11-13', end='2026-11-13', complete=True)
    assert [item['url'] for item in items] == ['https://www.instagram.com/p/AbC123/']
    assert fake.calls[0][0] == 'getInstagramPostsByKeywords' and fake.calls[0][1]['responseType'] == 'paging' and 'limit' not in fake.calls[0][1]


@pytest.mark.asyncio
async def test_a_complete_search_asks_for_fresh_data_and_survives_a_connection_that_never_opened(provider, monkeypatch):
    import httpx
    fake = provider([running('op_1'), page([1], total_rows=1, total_pages=1)])
    monkeypatch.setattr(xpoz, 'CONNECT_PAUSE', 0)
    real, failures = fake.rpc, [httpx.ConnectError('tls'), httpx.ConnectTimeout('slow')]

    async def flaky(client, message):
        if message.get('method') == 'tools/call' and failures:
            raise failures.pop(0)        # nothing reached the provider, so nothing was charged: asking again is safe
        return await real(client, message)
    monkeypatch.setattr(xpoz, '_rpc', flaky)
    items = await xpoz.fetch_xpoz_stored_items('kata', 'k', complete=True)
    assert len(items) == 1 and not failures
    assert fake.calls[0][1]['forceLatest'] is True      # measured: more rows for the same price than the stored answer

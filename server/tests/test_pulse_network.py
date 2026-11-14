from app.services.pulse_network import analyze_network


def post(id, author, text, date='2026-11-10T10:00:00', platform='x'):
    return dict(id=id, author=author, text=text, title=text, published_at=date,
                platform=platform, url=f'https://example.com/{id}', metrics={'engagement': 10})


def test_mentions_are_directed_deduplicated_and_not_repost_claims():
    result = analyze_network([post('1', 'Alice', '@Bob @bob @Alice hello'), post('2', 'Bob', 'other content')])
    edges = result['edges']
    assert len(edges) == 1
    assert edges[0]['source'] == 'x:alice' and edges[0]['target'] == 'x:bob'
    assert edges[0]['kind'] == 'mention' and edges[0]['count'] == 1
    assert edges[0]['evidence'][0]['id'] == '1'


def test_narrative_chronology_is_not_causal_and_missing_dates_not_origin():
    text = 'laporan investigasi penting tentang keamanan komunikasi publik sedang dibahas bersama'
    data = analyze_network([post('2', 'Later', text, '2026-11-10T12:00:00'), post('1', 'Early', text), post('3', 'Unknown', text, None)])
    narrative = data['narratives'][0]
    assert narrative['first_observed']['author'] == 'Early'
    assert narrative['account_count'] == 3
    assert narrative['later_accounts'] == 1
    assert all(e['kind'] != 'repost' for e in data['edges'])
    assert data['earliest'][0]['id'] == '1'


def test_sparse_accounts_never_get_authentic_or_bot_label():
    result = analyze_network([post('1', 'A', 'a')])
    assert result['accounts'][0]['assessment'] == 'insufficient_data'
    assert result['accounts'][0]['signals'] == []


def test_repetition_and_burst_are_explained_signals_not_probability():
    rows = [post(str(i), 'A', 'pesan berulang yang sama persis untuk publik hari ini', f'2026-11-10T10:0{i}:00') for i in range(5)]
    account = analyze_network(rows)['accounts'][0]
    assert account['assessment'] == 'review_signals'
    assert {s['kind'] for s in account['signals']} == {'repetition', 'burst'}
    assert 'bot_probability' not in account


def test_empty_input_and_description_mentions_do_not_create_relationships():
    assert analyze_network([])['nodes'] == []
    assert analyze_network([post('1', 'Channel', 'subscribe @someone', platform='youtube')])['edges'] == []

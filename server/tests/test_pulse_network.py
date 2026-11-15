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
    assert account['pattern'] == 'amplification'   # two different behaviours: a named pattern, still no probability
    assert 'bot_probability' not in account


def test_empty_input_and_description_mentions_do_not_create_relationships():
    assert analyze_network([])['nodes'] == []
    assert analyze_network([post('1', 'Channel', 'subscribe @someone', platform='youtube')])['edges'] == []


def test_repeated_content_adds_up_the_numbers_its_posts_report():
    text = 'laporan investigasi penting tentang keamanan komunikasi publik sedang dibahas bersama'
    rows = [post('1', 'Early', text), post('2', 'Later', text, '2026-11-10T12:00:00'), post('3', 'Third', text, '2026-11-10T13:00:00')]
    rows[0]['metrics'] = {'engagement': 130, 'likes': 100, 'comments': 20, 'shares': 10, 'views': 5000}
    rows[1]['metrics'] = {'engagement': 7, 'likes': 5, 'comments': 2, 'shares': None}      # this source reports no shares or views
    rows[2]['metrics'] = {}
    narrative = analyze_network(rows)['narratives'][0]
    assert narrative['metrics'] == {'likes': 105, 'comments': 22, 'shares': 10, 'views': 5000}
    assert narrative['engagement'] == 137 and narrative['post_count'] == 3
    # A group whose sources report nothing (news) says so instead of showing zeros.
    quiet = analyze_network([post(str(i), f'Media {i}', text, platform='news') | {'metrics': {}} for i in range(3)])['narratives'][0]
    assert quiet['metrics'] == {'likes': None, 'comments': None, 'shares': None, 'views': None}


def test_accounts_carry_the_largest_follower_count_their_posts_report():
    rows = [post('1', 'Big', 'halo @Quiet'), post('2', 'Big', 'lagi'), post('3', 'Big', 'terakhir'), post('4', 'Media', 'berita', platform='news')]
    rows[0]['metrics'] = {'author_followers': 1200}
    rows[1]['metrics'] = {'author_followers': 5400}      # the same account, seen later with more followers
    rows[2]['metrics'] = {'author_followers': None}
    rows[3]['metrics'] = None                              # news carries no follower count
    data = analyze_network(rows)
    nodes = {node['id']: node for node in data['nodes']}
    accounts = {account['id']: account for account in data['accounts']}
    assert nodes['x:big']['followers'] == 5400 and accounts['x:big']['followers'] == 5400
    # Unknown stays unknown: not zero, for a source without the figure and for an account that was only mentioned.
    assert nodes['news:media']['followers'] is None and accounts['news:media']['followers'] is None
    assert nodes['x:quiet']['observed'] is False and nodes['x:quiet']['followers'] is None


def test_follower_counts_that_are_not_counts_are_ignored():
    rows = [post(str(i), 'A', 'teks') for i in range(5)]
    for row, value in zip(rows, [True, -3, float('nan'), float('inf'), '9000']):
        row['metrics'] = {'author_followers': value}
    assert analyze_network(rows)['nodes'][0]['followers'] is None
    rows[0]['metrics'] = {'author_followers': 0}          # a reported zero is a count
    assert analyze_network(rows)['nodes'][0]['followers'] == 0


def test_one_account_by_account_v1_in_nodes_mentions_and_narratives():
    """account_v1: the same X handle written two ways, a renamed YouTube channel and a Threads account with an id on one
    row only are one account each; a mention reaches the account in any letter case; a blank name is no account; the
    label is the most recently published name, whatever order the posts come in."""
    thread = 'warga solo membahas jadwal pemadaman listrik bergilir di kota minggu ini'
    rows = [post('2', '@okezonenews', 'kabar terbaru hari ini', '2026-11-11T08:00:00'), post('1', 'Okezonenews', 'kabar kemarin', '2026-11-10T08:00:00'),
            post('3', 'Pembaca', 'kata @OkezoneNews soal ini'),
            post('5', 'Kanal Baru', 'video dua', '2026-11-12T08:00:00', platform='youtube') | {'metrics': {'author_id': 'UC1'}},
            post('4', 'Kanal Lama', 'video satu', '2026-11-09T08:00:00', platform='youtube') | {'metrics': {'author_id': 'UC1'}},
            post('6', '@Warga.Solo', thread, '2026-11-12T08:00:00', platform='threads') | {'metrics': {'author_id': '1789'}},
            post('7', 'warga.solo', thread, '2026-11-08T08:00:00', platform='threads'),
            post('8', 'Tetangga', thread, '2026-11-13T08:00:00', platform='threads'),
            post('9', '  ', 'tanpa nama @Pembaca')]
    data = analyze_network(rows)
    assert {n['id']: n['label'] for n in data['nodes']} == {'x:okezonenews': '@okezonenews', 'x:pembaca': 'Pembaca', 'youtube:UC1': 'Kanal Baru',
                                                          'threads:warga.solo': '@Warga.Solo', 'threads:tetangga': 'Tetangga'}
    assert [(e['source'], e['target']) for e in data['edges'] if e['kind'] == 'mention'] == [('x:pembaca', 'x:okezonenews')]
    assert {a['id']: a['posts'] for a in data['accounts']} == {'x:okezonenews': 2, 'x:pembaca': 1, 'youtube:UC1': 2, 'threads:warga.solo': 2, 'threads:tetangga': 1}
    assert data['narratives'][0]['account_count'] == 2



def test_interaction_totals_carry_their_post_count_and_stay_unknown_when_none_is_known():
    """interactions_v1 totals in the network payload: the sum over the posts whose interactions are known, with
    `interaction_posts`; a narrative or account where no post reports any interaction is unknown, count 0."""
    text = 'laporan investigasi penting tentang keamanan komunikasi publik sedang dibahas bersama'
    rows = [post('1', 'Early', text), post('2', 'Later', text, '2026-11-10T12:00:00'), post('3', 'Third', text, '2026-11-10T13:00:00')]
    rows[0]['metrics'] = {'likes': '12'}
    rows[1]['metrics'] = {'views': 4, 'engagement': 8}
    rows[2]['metrics'] = {'likes': True, 'comments': 2.5}
    data = analyze_network(rows)
    narrative = data['narratives'][0]
    assert (narrative['engagement'], narrative['interaction_posts']) == (20, 2)
    accounts = {a['label']: a for a in data['accounts']}
    assert (accounts['Third']['engagement'], accounts['Third']['interaction_posts']) == (None, 0)
    assert (accounts['Early']['engagement'], accounts['Early']['interaction_posts']) == (12, 1)
    quiet = analyze_network([post(str(i), f'Media {i}', text) | {'metrics': {'views': 3}} for i in range(3)])['narratives'][0]
    assert (quiet['engagement'], quiet['interaction_posts']) == (None, 0)

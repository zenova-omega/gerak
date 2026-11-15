from datetime import datetime
import pytest
from app.models.pulse import SourceItem, WatchTopic
from app.services import pulse_summary as service


def test_sections_are_parsed_and_only_cited_codes_are_returned():
    text = '### Awal\nMuncul 1 Nov oleh akun_a [A1].\n### Yang dibicarakan\n- Soal izin [N1]\n* Soal biaya [K2]\n**tebal** tanpa judul\n'
    sections = service.parse_sections(text)
    assert [s['title'] for s in sections] == ['Awal', 'Yang dibicarakan']
    assert sections[1]['bullets'] == ['Soal izin [N1]', 'Soal biaya [K2]'] and sections[1]['paragraphs'] == ['tebal tanpa judul']
    assert service.parse_sections('tanpa judul sama sekali')[0]['title'] == 'Ringkasan'
    assert [s['kind'] for s in sections] == ['start', 'talk'] and service.section_kind('Kenapa orang marah') == 'anger' and service.section_kind('Lain') == 'text' and service.section_kind('Pemicu sentimen negatif') == 'anger' and service.section_kind('Perlu diperhatikan') == 'watch'
    assert service.parse_sections('### Sentimen\nNegatif 26% dari 1040 posting [SENTIMEN UNTUK DIKUTIP] [N1].')[0]['paragraphs'] == ['Negatif 26% dari 1040 posting [N1].']
    sources = {'A1': {'code': 'A1'}, 'N1': {'code': 'N1'}, 'P9': {'code': 'P9'}}
    assert [s['code'] for s in service.cited(text + ' [X1] [A1]', sources)] == ['A1', 'N1']


@pytest.mark.asyncio
async def test_summary_input_names_the_earliest_posts_negative_posts_and_top_comments(db):
    topic = WatchTopic(label='Ringkas', query='ringkas')
    db.add(topic)
    await db.flush()
    db.add_all([
        SourceItem(topic_id=topic.id, source='x', platform='x', url='https://x.com/a/status/1', author='akun_awal', text='Kabar pertama',
                   published_at=datetime(2026, 11, 1, 2), metrics={'likes': 3, 'sentiment': {'label': 'neutral'}}),
        SourceItem(topic_id=topic.id, source='x', platform='x', url='https://x.com/b/status/2', author='akun_marah', text='Ini keterlaluan',
                   published_at=datetime(2026, 11, 3, 2), metrics={'likes': 900, 'sentiment': {'label': 'negative', 'reason': 'kecewa'},
                                                                   'comment_snapshot': {'status': 'success', 'items': [{'id': 'c', 'author': 'w', 'text': 'Setuju, parah', 'likes': 40}]}}),
    ])
    await db.flush()
    built = await service.build_summary_input(db, topic.id, datetime(2026, 11, 5))
    assert built['posts'] == 2 and built['comments'] == 1
    assert '- A1 akun_awal' in built['data'] and '- N1 akun_marah' in built['data'] and 'catatan analisis: kecewa' in built['data']
    assert '- K1 40 suka' in built['data'] and built['sources']['K1']['text'] == 'Setuju, parah'
    facts = built['facts']
    assert facts['sentiment'] == {'positive': 0, 'neutral': 1, 'negative': 1, 'unknown': 0, 'analysed': 2} and facts['totals']['posts'] == 2
    assert facts['first']['author'] == 'akun_awal' and facts['peak_day']['posts'] == 1 and facts['quotes'][0]['text'] == 'Setuju, parah' and len(facts['days']) == 2
    assert facts['triggers'][0]['author'] == 'akun_marah' and facts['triggers'][0]['reason'] == 'kecewa'
    assert service.build_prompt(built['data'], 'timeline').endswith('Tulis ringkasannya sekarang.')
    assert await service.build_summary_input(db, 'tidak-ada', datetime(2026, 11, 5)) is None


@pytest.mark.asyncio
async def test_summary_input_reads_unknown_interactions_as_unknown_never_zero(db):
    """interactions_v1 in the summary: a post whose source reports no interaction is unknown, in the data the model
    reads and in the facts the infographics draw; known interactions rank first, as everywhere else."""
    topic = WatchTopic(label='Ringkas tanpa angka', query='ringkas')
    db.add(topic)
    await db.flush()
    db.add_all([
        SourceItem(topic_id=topic.id, source='news', platform='news', url='https://berita.example/a', author='Portal', text='Berita pertama',
                   published_at=datetime(2026, 11, 1, 2), metrics={'sentiment': {'label': 'negative', 'reason': 'kritik'}}),
        SourceItem(topic_id=topic.id, source='x', platform='x', url='https://x.com/b/status/2', author='akun_kecil', text='Tidak setuju',
                   published_at=datetime(2026, 11, 2, 2), metrics={'likes': 4, 'sentiment': {'label': 'negative', 'reason': 'kecewa'}}),
    ])
    await db.flush()
    built = await service.build_summary_input(db, topic.id, datetime(2026, 11, 5))
    data, facts = built['data'], built['facts']
    assert '- A1 Portal | news | terbit' in data and '- A1 Portal' in data
    assert [line for line in data.splitlines() if line.startswith('- A1 ')][0].count('interaksi tidak diketahui') == 1
    assert 'interaksi 0' not in data
    # The post with known interactions comes first among the negative ones, however small its number.
    assert data.index('- N1 akun_kecil') < data.index('- N2 Portal')
    assert facts['totals']['interactions'] == 4
    assert [row['interactions'] for row in facts['triggers']] == [4, None]
    assert [(row['author'], row['interactions']) for row in facts['accounts']] == [('akun_kecil', 4), ('Portal', None)]
    assert 'Portal (news) 1 posting, interaksi tidak diketahui' in data

    nothing = WatchTopic(label='Tanpa interaksi', query='kosong')
    db.add(nothing)
    await db.flush()
    db.add(SourceItem(topic_id=nothing.id, source='news', platform='news', url='https://berita.example/z', author='Portal', text='Berita',
                      published_at=datetime(2026, 11, 1, 2), metrics={}))
    await db.flush()
    assert (await service.build_summary_input(db, nothing.id, datetime(2026, 11, 5)))['facts']['totals']['interactions'] is None


@pytest.mark.asyncio
async def test_summary_route_stores_the_latest_version_and_never_calls_the_model_on_read(client, admin_token, db, monkeypatch):
    from app.services import ai
    # The route ends its transaction before the model answers; tests share one database file, so that commit is not made here.
    async def keep():
        return None
    monkeypatch.setattr(db, 'commit', keep)
    topic = WatchTopic(label='Rute ringkas', query='rute')
    db.add(topic)
    await db.flush()
    db.add(SourceItem(topic_id=topic.id, source='x', platform='x', url='https://x.com/a/status/9', author='akun_awal', text='Kabar', published_at=datetime(2026, 11, 1, 2), metrics={'likes': 3}))
    await db.flush()
    calls = []
    class Fake:
        async def generate_text(self, prompt, system=None, max_tokens=None, context_tokens=None):
            calls.append(prompt)
            return '### Awal\nMuncul 1 Nov oleh akun_awal [A1].'
    monkeypatch.setattr(ai, 'get_ai_service', lambda: Fake())
    headers = {'Authorization': f'Bearer {admin_token}'}
    made = await client.post(f'/api/admin/pulse/topics/{topic.id}/summary', json={'format': 'brief'}, headers=headers)
    assert made.status_code == 200 and made.json()['sections'][0]['title'] == 'Awal' and made.json()['sources'][0]['code'] == 'A1'
    read = await client.get(f'/api/admin/pulse/topics/{topic.id}/summary', headers=headers)
    assert read.status_code == 200 and list(read.json()['summaries']) == ['brief'] and len(calls) == 1
    assert (await client.post(f'/api/admin/pulse/topics/{topic.id}/summary', json={'format': 'lain'}, headers=headers)).status_code == 422


def test_quoted_shares_are_whole_numbers_that_add_up_to_one_hundred():
    from app.services.pulse_summary import whole_shares
    assert whole_shares({'negative': 267, 'neutral': 757, 'positive': 16}) == {'negative': 26, 'neutral': 73, 'positive': 1}   # rounding each gave 101
    assert whole_shares({'negative': 1, 'neutral': 1, 'positive': 1}) == {'negative': 34, 'neutral': 33, 'positive': 33}
    assert whole_shares({'negative': 0, 'neutral': 0, 'positive': 0}) == {'negative': 0, 'neutral': 0, 'positive': 0}


def test_a_summary_stored_before_the_clean_up_rule_is_cleaned_when_read():
    from app.services.pulse_summary import tidy_stored
    stored = {'scope': {'posts': 1329}, 'sources': [{'code': 'A1'}], 'sections': [
        {'title': 'Sentimen', 'kind': 'sentiment', 'bullets': [],
         'paragraphs': ['Sentimen negatif 267 (26%) dari 1040 posting yang sudah dianalisis [SENTIMEN UNTUK DIKUTIP].']},
        {'title': 'Awal', 'kind': 'start', 'paragraphs': ['Muncul 10 Nov oleh detikNews [A1].'], 'bullets': ['Butir dengan bukti [N4][N5].', '[CATATAN]']}]}
    cleaned = tidy_stored(stored)
    assert cleaned['sections'][0]['paragraphs'] == ['Sentimen negatif 267 (26%) dari 1040 posting yang sudah dianalisis.']
    assert cleaned['sections'][1]['paragraphs'] == ['Muncul 10 Nov oleh detikNews [A1].']
    assert cleaned['sections'][1]['bullets'] == ['Butir dengan bukti [N4][N5].']      # a line that was only a label disappears
    assert cleaned['scope'] == {'posts': 1329} and cleaned['sources'] == [{'code': 'A1'}]
    assert stored['sections'][0]['paragraphs'][0].endswith('[SENTIMEN UNTUK DIKUTIP].')   # the stored row itself is not rewritten
    assert tidy_stored({'scope': {}}) == {'scope': {}, 'sections': []}


@pytest.mark.asyncio
async def test_reading_a_stored_summary_never_shows_an_echoed_instruction_label(client, admin_token, db):
    from app.models.pulse_summary import PulseSummary
    topic = WatchTopic(label='Ringkasan lama', query='lama')
    db.add(topic)
    await db.flush()
    db.add(PulseSummary(topic_id=topic.id, format='brief', created_at=datetime(2026, 11, 14, 2, 27), data={
        'scope': {'posts': 1, 'comments': 0}, 'sources': [], 'facts': {},
        'sections': [{'title': 'Sentimen', 'kind': 'sentiment', 'paragraphs': ['Netral 757 (73%) [SENTIMEN UNTUK DIKUTIP].'], 'bullets': []}]}))
    await db.flush()
    read = await client.get(f'/api/admin/pulse/topics/{topic.id}/summary', headers={'Authorization': f'Bearer {admin_token}'})
    assert read.status_code == 200
    assert read.json()['summaries']['brief']['sections'][0]['paragraphs'] == ['Netral 757 (73%).']


INSIGHTS_ANSWER = (
    '### Judul\n'
    'Isu penyadapan memuncak pada 3 Nov dan didominasi nada negatif [A1].\n'
    '### Insight\n'
    '- Percakapan dibuka oleh akun_awal pada 1 Nov [A1]. Posting itu baru mendapat 3 interaksi [A1].\n'
    '- Kemarahan publik paling terlihat di komentar [K1]. Komentar dengan suka terbanyak menyebut kasus ini parah [K1][N1].\n'
    '- Sentimen negatif mencakup separuh posting yang sudah dianalisis [N1].\n'
)


def test_insights_is_a_fourth_format_with_a_headline_three_to_five_bullets_and_its_own_answer_budget():
    assert list(service.FORMATS) == ['brief', 'timeline', 'executive', 'insights']
    prompt = service.build_prompt('DATA\n', 'insights')
    assert '### Judul' in prompt and '### Insight' in prompt and 'tiga sampai lima butir' in prompt and '220 kata' in prompt
    assert 'kode bukti' in prompt
    # A headline and up to five explained bullets do not fit the budget of the short formats.
    assert service.answer_tokens('insights') == 900
    assert [service.answer_tokens(key) for key in ('brief', 'timeline', 'executive')] == [520, 520, 520]
    # The summary card on Ikhtisar keeps its three formats; insights has a page of its own.
    assert service.card_formats() == [{'key': 'brief', 'label': 'Ringkas'}, {'key': 'timeline', 'label': 'Kronologi'}, {'key': 'executive', 'label': 'Eksekutif'}]


def test_an_insights_answer_is_parsed_into_a_headline_and_whole_bullets():
    sections = service.parse_sections(INSIGHTS_ANSWER)
    assert [(s['title'], s['kind']) for s in sections] == [('Judul', 'headline'), ('Insight', 'insights')]
    assert sections[0]['paragraphs'] == ['Isu penyadapan memuncak pada 3 Nov dan didominasi nada negatif [A1].']
    assert len(sections[1]['bullets']) == 3 and sections[1]['bullets'][1].endswith('parah [K1][N1].')
    # A bullet of one lead and three explaining sentences is kept whole: cutting it would drop the evidence codes at its end.
    long = 'Kalimat inti yang cukup panjang untuk sebuah temuan penting [A1]. ' + 'Penjelasan dengan angka, akun dan tanggal dari data yang tersimpan [N1]. ' * 9
    kept = service.parse_sections('### Insight\n- ' + long)[0]['bullets'][0]
    assert len(long.strip()) > 600 and kept == long.strip()


@pytest.mark.asyncio
async def test_insights_are_written_with_the_larger_budget_stored_per_project_and_kept_out_of_the_card_formats(client, admin_token, db, monkeypatch):
    from app.services import ai
    async def keep():
        return None
    monkeypatch.setattr(db, 'commit', keep)
    topic = WatchTopic(label='Rute insight', query='insight')
    db.add(topic)
    await db.flush()
    db.add(SourceItem(topic_id=topic.id, source='x', platform='x', url='https://x.com/a/status/19', author='akun_awal', text='Kabar', published_at=datetime(2026, 11, 1, 2),
                      metrics={'likes': 3, 'sentiment': {'label': 'negative'}, 'comment_snapshot': {'status': 'success', 'items': [{'id': 'c', 'author': 'w', 'text': 'Parah', 'likes': 4}]}}))
    await db.flush()
    calls = []
    class Fake:
        async def generate_text(self, prompt, system=None, max_tokens=None, context_tokens=None):
            calls.append((max_tokens, '### Insight' in prompt))
            return INSIGHTS_ANSWER if '### Insight' in prompt else '### Awal\nMuncul 1 Nov oleh akun_awal [A1].'
    monkeypatch.setattr(ai, 'get_ai_service', lambda: Fake())
    headers = {'Authorization': f'Bearer {admin_token}'}
    url = f'/api/admin/pulse/topics/{topic.id}/summary'
    made = await client.post(url, json={'format': 'insights', 'from': '2026-11-01', 'to': '2026-11-07', 'platforms': ['x']}, headers=headers)
    assert made.status_code == 200, made.text
    body = made.json()
    assert body['format'] == 'insights' and [s['kind'] for s in body['sections']] == ['headline', 'insights'] and len(body['sections'][1]['bullets']) == 3
    assert [s['code'] for s in body['sources']] == ['A1', 'K1', 'N1'] and body['sources'][1]['comment'] is True and body['sources'][1]['id'] == body['sources'][0]['id']
    assert body['scope']['from'] == '2026-11-01' and body['scope']['to'] == '2026-11-07' and body['scope']['platforms'] == ['x'] and body['scope']['posts'] == 1
    assert (await client.post(url, json={'format': 'brief'}, headers=headers)).status_code == 200
    assert calls == [(900, True), (520, False)]
    read = await client.get(url, headers=headers)
    assert read.status_code == 200 and len(calls) == 2            # reading the stored insight never calls the model
    assert sorted(read.json()['summaries']) == ['brief', 'insights']
    assert read.json()['summaries']['insights']['sections'][0]['paragraphs'] == body['sections'][0]['paragraphs']
    assert [row['key'] for row in read.json()['formats']] == ['brief', 'timeline', 'executive']


def test_a_bold_opening_of_an_insight_becomes_its_lead_sentence():
    # The local model tends to open each insight with a bold span: sometimes the whole lead sentence, sometimes a short label.
    text = ('### Insight\n- **Lonjakan interaksi** Isu memuncak pada 8 Nov dengan 767 posting [I1].\n'
            '- **Sentimen negatif mendominasi.** Sebanyak 608 posting bernada negatif [N1].\n'
            '- **Penggerak isu:** Akun orangdalam.update mendapat 317.599 interaksi [P2].\n'
            '- **Lonjakan** - 767 posting baru pada 8 Nov [I1].\n'
            '- **Akun** orangdalam.update menjadi penggerak [P2].\n'
            '- **Presiden** Prabowo disebut di 40 posting [P1].\n'
            '- **608 posting** (50%) bernada negatif [N1].\n'
            '- **Anti**-pemerintah menjadi nada dominan [N2].\n')
    assert service.parse_sections(text)[0]['bullets'] == [
        'Lonjakan interaksi. Isu memuncak pada 8 Nov dengan 767 posting [I1].',
        'Sentimen negatif mendominasi. Sebanyak 608 posting bernada negatif [N1].',
        'Penggerak isu. Akun orangdalam.update mendapat 317.599 interaksi [P2].',
        'Lonjakan. 767 posting baru pada 8 Nov [I1].',
        # Bold on the first word or figure of a sentence is only emphasis: nothing is added to the sentence.
        'Akun orangdalam.update menjadi penggerak [P2].',
        'Presiden Prabowo disebut di 40 posting [P1].',
        '608 posting (50%) bernada negatif [N1].',
        'Anti-pemerintah menjadi nada dominan [N2].']
    # Other sections keep the old rule: the markers are dropped and nothing is added.
    assert service.parse_sections('### Yang dibicarakan\n- **Soal izin** Ramai dibahas [N1]')[0]['bullets'] == ['Soal izin Ramai dibahas [N1]']


@pytest.mark.asyncio
async def test_sources_of_a_stored_summary_come_with_the_account_picture_known_today(client, admin_token, db):
    """The evidence list of AI Insights shows who wrote each cited post. The picture is looked up when the summary is
    read: one kept inside the stored summary would go stale, and the summary is stored without it."""
    from app.models.pulse import SourceItem, WatchTopic
    from app.models.pulse_profiles import PulseAccountProfile
    from app.models.pulse_summary import PulseSummary
    topic = WatchTopic(label='Foto bukti', query='foto')
    db.add(topic)
    await db.flush()
    on_ig = SourceItem(topic_id=topic.id, source='instagram', platform='instagram', url='https://www.instagram.com/p/AAA/', author='akun.fotonya',
                       text='Posting Instagram', published_at=datetime(2026, 11, 3, 2), metrics={'author_username': 'akun.fotonya', 'likes': 5})
    on_x = SourceItem(topic_id=topic.id, source='x', platform='x', url='https://x.com/akun_x/status/5', author='Akun X',
                      text='Posting X', published_at=datetime(2026, 11, 3, 3), metrics={'author_id': '991', 'likes': 2})
    db.add_all([on_ig, on_x,
                PulseAccountProfile(platform='instagram', key='akun.fotonya', photo_url='https://cdn.example.test/ig.jpg', checked_at=datetime(2026, 11, 4)),
                PulseAccountProfile(platform='x', key='991', photo_url='https://cdn.example.test/x.jpg', checked_at=datetime(2026, 11, 4))])
    await db.flush()
    stored = [{'code': 'P1', 'id': on_ig.id, 'author': 'akun.fotonya', 'platform': 'instagram', 'url': on_ig.url, 'text': 'Posting Instagram'},
              {'code': 'A1', 'id': on_x.id, 'author': 'Akun X', 'platform': 'x', 'url': on_x.url, 'text': 'Posting X'},
              {'code': 'K1', 'id': on_ig.id, 'author': 'warga_biasa', 'platform': 'instagram', 'url': on_ig.url, 'text': 'Setuju', 'comment': True},
              {'code': 'N1', 'id': 'post-that-was-deleted', 'author': 'hilang', 'platform': 'tiktok', 'url': None, 'text': 'Sudah dihapus'}]
    db.add(PulseSummary(topic_id=topic.id, format='insights', created_at=datetime(2026, 11, 5),
                        data={'format': 'insights', 'sections': [{'title': 'Judul', 'kind': 'headline', 'paragraphs': ['Ringkas.'], 'bullets': []}],
                              'facts': {}, 'sources': stored, 'scope': {'posts': 2, 'comments': 1}}))
    await db.flush()
    answer = await client.get(f'/api/admin/pulse/topics/{topic.id}/summary', headers={'Authorization': f'Bearer {admin_token}'})
    assert answer.status_code == 200
    photos = {source['code']: source.get('photo') for source in answer.json()['summaries']['insights']['sources']}
    assert photos == {'P1': 'https://cdn.example.test/ig.jpg', 'A1': 'https://cdn.example.test/x.jpg', 'K1': None, 'N1': None}
    row = await db.get(PulseSummary, (topic.id, 'insights'))
    assert all('photo' not in source for source in row.data['sources']), 'the stored summary is left as it was written'

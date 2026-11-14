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
    assert [s['kind'] for s in sections] == ['start', 'talk'] and service.section_kind('Kenapa orang marah') == 'anger' and service.section_kind('Lain') == 'text'
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
    assert service.build_prompt(built['data'], 'timeline').endswith('Tulis ringkasannya sekarang.')
    assert await service.build_summary_input(db, 'tidak-ada', datetime(2026, 11, 5)) is None


@pytest.mark.asyncio
async def test_summary_route_stores_the_latest_version_and_never_calls_the_model_on_read(client, admin_token, db, monkeypatch):
    from app.services import ai
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

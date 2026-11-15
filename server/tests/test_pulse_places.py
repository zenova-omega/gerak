"""Place names in posts and profile locations, read on the server for what the AI is told.

The app reads them in src/lib/pulsePlaces.js; this reader must agree with it. Both run the cases in
src/lib/pulsePlaces.cases.json, and both load the same lists (a frontend test fails while the server's copy differs).
"""
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services import pulse_places as places
from app.services.pulse_demography import account_origin

CASES = json.loads((Path(__file__).resolve().parents[2] / 'src' / 'lib' / 'pulsePlaces.cases.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('text,expected', CASES['texts'])
def test_a_text_names_the_same_provinces_as_in_the_app(text, expected):
    assert [row['code'] for row in places.places_in(text)] == expected


@pytest.mark.parametrize('text,expected', CASES['locations'])
def test_a_profile_location_names_the_same_province_as_in_the_app(text, expected):
    found = places.province_of_location(text)
    assert (found['code'] if found else None) == expected


@pytest.mark.parametrize('post,expected', CASES['posts'])
def test_a_post_is_read_like_in_the_app(post, expected):
    assert [row['code'] for row in places.post_places(post.get('title'), post.get('text'), post.get('author'))] == expected


def test_the_lists_cover_the_34_provinces_and_a_reading_names_what_it_found():
    assert len(places.PROVINCE_NAMES) == 34 and places.PROVINCE_NAMES['ID-JK'] == 'DKI Jakarta'
    assert places.places_in('Demo mahasiswa di Bandung dan Bekasi ricuh') == [{'code': 'ID-JB', 'name': 'Jawa Barat', 'places': ['Bandung', 'Bekasi']}]
    assert places.province_of_location('Jakarta Selatan, Indonesia') == {'code': 'ID-JK', 'name': 'DKI Jakarta', 'place': 'Jakarta'}
    assert places.places_in(None) == [] and places.province_of_location(None) is None and places.post_places(None, None, None) == []


def item(title, text='', author='Media', platform='news', metrics=None):
    return SimpleNamespace(title=title, text=text, author=author, platform=platform, metrics=metrics or {})


def test_the_summary_for_the_ai_ranks_provinces_and_keeps_the_names_behind_them():
    items = [item('Aksi di Jakarta'), item('Jakarta dan Bandung bergerak'), item('Warga Jakarta menolak', author='Lain'), item('Pernyataan resmi'), item(None, None)]
    summary = places.place_summary(items)
    assert summary == {'posts': 5, 'named': 3, 'provinces': [
        {'code': 'ID-JK', 'name': 'DKI Jakarta', 'posts': 3, 'names': [('Jakarta', 3)]},
        {'code': 'ID-JB', 'name': 'Jawa Barat', 'posts': 1, 'names': [('Bandung', 1)]}]}
    assert places.place_summary([]) == {'posts': 0, 'named': 0, 'provinces': []}


def xpost(author, location=None, published_at='2026-11-03T05:00:00Z'):
    """An X post as the server reads it after attach_profiles: no `author_location` key while the account is not asked."""
    return {'platform': 'x', 'author': author, 'published_at': published_at, 'metrics': {} if location is None else {'author_location': location}}


def test_the_summary_of_profile_locations_counts_accounts_not_posts():
    posts = [xpost('@a1', 'Jakarta'), xpost('@a1', 'Jakarta'), xpost('@a2', 'jkt'), xpost('@a3', 'Bumi'), xpost('@a4', ''),
             xpost('@a5'), xpost('@a6', 'Kota Medan, Sumatera Utara')]      # @a5: not asked yet
    summary = places.location_summary(account_origin(posts))
    assert summary == {'accounts': 6, 'asked': 5, 'located': 4, 'named': 3, 'provinces': [
        {'code': 'ID-JK', 'name': 'DKI Jakarta', 'accounts': 2, 'names': [('Jakarta', 2)]},
        {'code': 'ID-SU', 'name': 'Sumatera Utara', 'accounts': 1, 'names': [('Medan', 1)]}]}
    assert places.location_summary(account_origin([])) == {'accounts': 0, 'asked': 0, 'located': 0, 'named': 0, 'provinces': []}
    # account_origin_v1: one account however its handle is written, and an account without a dated post still counts.
    two = places.location_summary(account_origin([xpost('@Budi', 'Bandung'), xpost('budi'), xpost('@c', 'Medan', published_at=None)]))
    assert (two['accounts'], two['asked'], two['named']) == (2, 2, 2)


DEMOGRAPHY = json.loads((Path(__file__).resolve().parents[2] / 'shared' / 'pulse-demography.cases.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('case', [pytest.param(case, id=case['note']) for case in DEMOGRAPHY['origin']])
def test_the_summary_of_profile_locations_counts_by_account_origin(case):
    """account_origin_v1 is the one rule Tanya AI is told by: on every shared origin case, location_summary's totals and
    province counts are the origin reading's own (the browser checks accountSpread the same way)."""
    origin = account_origin(case['in'])
    summary = places.location_summary(origin)
    assert (summary['accounts'], summary['located'], summary['named'], summary['asked']) == (
        origin['accounts'], origin['with_location'], origin['province_read'], origin['accounts'] - origin['unasked'])
    assert sum(row['accounts'] for row in summary['provinces']) == origin['province_read']
    for province in origin['provinces']:
        assert next(row['accounts'] for row in summary['provinces'] if row['code'] == province['code']) == province['accounts'], province['code']


def test_the_lines_for_the_ai_say_what_the_numbers_are_and_what_they_are_not():
    named = places.place_summary([item('Aksi di Jakarta'), item('Jakarta dan Bandung bergerak'), item('Pernyataan resmi')])
    homes = places.location_summary(account_origin([xpost('@a', 'Jakarta'), xpost('@b')]))
    lines = places.context_lines(named, homes)
    assert lines == [
        'TEMPAT YANG DISEBUT DALAM POSTING (yang dibicarakan, BUKAN lokasi penulis): 2 dari 3 posting menyebut provinsi atau kota | '
        'DKI Jakarta 2 posting (Jakarta 2); Jawa Barat 1 posting (Bandung 1)',
        'LOKASI PROFIL AKUN X (keterangan pemilik akun, BUKAN posisi saat memposting): 1 dari 2 akun X bisa dipetakan, 1 belum diperiksa | DKI Jakarta 1 akun (Jakarta 1)',
    ]
    nothing = places.context_lines(places.place_summary([item('Pernyataan resmi')]), places.location_summary(account_origin([])))
    assert nothing == ['TEMPAT YANG DISEBUT DALAM POSTING: tidak ada posting yang menyebut provinsi atau kota', 'LOKASI PROFIL AKUN X: tidak ada akun X dalam cakupan']
    unasked = places.context_lines(places.place_summary([]), places.location_summary(account_origin([xpost('@a'), xpost('@b')])))
    assert unasked[1] == 'LOKASI PROFIL AKUN X: 2 akun X, lokasi profilnya belum diperiksa'
    # At most eight provinces a line, three names each: the model reads this on every question.
    many = places.place_summary([item('Aksi di ' + city) for city in ('Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Denpasar', 'Pontianak', 'Kupang', 'Ambon', 'Jayapura')])
    assert places.context_lines(many, places.location_summary(account_origin([])))[0].count(' posting (') == 8

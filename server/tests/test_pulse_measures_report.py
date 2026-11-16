"""The before-and-after script (app/pulse_measures_report.py) on a small fixture database: the new figures come from
pulse_measures, `--old` gives the rules as they were before the calculation dictionary, and the database is only read."""
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app import pulse_measures_report as report
from app.config import get_settings
from app.database import Base
from app.models.pulse import SourceItem, WatchTopic

SERVER = Path(__file__).resolve().parents[1]
TODAY, NOW = '2026-11-15', '2026-11-15T15:00:00'

# topic, platform, author, published_at (naive UTC, as stored), metrics
ROWS = [
    ('t1', 'x', '@Okezone', datetime(2026, 11, 14, 18, 30), {'author_id': '1', 'likes': 5, 'comments': 2, 'shares': 1, 'sentiment': {'label': 'positive'}}),
    ('t1', 'x', 'okezone', datetime(2026, 11, 14, 5, 0), {'author_id': '1', 'likes': '7', 'sentiment': {'label': 'Negative'}}),
    ('t1', 'youtube', 'Channel A', datetime(2026, 11, 13), {'author_id': 'UC1', 'engagement': 10, 'sentiment': 'neutral'}),
    ('t1', 'youtube', 'Channel A renamed', datetime(2026, 11, 14, 10, 0), {'author_id': 'UC1', 'likes': 3}),
    ('t1', 'threads', 'budi', datetime(2026, 11, 12, 20, 0), {'author_id': 'T9'}),
    ('t1', 'threads', '@Budi', datetime(2026, 11, 12, 8, 0), {}),
    ('t1', 'reddit', 'Foo', None, {'sentiment': {'label': 'positive'}}),
    ('t1', 'reddit', 'foo', datetime(2026, 11, 10, 1, 0), {}),
    ('t1', 'news', 'Kompas ', datetime(2026, 11, 14, 3, 0), {'sentiment': {'label': 'neutral'}}),
    ('t1', 'news', 'kompas', datetime(2026, 11, 14, 4, 0), {'sentiment': {'label': 'neutral'}}),
]


def build(path, rows, topics=(('t1', 'Proyek Satu'),)):
    """A database with the app's own tables and storage formats (DateTime text, JSON), written once and closed."""
    engine = create_engine(f'sqlite:///{path}')
    Base.metadata.create_all(engine, tables=[WatchTopic.__table__, SourceItem.__table__])
    with Session(engine) as session:
        for topic_id, label in topics:
            session.add(WatchTopic(id=topic_id, label=label, query=label))
        for n, (topic_id, platform, author, published, metrics) in enumerate(rows):
            session.add(SourceItem(topic_id=topic_id, source=platform, platform=platform, url=f'https://example.test/{n}',
                                   author=author, published_at=published, metrics=metrics))
        session.commit()
    engine.dispose()
    return path


@pytest.fixture
def zone_wib(monkeypatch):
    monkeypatch.setattr(get_settings(), 'PULSE_ZONE_OFFSET_MINUTES', 420)
    monkeypatch.setattr(get_settings(), 'PULSE_ZONE_NAME', 'WIB')


@pytest.fixture
def database(tmp_path):
    return build(tmp_path / 'fixture.db', ROWS)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def by_platform(project):
    return {row['platform']: row for row in project['platforms']}


def test_new_figures_follow_the_measures_module(database, zone_wib):
    result = report.collect(database, today=TODAY, now=NOW)
    assert result['rules'] == 'new'
    [project] = result['projects']
    assert (project['label'], project['posts'], project['dated'], project['undated'], project['date_only']) == ('Proyek Satu', 10, 9, 1, 1)
    days = dict((row['day'], row['posts']) for row in project['per_day'])
    assert len(days) == 14 and min(days) == '2026-11-02' and max(days) == TODAY
    # day_v1: 18:30 UTC on the 14th is 01:30 WIB on the 15th; a date-only post stays on its date.
    assert {day: n for day, n in days.items() if n} == {'2026-11-15': 1, '2026-11-14': 4, '2026-11-13': 2, '2026-11-12': 1, '2026-11-10': 1}
    # interactions_v1: a digit string counts, the source's total stands in, unknown is left out and counted.
    assert project['interactions'] == {'value': 28, 'posts': 4}
    # account_v1: one X handle, one YouTube channel by id, one Threads handle, one Reddit handle, one publisher.
    platforms = by_platform(project)
    assert {name: row['accounts'] for name, row in platforms.items()} == {'news': 1, 'reddit': 1, 'threads': 1, 'x': 1, 'youtube': 1}
    assert project['accounts'] == 5
    # Monitor's "days with posts" counts days of the zone.
    assert {name: row['days_with_posts'] for name, row in platforms.items()} == {'news': 1, 'reddit': 1, 'threads': 2, 'x': 2, 'youtube': 2}
    assert (platforms['x']['first_day'], platforms['x']['last_day'], platforms['x']['span_days']) == ('2026-11-14', '2026-11-15', 2)
    # tone_share_v2: shares of every post, "belum dianalisis" the fourth part of the 100.
    tone = project['tone']
    assert (tone['analysed'], tone['unknown'], tone['percent']) == (6, 4, {'positive': 20, 'neutral': 30, 'negative': 10, 'unknown': 40})
    assert project['tone_voice']['public']['percent'] == {'positive': 25, 'neutral': 13, 'negative': 12, 'unknown': 50}
    assert project['tone_voice']['news']['percent'] == {'positive': 0, 'neutral': 100, 'negative': 0, 'unknown': 0}
    # Beranda: seven times 24 hours back from `now`, posts without a date left out.
    assert (project['tone_7d']['analysed'], project['tone_7d']['unknown'], project['tone_7d']['percent']) == (5, 4, {'positive': 11, 'neutral': 33, 'negative': 11, 'unknown': 45})


def test_old_mode_carries_the_rules_from_before(database, zone_wib):
    [project] = report.collect(database, old=True, today=TODAY, now=NOW)['projects']
    platforms = by_platform(project)
    # The day chart already added 7 hours; Monitor counted UTC dates.
    days = {row['day']: row['posts'] for row in project['per_day'] if row['posts']}
    assert days == {'2026-11-15': 1, '2026-11-14': 4, '2026-11-13': 2, '2026-11-12': 1, '2026-11-10': 1}
    assert {name: row['days_with_posts'] for name, row in platforms.items()} == {'news': 1, 'reddit': 1, 'threads': 1, 'x': 1, 'youtube': 2}
    # Numbers only, unknown read as 0, no stand-in: 8 + 0 + 0 + 3, and every post "counted".
    assert project['interactions'] == {'value': 11, 'posts': 10}
    # id-or-name: "budi" with an id and "@Budi" without are two; so are "Foo"/"foo" and "Kompas "/"kompas".
    assert {name: row['accounts'] for name, row in platforms.items()} == {'news': 2, 'reddit': 2, 'threads': 2, 'x': 1, 'youtube': 1}
    assert project['accounts'] == 8
    # tone_share_v1, the rule tone_share_v2 replaced: shares of the analysed posts only, "belum dianalisis" beside them.
    assert project['tone']['percent'] == {'positive': 33, 'neutral': 50, 'negative': 17}
    assert project['tone_7d']['percent'] == {'positive': 20, 'neutral': 60, 'negative': 20}


def test_names_seen_with_and_without_an_id(database, tmp_path, zone_wib):
    result = report.collect(database, today=TODAY, now=NOW)
    names = {row['platform']: row for row in result['names']}
    assert (names['threads']['rows'], names['threads']['rows_with_id'], names['threads']['names_both']) == (2, 1, 1)
    assert names['threads']['keyed_by_id'] is False and names['youtube']['keyed_by_id'] is True
    assert names['youtube']['names_both'] == 0 and result['failed'] == []
    mixed = build(tmp_path / 'mixed.db', [('t1', 'instagram', 'Ani', datetime(2026, 11, 14, 1), {'author_id': 'I1'}),
                                          ('t1', 'instagram', '@ani', datetime(2026, 11, 14, 2), {})])
    assert report.collect(mixed, today=TODAY, now=NOW)['failed'] == ['instagram']


def test_text_and_compare_output_and_exit_status(database, tmp_path, zone_wib, capsys):
    before = digest(database)
    assert report.main([str(database), '--today', TODAY, '--now', NOW]) == 0
    text = capsys.readouterr().out
    assert 'Proyek Satu' in text and 'Interactions: 28 over 4 of 10 posts' in text and 'positif 20% · netral 30% · negatif 10% · belum dianalisis 40% (2 · 3 · 1 · 4) of all 10 posts' in text
    assert report.main([str(database), '--old', '--today', TODAY, '--now', NOW]) == 0
    assert 'unknown read as 0' in capsys.readouterr().out
    assert report.main([str(database), '--compare', '--today', TODAY, '--now', NOW]) == 0
    table = capsys.readouterr().out
    assert '| Accounts, Threads | 2 | 1 |' in table and '| Interactions, total | 11 | 28 |' in table
    assert '| Accounts, YouTube |' not in table   # unchanged figures stay out of the table
    assert '| Tone, all posts, positif | 33% | 20% |' in table and '| Tone, all posts, belum dianalisis | 4 posting | 40% |' in table
    assert '(+7 on 1 post)' in table and 'stands in where it reports none of the three (+10 on 1 post)' in table
    assert report.main([str(database), '--json', '--today', TODAY, '--now', NOW]) == 0
    assert json.loads(capsys.readouterr().out)['projects'][0]['accounts'] == 5
    mixed = build(tmp_path / 'mixed.db', [('t1', 'tiktok', 'Ani', datetime(2026, 11, 14, 1), {'author_id': 'K1'}),
                                          ('t1', 'tiktok', 'ani', datetime(2026, 11, 14, 2), {})])
    assert report.main([str(mixed), '--today', TODAY, '--now', NOW]) == 1
    assert 'tiktok' in capsys.readouterr().err
    assert digest(database) == before   # read only


def test_numbers_have_thousands_separators():
    assert report.number(6506143) == '6,506,143' and report.number(None) == '—'


def test_runs_as_a_module_from_the_command_line(database):
    env = {**os.environ, 'PULSE_ZONE_OFFSET_MINUTES': '420', 'PULSE_ZONE_NAME': 'WIB'}
    done = subprocess.run([sys.executable, '-m', 'app.pulse_measures_report', str(database), '--today', TODAY, '--now', NOW],
                          cwd=SERVER, env=env, capture_output=True, text=True, timeout=120)
    assert done.returncode == 0, done.stderr
    assert 'Proyek Satu' in done.stdout and 'zone +07:00 WIB' in done.stdout

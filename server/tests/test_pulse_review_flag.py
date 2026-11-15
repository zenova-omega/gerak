"""'Perlu ditinjau' marks a reading that may be wrong. A comment that simply takes no side is not one.

Most comments discuss an issue without supporting or opposing anything, and a project named with a single word
("cawapres") gives nothing to side with at all. Marking those for review put the tag on every comment, which made it
useless. The tag now means: the sentiment, or a side that was actually taken, was read with little confidence, or the
text was cut before it was read.
"""
import json
from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_response_analysis import ResponseAnalysisJob
from app.services import pulse_response_analysis as s

TARGET = 'Usulan kenaikan pajak'


def batch(rows, issue=True):
    return json.dumps({'target_is_issue': issue, 'results': rows})


def row(n, stance, stance_confidence, sentiment, sentiment_confidence):
    return {'n': n, 'stance': stance, 'stance_confidence': stance_confidence, 'sentiment': sentiment, 'sentiment_confidence': sentiment_confidence, 'reason': 'Alasan singkat'}


def test_a_comment_that_takes_no_side_is_not_marked_for_review():
    parsed = s.parse_batch(batch([row(1, 'unclear', 0.95, 'neutral', 0.9), row(2, 'supports', 0.6, 'positive', 0.9), row(3, 'unclear', 0.3, 'negative', 0.5)]), [False] * 3, TARGET)
    assert (parsed[1]['stance']['review_needed'], parsed[1]['sentiment']['review_needed']) == (False, False)
    assert parsed[2]['stance']['review_needed'] is True, 'a side taken with little confidence is worth a second look'
    assert (parsed[3]['stance']['review_needed'], parsed[3]['sentiment']['review_needed']) == (False, True)


def test_a_project_name_with_nothing_to_side_with_marks_no_comment_for_review():
    parsed = s.parse_batch(batch([row(1, 'supports', 0.9, 'positive', 0.9)]), [False], 'cawapres')
    assert parsed[1]['stance']['label'] == 'unclear' and parsed[1]['stance']['review_needed'] is False
    assert parsed[1]['sentiment']['review_needed'] is False
    single = s.parse_result(json.dumps({'target_is_issue': True, 'sentiment': {'label': 'positive', 'confidence': 0.9, 'reason': 'Senang'},
                                        'stance': {'label': 'supports', 'confidence': 0.9, 'reason': 'Setuju'}}), 'comment', 'cawapres')
    assert single['stance']['label'] == 'unclear' and single['stance']['review_needed'] is False


def test_a_text_that_was_cut_is_still_marked():
    parsed = s.parse_batch(batch([row(1, 'supports', 0.9, 'positive', 0.9)]), [True], TARGET)
    assert (parsed[1]['stance']['review_needed'], parsed[1]['sentiment']['review_needed']) == (True, True)
    single = s.parse_result(json.dumps({'target_is_issue': True, 'sentiment': {'label': 'neutral', 'confidence': 0.9, 'reason': 'Datar'},
                                        'stance': {'label': 'unclear', 'confidence': 0.9, 'reason': 'Tidak memihak'}}), 'comment', TARGET, truncated=True)
    assert (single['stance']['review_needed'], single['sentiment']['review_needed']) == (False, True)


@pytest.mark.asyncio
async def test_results_stored_under_the_old_rule_are_read_back_under_the_new_one(tmp_path):
    engine = create_async_engine(f'sqlite+aiosqlite:///{tmp_path}/flag.db')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    old = {'stance': {'label': 'unclear', 'confidence': 0.0, 'reason': 'Target terlalu umum', 'review_needed': True},
           'sentiment': {'label': 'neutral', 'confidence': 0.9, 'reason': 'Datar', 'review_needed': False}, 'method': 'response_batch_v1', 'target': 'cawapres'}
    sided = {'stance': {'label': 'opposes', 'confidence': 0.5, 'reason': 'Menolak', 'review_needed': True},
             'sentiment': {'label': 'negative', 'confidence': 0.9, 'reason': 'Kesal', 'review_needed': False}, 'method': 'response_batch_v1', 'target': 'cawapres'}
    async with factory() as db:
        db.add(WatchTopic(id='t', label='cawapres', query='cawapres'))
        await db.flush()
        db.add(SourceItem(id='p', topic_id='t', source='x', platform='x', url='https://x.com/a/status/1', text='', published_at=datetime(2026, 11, 9, 3),
                          metrics={'comment_snapshot': {'items': [{'id': 'c1', 'text': 'Komentar satu'}, {'id': 'c2', 'text': 'Komentar dua'}]}}))
        for key, text, result in (('c1', 'Komentar satu', old), ('c2', 'Komentar dua', sided)):
            db.add(ResponseAnalysisJob(id=s.digest('p', 'comment', key), post_id='p', subject_id=key, kind='comment', status='done',
                                       content_target_hash=s.fingerprint('comment', text, 'cawapres'), finished_at=datetime(2026, 11, 9, 4), result=result))
        await db.commit()
    async with factory() as db:
        first, second = (await s.results(db, 't'))['posts'][0]['comments']
        assert first['stance']['label'] == 'unclear' and first['stance']['review_needed'] is False
        assert second['stance']['review_needed'] is True, 'a side taken with little confidence keeps its mark'
        stored = (await db.get(ResponseAnalysisJob, s.digest('p', 'comment', 'c1'))).result
        assert stored['stance']['review_needed'] is True, 'the stored result is left as it was written'
    await engine.dispose()

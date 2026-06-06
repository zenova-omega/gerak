"""Tests for Pulse issue ranking."""
from datetime import datetime, timedelta
from app.services.ranking import issue_score


def test_more_items_scores_higher():
    now = datetime(2026, 6, 6, 12, 0, 0)
    high = issue_score(10, now, now=now)
    low = issue_score(2, now, now=now)
    assert high > low


def test_more_recent_scores_higher():
    now = datetime(2026, 6, 6, 12, 0, 0)
    recent = issue_score(5, now, now=now)
    old = issue_score(5, now - timedelta(days=5), now=now)
    assert recent > old


def test_score_is_positive():
    now = datetime(2026, 6, 6, 12, 0, 0)
    assert issue_score(1, now, now=now) > 0

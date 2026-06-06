"""Tests for pluggable AI service factory."""
from types import SimpleNamespace
from app.services.ai import get_ai_service


def _settings(**kw):
    base = dict(AI_PROVIDER="claude", ANTHROPIC_API_KEY="", ANTHROPIC_MODEL="claude-haiku-4-5-20251001")
    base.update(kw)
    return SimpleNamespace(**base)


def test_no_key_returns_none():
    assert get_ai_service(_settings()) is None


def test_with_key_returns_provider():
    svc = get_ai_service(_settings(ANTHROPIC_API_KEY="sk-test-123"))
    assert svc is not None
    assert hasattr(svc, "generate_text")
    assert hasattr(svc, "analyze_sentiment")


def test_unknown_provider_returns_none():
    assert get_ai_service(_settings(AI_PROVIDER="nope", ANTHROPIC_API_KEY="sk-test-123")) is None

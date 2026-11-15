"""AI service factory. Returns None when no provider configured (AI optional).

Three engines: `ollama` (a local model on this machine), `grok` (hosted, paid by the token) and `claude` (hosted, used
for single manual calls only). Which one is on is an operations detail and never leaves the server.
"""
from .base import AIService
from .providers.claude import ClaudeAIService


def _settings(settings):
    if settings is None:
        from ...config import get_settings
        settings = get_settings()
    return settings


def _hosted_ready(settings) -> bool:
    return settings.AI_PROVIDER == 'grok' and bool(getattr(settings, 'XAI_API_KEY', ''))


def is_configured(settings=None) -> bool:
    """Can the AI features people use directly (questions, summaries, one-post analysis) answer at all?"""
    settings = _settings(settings)
    return settings.AI_PROVIDER == 'ollama' or _hosted_ready(settings) or (settings.AI_PROVIDER == 'claude' and bool(settings.ANTHROPIC_API_KEY))


def background_mode(settings=None):
    """How background labelling runs: 'local' (one call at a time on this machine), 'hosted' (several calls at once on
    paid tokens) or None (off). Paid labelling needs its own switch: a key alone never starts spending on the queue."""
    settings = _settings(settings)
    if not settings.PULSE_SENTIMENT_ENABLED:
        return None
    if settings.AI_PROVIDER == 'ollama':
        return 'local'
    if _hosted_ready(settings) and getattr(settings, 'PULSE_AI_HOSTED_BACKGROUND', False):
        return 'hosted'
    return None


def get_ai_service(settings=None) -> AIService | None:
    """The engine for answers people wait for."""
    settings = _settings(settings)
    if settings.AI_PROVIDER == "claude" and settings.ANTHROPIC_API_KEY:
        return ClaudeAIService(api_key=settings.ANTHROPIC_API_KEY, model=settings.ANTHROPIC_MODEL)
    if settings.AI_PROVIDER == 'ollama':
        from .providers.ollama import OllamaAIService
        return OllamaAIService(model=settings.OLLAMA_MODEL)
    if _hosted_ready(settings):
        from .providers.grok import GrokAIService
        return GrokAIService(settings.XAI_API_KEY, settings.XAI_MODEL, effort=settings.XAI_REASONING_EFFORT or None)
    return None


def get_bulk_ai_service(settings=None) -> AIService | None:
    """The engine for background labelling. Hosted: a cheaper model that does not reason. Otherwise the same engine."""
    settings = _settings(settings)
    if _hosted_ready(settings):
        from .providers.grok import GrokAIService
        return GrokAIService(settings.XAI_API_KEY, settings.XAI_BULK_MODEL)
    return get_ai_service(settings)

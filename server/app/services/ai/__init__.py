"""AI service factory. Returns None when no provider configured (AI optional)."""
from .base import AIService
from .providers.claude import ClaudeAIService


def get_ai_service(settings=None) -> AIService | None:
    if settings is None:
        from ...config import get_settings
        settings = get_settings()
    if settings.AI_PROVIDER == "claude" and settings.ANTHROPIC_API_KEY:
        return ClaudeAIService(api_key=settings.ANTHROPIC_API_KEY, model=settings.ANTHROPIC_MODEL)
    if settings.AI_PROVIDER == 'ollama':
        from .providers.ollama import OllamaAIService
        return OllamaAIService(model=settings.OLLAMA_MODEL)
    return None

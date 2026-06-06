"""AI service interface — implemented per provider."""


class AIService:
    async def generate_text(self, prompt: str, system: str | None = None, max_tokens: int = 1024) -> str:
        raise NotImplementedError

    async def analyze_sentiment(self, text: str) -> float:
        """Return sentiment in [-1.0, 1.0]."""
        raise NotImplementedError

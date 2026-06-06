"""Anthropic Claude provider."""
from ..base import AIService


class ClaudeAIService(AIService):
    def __init__(self, api_key: str, model: str):
        from anthropic import AsyncAnthropic  # lazy import — keeps AI optional
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def generate_text(self, prompt: str, system: str | None = None, max_tokens: int = 1024) -> str:
        msg = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system or "",
            messages=[{"role": "user", "content": prompt}],
        )
        parts = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
        return "".join(parts).strip()

    async def analyze_sentiment(self, text: str) -> float:
        out = await self.generate_text(
            "Nilai sentimen teks berikut dari -1 (sangat negatif) sampai 1 (sangat positif). "
            "Balas HANYA satu angka desimal.\n\n" + text,
            max_tokens=10,
        )
        try:
            return max(-1.0, min(1.0, float(out.strip().split()[0])))
        except (ValueError, IndexError):
            return 0.0

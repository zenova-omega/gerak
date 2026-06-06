"""Studio: AI caption/narrative + meme text generation (real via AI service, mock fallback)."""
import re
from .ai import get_ai_service

TONE_GUIDE = {
    "positif": "nada positif, optimis, dan mendukung",
    "negatif": "nada kritis dan waspada (kritik faktual yang membangun)",
    "netral": "nada faktual dan netral",
}


def _tone_instruction(tone: str, custom: str | None) -> str:
    if tone == "custom" and custom:
        return custom
    return TONE_GUIDE.get(tone, TONE_GUIDE["netral"])


def mock_captions(prompt: str, tone: str, n: int) -> list[str]:
    base = (prompt or "konten").strip()
    hooks = ["", "Yuk simak: ", "Penting! ", "Update: ", "Tahukah kamu? ", "Bangga: "]
    emoji = {"positif": "💪", "negatif": "⚠️", "netral": "📌", "custom": "✨"}.get(tone, "📌")
    return [f"{emoji} {hooks[i % len(hooks)]}{base} #SINAR #TNIAD".strip() for i in range(max(1, n))]


def _parse_variants(out: str, n: int) -> list[str]:
    variants = []
    for line in out.splitlines():
        s = re.sub(r"^\s*\d+[\.\)]\s*", "", line.strip()).strip("-• ").strip()
        if s:
            variants.append(s)
    return variants[:n]


async def generate_captions(prompt: str, tone: str, n: int, custom: str | None = None) -> list[str]:
    ai = get_ai_service()
    if ai is None:
        return mock_captions(prompt, tone, n)
    instr = _tone_instruction(tone, custom)
    system = "Kamu copywriter media sosial brand. Tulis caption singkat, menarik, siap posting."
    p = (
        f'Buat {n} varian caption media sosial berbeda untuk: "{prompt}".\n'
        f"Gunakan {instr}. Maksimal 2 kalimat per caption, boleh emoji & hashtag.\n"
        f"Balas sebagai daftar bernomor 1..{n}, satu caption per baris, tanpa penjelasan."
    )
    try:
        out = await ai.generate_text(p, system=system, max_tokens=600)
    except Exception:
        return mock_captions(prompt, tone, n)
    return _parse_variants(out, n) or mock_captions(prompt, tone, n)


async def generate_meme(prompt: str, custom: str | None = None) -> dict:
    ai = get_ai_service()
    base = (prompt or "Konten").strip()
    if ai is None:
        top = base[:40]
        return {"caption": f"{top} / #SINAR", "top_text": top, "bottom_text": "#SINAR #TNIAD", "image_url": None}
    system = "Kamu kreator meme. Buat teks meme singkat & catchy."
    p = (
        f'Buat satu meme untuk topik: "{prompt}". '
        "Balas TEPAT dua baris: baris 1 = TOP text, baris 2 = BOTTOM text. "
        "Singkat dan menarik, tanpa label."
    )
    try:
        out = await ai.generate_text(p, system=system, max_tokens=120)
        lines = [l.strip() for l in out.splitlines() if l.strip()]
        top = lines[0] if lines else base[:40]
        bottom = lines[1] if len(lines) > 1 else "#SINAR"
    except Exception:
        top, bottom = base[:40], "#SINAR #TNIAD"
    return {"caption": f"{top} / {bottom}", "top_text": top, "bottom_text": bottom, "image_url": None}

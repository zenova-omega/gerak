"""Deterministic SimHash for near-duplicate detection (no AI needed)."""
import hashlib
import re

_MASK64 = (1 << 64) - 1


def _tokens(text: str) -> list[str]:
    return re.findall(r"\w+", (text or "").lower())


def simhash(text: str) -> str:
    """Return a 16-char hex (64-bit) SimHash of the text."""
    tokens = _tokens(text)
    if not tokens:
        return "0" * 16
    bits = [0] * 64
    for tok in tokens:
        h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16) & _MASK64
        for i in range(64):
            bits[i] += 1 if (h >> i) & 1 else -1
    out = 0
    for i in range(64):
        if bits[i] > 0:
            out |= (1 << i)
    return f"{out:016x}"


def hamming(a: str, b: str) -> int:
    """Hamming distance between two 16-char hex SimHashes."""
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def is_near_duplicate(a: str, b: str, threshold: int = 3) -> bool:
    return hamming(a, b) <= threshold

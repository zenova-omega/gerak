# Admin Command Center — Fase 1 (Pulse Listening) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun Admin Command Center shell + AI Service abstraction (pluggable) + modul **Pulse** (social listening: RSS Google News + Browserless + dedup → dashboard "Top Isu") end-to-end.

**Architecture:** Backend FastAPI menambah package `services/` (dedup, ranking, ai, ingest, pulse, scheduler), 3 model SQLAlchemy (`WatchTopic`, `Issue`, `SourceItem`), dan router `/api/admin/pulse`. Tabel dibuat otomatis via `Base.metadata.create_all` (pola eksisting, tanpa Alembic). Frontend React menambah shell `CommandCenter` (route `/command-center/*`) dengan sidebar 5 modul; hanya Pulse aktif, sisanya "ComingSoon". AI bersifat opsional — Pulse berfungsi penuh tanpa AI key.

**Tech Stack:** FastAPI, SQLAlchemy async, pytest + pytest-asyncio + aiosqlite, httpx, feedparser, APScheduler, anthropic (opsional). React 19 + Vite + Tailwind + react-router-dom 7.

**Spec:** `docs/superpowers/specs/2026-06-06-command-center-pulse-design.md`

---

## File Structure

**Backend (create):**
- `server/app/services/dedup.py` — SimHash + Hamming + near-duplicate
- `server/app/services/ranking.py` — skor Issue
- `server/app/services/ai/__init__.py` — factory `get_ai_service()`
- `server/app/services/ai/base.py` — interface `AIService`
- `server/app/services/ai/providers/__init__.py` — (kosong)
- `server/app/services/ai/providers/claude.py` — provider Anthropic
- `server/app/services/ingest/__init__.py` — (kosong)
- `server/app/services/ingest/rss.py` — parse + fetch Google News RSS
- `server/app/services/ingest/browserless.py` — scrape konten publik
- `server/app/services/pulse.py` — ingest → dedup → issue, crawl, enrich
- `server/app/services/scheduler.py` — APScheduler crawl periodik
- `server/app/models/pulse.py` — `WatchTopic`, `Issue`, `SourceItem`
- `server/app/routers/pulse.py` — endpoint `/api/admin/pulse/*`
- `server/tests/test_pulse_dedup.py`, `test_pulse_ranking.py`, `test_pulse_ai.py`, `test_pulse_ingest.py`, `test_pulse_api.py`

**Backend (modify):**
- `server/requirements.txt` — tambah deps
- `server/app/config.py` — tambah settings AI/Browserless/scheduler
- `server/app/models/__init__.py` — export model pulse
- `server/app/schemas/__init__.py` — schema pulse
- `server/app/main.py` — register router + start scheduler

**Frontend (create):**
- `src/hooks/usePulse.js`
- `src/pages/admin/CommandCenter.jsx`
- `src/components/admin/ComingSoon.jsx`
- `src/components/admin/pulse/PulseDashboard.jsx`
- `src/components/admin/pulse/TopicManager.jsx`
- `src/components/admin/pulse/IssueCard.jsx`

**Frontend (modify):**
- `src/Router.jsx` — route `/command-center/*`

> **Catatan testing:** Backend pakai TDD penuh (pytest sudah ada). Frontend **tidak punya test runner** di project ini, jadi verifikasi frontend = `npm run build` (lulus bundling) + cek render manual di dev server. Menambah Vitest di luar scope Fase 1.

> **Catatan menjalankan pytest:** semua perintah pytest dijalankan dari direktori `server/` (rootdir tempat `app` importable). Contoh: `cd server && python -m pytest tests/test_pulse_dedup.py -v`.

---

## Task 1: Dependencies & Config

**Files:**
- Modify: `server/requirements.txt`
- Modify: `server/app/config.py:5-25`

- [ ] **Step 1: Tambah dependencies**

Tambahkan baris berikut ke akhir `server/requirements.txt`:

```
feedparser==6.0.11
APScheduler==3.10.4
anthropic>=0.39.0
aiosqlite==0.20.0
```

- [ ] **Step 2: Install**

Run: `cd server && pip install -r requirements.txt`
Expected: terinstal tanpa error.

- [ ] **Step 3: Tambah settings**

Di `server/app/config.py`, tambahkan field berikut ke class `Settings` (setelah blok `CORS`, sebelum `class Config`):

```python
    # AI (pluggable; opsional — Pulse jalan tanpa ini)
    AI_PROVIDER: str = "claude"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"

    # Pulse / listening
    BROWSERLESS_API_KEY: str = ""
    BROWSERLESS_BASE: str = "https://chrome.browserless.io"
    PULSE_WEBHOOK_SECRET: str = ""
    ENABLE_SCHEDULER: bool = True
```

- [ ] **Step 4: Commit**

```bash
git add server/requirements.txt server/app/config.py
git commit -m "chore: add pulse deps and config settings"
```

---

## Task 2: Dedup Service (SimHash)

**Files:**
- Create: `server/app/services/dedup.py`
- Test: `server/tests/test_pulse_dedup.py`

- [ ] **Step 1: Tulis test yang gagal**

Buat `server/tests/test_pulse_dedup.py`:

```python
"""Tests for Pulse dedup (SimHash)."""
from app.services.dedup import simhash, hamming, is_near_duplicate


def test_simhash_deterministic():
    a = simhash("TNI gelar bakti sosial di Jakarta")
    b = simhash("TNI gelar bakti sosial di Jakarta")
    assert a == b
    assert len(a) == 16  # 64-bit hex


def test_normalization_makes_near_duplicate():
    # beda kapitalisasi & tanda baca -> token sama -> hamming 0
    a = simhash("TNI Gelar Bakti Sosial!")
    b = simhash("tni gelar bakti sosial")
    assert hamming(a, b) == 0
    assert is_near_duplicate(a, b) is True


def test_distinct_text_not_duplicate():
    a = simhash("TNI gelar bakti sosial di Jakarta")
    b = simhash("Harga kopi lokal naik tajam pekan ini")
    assert hamming(a, b) > 3
    assert is_near_duplicate(a, b) is False


def test_empty_text():
    assert simhash("") == "0" * 16
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd server && python -m pytest tests/test_pulse_dedup.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.dedup'`

- [ ] **Step 3: Implementasi**

Buat `server/app/services/dedup.py`:

```python
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
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd server && python -m pytest tests/test_pulse_dedup.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/app/services/dedup.py server/tests/test_pulse_dedup.py
git commit -m "feat: add SimHash dedup service for Pulse"
```

---

## Task 3: Ranking Service

**Files:**
- Create: `server/app/services/ranking.py`
- Test: `server/tests/test_pulse_ranking.py`

- [ ] **Step 1: Tulis test yang gagal**

Buat `server/tests/test_pulse_ranking.py`:

```python
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
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd server && python -m pytest tests/test_pulse_ranking.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.ranking'`

- [ ] **Step 3: Implementasi**

Buat `server/app/services/ranking.py`:

```python
"""Score issues by volume + recency."""
from datetime import datetime


def issue_score(item_count: int, last_seen_at: datetime, now: datetime | None = None) -> float:
    """Higher = more items and more recent. Recency decays over days."""
    now = now or datetime.utcnow()
    age_hours = max((now - last_seen_at).total_seconds() / 3600.0, 0.0)
    recency = 1.0 / (1.0 + age_hours / 24.0)
    return max(item_count, 1) * recency
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd server && python -m pytest tests/test_pulse_ranking.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add server/app/services/ranking.py server/tests/test_pulse_ranking.py
git commit -m "feat: add Pulse issue ranking service"
```

---

## Task 4: AI Service Abstraction (pluggable)

**Files:**
- Create: `server/app/services/ai/__init__.py`
- Create: `server/app/services/ai/base.py`
- Create: `server/app/services/ai/providers/__init__.py`
- Create: `server/app/services/ai/providers/claude.py`
- Test: `server/tests/test_pulse_ai.py`

- [ ] **Step 1: Tulis test yang gagal**

Buat `server/tests/test_pulse_ai.py`:

```python
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
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd server && python -m pytest tests/test_pulse_ai.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.ai'`

- [ ] **Step 3: Implementasi interface**

Buat `server/app/services/ai/base.py`:

```python
"""AI service interface — implemented per provider."""


class AIService:
    async def generate_text(self, prompt: str, system: str | None = None, max_tokens: int = 1024) -> str:
        raise NotImplementedError

    async def analyze_sentiment(self, text: str) -> float:
        """Return sentiment in [-1.0, 1.0]."""
        raise NotImplementedError
```

Buat `server/app/services/ai/providers/__init__.py` (kosong):

```python
```

Buat `server/app/services/ai/providers/claude.py`:

```python
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
```

Buat `server/app/services/ai/__init__.py`:

```python
"""AI service factory. Returns None when no provider configured (AI optional)."""
from .base import AIService
from .providers.claude import ClaudeAIService


def get_ai_service(settings=None) -> AIService | None:
    if settings is None:
        from ...config import get_settings
        settings = get_settings()
    if settings.AI_PROVIDER == "claude" and settings.ANTHROPIC_API_KEY:
        return ClaudeAIService(api_key=settings.ANTHROPIC_API_KEY, model=settings.ANTHROPIC_MODEL)
    return None
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd server && python -m pytest tests/test_pulse_ai.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add server/app/services/ai server/tests/test_pulse_ai.py
git commit -m "feat: add pluggable AI service abstraction (Claude provider)"
```

---

## Task 5: Pulse Models + Schemas

**Files:**
- Create: `server/app/models/pulse.py`
- Modify: `server/app/models/__init__.py:1-13`
- Modify: `server/app/schemas/__init__.py` (append)

- [ ] **Step 1: Buat model**

Buat `server/app/models/pulse.py`:

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Float, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class WatchTopic(Base):
    __tablename__ = "watch_topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    label: Mapped[str] = mapped_column(String(200))
    query: Mapped[str] = mapped_column(String(500))
    sources: Mapped[list | None] = mapped_column(JSON, default=lambda: ["rss"])
    browserless_targets: Mapped[list | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    crawl_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    last_crawled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    issues = relationship("Issue", back_populates="topic", cascade="all, delete-orphan")
    items = relationship("SourceItem", back_populates="topic", cascade="all, delete-orphan")


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("watch_topics.id"))
    title: Mapped[str] = mapped_column(String(500), default="")
    simhash: Mapped[str] = mapped_column(String(16), default="0000000000000000")
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    sentiment: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    topic = relationship("WatchTopic", back_populates="issues")
    source_items = relationship("SourceItem", back_populates="issue")


class SourceItem(Base):
    __tablename__ = "source_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("watch_topics.id"))
    issue_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("issues.id"), nullable=True)
    source: Mapped[str] = mapped_column(String(20))
    platform: Mapped[str | None] = mapped_column(String(20), nullable=True)
    url: Mapped[str] = mapped_column(String(1000))
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    text: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str | None] = mapped_column(String(200), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    simhash: Mapped[str] = mapped_column(String(16), default="0000000000000000")
    crawled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    topic = relationship("WatchTopic", back_populates="items")
    issue = relationship("Issue", back_populates="source_items")
```

- [ ] **Step 2: Register model** (agar `create_all` membuat tabel)

Di `server/app/models/__init__.py`, tambahkan import setelah baris `from .audit import AuditLog` dan tambahkan ke `__all__`:

```python
from .pulse import WatchTopic, Issue, SourceItem
```

Lalu di list `__all__`, tambahkan elemen:

```python
    "WatchTopic", "Issue", "SourceItem",
```

- [ ] **Step 3: Tambah schemas**

Di akhir `server/app/schemas/__init__.py`, append:

```python
class WatchTopicCreate(BaseModel):
    label: str
    query: str
    sources: list[str] = ["rss"]
    browserless_targets: list[str] | None = None
    crawl_interval_minutes: int = 60


class WatchTopicUpdate(BaseModel):
    label: str | None = None
    query: str | None = None
    sources: list[str] | None = None
    browserless_targets: list[str] | None = None
    is_active: bool | None = None
    crawl_interval_minutes: int | None = None


class N8nItem(BaseModel):
    topic_id: str
    url: str
    title: str | None = None
    text: str = ""
    author: str | None = None
    platform: str | None = "web"
    published_at: datetime | None = None
```

- [ ] **Step 4: Verifikasi import (tabel terdaftar)**

Run: `cd server && python -c "from app.models import WatchTopic, Issue, SourceItem; from app.database import Base; print(sorted(t for t in Base.metadata.tables if t in {'watch_topics','issues','source_items'}))"`
Expected: `['issues', 'source_items', 'watch_topics']`

- [ ] **Step 5: Commit**

```bash
git add server/app/models/pulse.py server/app/models/__init__.py server/app/schemas/__init__.py
git commit -m "feat: add Pulse models (WatchTopic, Issue, SourceItem) and schemas"
```

---

## Task 6: RSS Ingest (parse + fetch)

**Files:**
- Create: `server/app/services/ingest/__init__.py`
- Create: `server/app/services/ingest/rss.py`
- Test: `server/tests/test_pulse_ingest.py` (RSS portion)

- [ ] **Step 1: Tulis test yang gagal**

Buat `server/tests/test_pulse_ingest.py`:

```python
"""Tests for Pulse ingest helpers."""
from app.services.ingest.rss import parse_rss_feed

SAMPLE_RSS = """<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Google News</title>
<item>
  <title>TNI gelar bakti sosial di Jakarta</title>
  <link>https://example.com/a</link>
  <pubDate>Fri, 06 Jun 2026 08:00:00 GMT</pubDate>
  <description>Kegiatan bakti sosial berlangsung lancar.</description>
  <source url="https://news.example.com">News Example</source>
</item>
</channel></rss>"""


def test_parse_rss_returns_items():
    items = parse_rss_feed(SAMPLE_RSS)
    assert len(items) == 1
    it = items[0]
    assert it["url"] == "https://example.com/a"
    assert it["title"] == "TNI gelar bakti sosial di Jakarta"
    assert it["source"] == "rss"
    assert it["platform"] == "news"
    assert it["published_at"] is not None


def test_parse_empty_feed():
    assert parse_rss_feed("<rss><channel></channel></rss>") == []
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd server && python -m pytest tests/test_pulse_ingest.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.ingest'`

- [ ] **Step 3: Implementasi**

Buat `server/app/services/ingest/__init__.py` (kosong):

```python
```

Buat `server/app/services/ingest/rss.py`:

```python
"""Google News RSS ingest."""
import httpx
import feedparser
from datetime import datetime

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"


def parse_rss_feed(xml: str) -> list[dict]:
    feed = feedparser.parse(xml)
    items = []
    for e in feed.entries:
        published = None
        if getattr(e, "published_parsed", None):
            published = datetime(*e.published_parsed[:6])
        source_title = None
        src = getattr(e, "source", None)
        if src is not None:
            source_title = src.get("title") if hasattr(src, "get") else getattr(src, "title", None)
        items.append({
            "source": "rss",
            "platform": "news",
            "url": getattr(e, "link", None),
            "title": getattr(e, "title", None),
            "text": getattr(e, "summary", "") or getattr(e, "title", "") or "",
            "author": source_title,
            "published_at": published,
        })
    return items


async def fetch_rss_items(query: str, lang: str = "id", country: str = "ID") -> list[dict]:
    params = {"q": query, "hl": lang, "gl": country, "ceid": f"{country}:{lang}"}
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as c:
        res = await c.get(GOOGLE_NEWS_RSS, params=params)
        res.raise_for_status()
        return parse_rss_feed(res.text)
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd server && python -m pytest tests/test_pulse_ingest.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add server/app/services/ingest/__init__.py server/app/services/ingest/rss.py server/tests/test_pulse_ingest.py
git commit -m "feat: add Google News RSS ingest"
```

---

## Task 7: Browserless Ingest Helpers

**Files:**
- Create: `server/app/services/ingest/browserless.py`
- Test: `server/tests/test_pulse_ingest.py` (append)

- [ ] **Step 1: Tulis test yang gagal**

Append ke `server/tests/test_pulse_ingest.py`:

```python
from app.services.ingest.browserless import is_allowed, extract_title, extract_text


def test_is_allowed_empty_allowlist_allows_all():
    assert is_allowed("https://anything.com/x", []) is True


def test_is_allowed_matches_domain_and_subdomain():
    allow = ["example.com"]
    assert is_allowed("https://example.com/a", allow) is True
    assert is_allowed("https://news.example.com/a", allow) is True
    assert is_allowed("https://evil.com/a", allow) is False


def test_extract_title_and_text():
    html = "<html><head><title> Berita TNI </title></head><body><script>x=1</script><p>Isi konten.</p></body></html>"
    assert extract_title(html) == "Berita TNI"
    text = extract_text(html)
    assert "Isi konten." in text
    assert "x=1" not in text
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd server && python -m pytest tests/test_pulse_ingest.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.ingest.browserless'`

- [ ] **Step 3: Implementasi**

Buat `server/app/services/ingest/browserless.py`:

```python
"""Browserless.io scrape of public pages."""
import re
import httpx
from urllib.parse import urlparse


def is_allowed(url: str, allowlist: list[str]) -> bool:
    if not allowlist:
        return True
    host = (urlparse(url).hostname or "").lower()
    return any(host == d or host.endswith("." + d) for d in allowlist)


def extract_title(html: str) -> str | None:
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None


def extract_text(html: str) -> str:
    no_script = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", no_script)
    return re.sub(r"\s+", " ", text).strip()


async def scrape_content(url: str, api_key: str, base: str = "https://chrome.browserless.io") -> dict:
    endpoint = f"{base}/content?token={api_key}"
    async with httpx.AsyncClient(timeout=30.0) as c:
        res = await c.post(endpoint, json={"url": url})
        res.raise_for_status()
        html = res.text
    return {
        "source": "browserless",
        "platform": "web",
        "url": url,
        "title": extract_title(html),
        "text": extract_text(html),
    }
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd server && python -m pytest tests/test_pulse_ingest.py -v`
Expected: PASS (5 tests total dalam file ini)

- [ ] **Step 5: Commit**

```bash
git add server/app/services/ingest/browserless.py server/tests/test_pulse_ingest.py
git commit -m "feat: add Browserless scrape helpers with domain allowlist"
```

---

## Task 8: Pulse Core Service (ingest → dedup → issue)

**Files:**
- Create: `server/app/services/pulse.py`
- Test: `server/tests/test_pulse_ingest.py` (append, uses db fixture)

- [ ] **Step 1: Tulis test yang gagal**

Append ke `server/tests/test_pulse_ingest.py`:

```python
import pytest
from app.models.pulse import WatchTopic, Issue, SourceItem
from app.services.pulse import ingest_items
from sqlalchemy import select


@pytest.fixture
async def topic(db):
    t = WatchTopic(id="topic-1", label="Test", query="tni")
    db.add(t)
    await db.flush()
    return t


@pytest.mark.asyncio
async def test_ingest_groups_near_duplicates(db, topic):
    raws = [
        {"source": "rss", "platform": "news", "url": "https://a.com/1",
         "title": "TNI Gelar Bakti Sosial!", "text": ""},
        {"source": "rss", "platform": "news", "url": "https://b.com/2",
         "title": "tni gelar bakti sosial", "text": ""},
        {"source": "rss", "platform": "news", "url": "https://c.com/3",
         "title": "Harga kopi lokal naik tajam", "text": ""},
    ]
    created = await ingest_items(db, topic, raws)
    assert created == 3
    issues = (await db.execute(select(Issue).where(Issue.topic_id == topic.id))).scalars().all()
    assert len(issues) == 2  # 2 near-dup grouped, 1 distinct
    items = (await db.execute(select(SourceItem))).scalars().all()
    assert len(items) == 3


@pytest.mark.asyncio
async def test_ingest_dedupes_same_url(db, topic):
    raw = {"source": "rss", "platform": "news", "url": "https://a.com/x", "title": "Halo", "text": ""}
    first = await ingest_items(db, topic, [raw])
    second = await ingest_items(db, topic, [raw])
    assert first == 1
    assert second == 0
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd server && python -m pytest tests/test_pulse_ingest.py -k ingest_groups -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.pulse'`

- [ ] **Step 3: Implementasi**

Buat `server/app/services/pulse.py`:

```python
"""Pulse core: ingest items, cluster into issues, crawl, enrich."""
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models.pulse import WatchTopic, Issue, SourceItem
from .dedup import simhash, is_near_duplicate
from .ranking import issue_score
from .ai import get_ai_service

NEAR_DUP_THRESHOLD = 3


async def _find_or_create_issue(db: AsyncSession, topic: WatchTopic, sh: str, title: str | None) -> Issue:
    result = await db.execute(select(Issue).where(Issue.topic_id == topic.id))
    for issue in result.scalars().all():
        if is_near_duplicate(issue.simhash, sh, NEAR_DUP_THRESHOLD):
            return issue
    issue = Issue(topic_id=topic.id, title=title or "", simhash=sh)
    db.add(issue)
    await db.flush()
    return issue


async def ingest_items(db: AsyncSession, topic: WatchTopic, items: list[dict]) -> int:
    """Insert new SourceItems, clustering each into an Issue. Returns count inserted."""
    created = 0
    for raw in items:
        url = raw.get("url")
        if not url:
            continue
        existing = await db.execute(
            select(SourceItem).where(SourceItem.topic_id == topic.id, SourceItem.url == url)
        )
        if existing.scalar_one_or_none():
            continue
        combined = f"{raw.get('title') or ''} {raw.get('text') or ''}".strip()
        sh = simhash(combined)
        issue = await _find_or_create_issue(db, topic, sh, raw.get("title"))
        seen_at = raw.get("published_at") or datetime.utcnow()
        db.add(SourceItem(
            topic_id=topic.id, issue_id=issue.id, source=raw["source"],
            platform=raw.get("platform"), url=url, title=raw.get("title"),
            text=raw.get("text", "") or "", author=raw.get("author"),
            published_at=raw.get("published_at"), simhash=sh,
        ))
        issue.item_count += 1
        if seen_at > issue.last_seen_at:
            issue.last_seen_at = seen_at
        issue.score = issue_score(issue.item_count, issue.last_seen_at)
        created += 1
    await db.flush()
    return created


async def crawl_topic(db: AsyncSession, topic: WatchTopic, settings) -> int:
    """Fetch from configured sources and ingest. Network-bound; failures are swallowed per source."""
    from .ingest.rss import fetch_rss_items
    from .ingest.browserless import scrape_content
    total = 0
    sources = topic.sources or ["rss"]
    if "rss" in sources:
        try:
            total += await ingest_items(db, topic, await fetch_rss_items(topic.query))
        except Exception:
            pass
    if "browserless" in sources and settings.BROWSERLESS_API_KEY and topic.browserless_targets:
        scraped = []
        for url in topic.browserless_targets:
            try:
                scraped.append(await scrape_content(url, settings.BROWSERLESS_API_KEY, settings.BROWSERLESS_BASE))
            except Exception:
                continue
        if scraped:
            total += await ingest_items(db, topic, scraped)
    topic.last_crawled_at = datetime.utcnow()
    return total


async def enrich_issue(db: AsyncSession, issue: Issue) -> Issue:
    """Add AI sentiment + summary if an AI provider is configured; otherwise no-op."""
    ai = get_ai_service()
    if ai is None:
        return issue
    items = (await db.execute(
        select(SourceItem).where(SourceItem.issue_id == issue.id).limit(10)
    )).scalars().all()
    blob = "\n".join(f"- {i.title or i.text}" for i in items)[:4000]
    if not blob:
        return issue
    issue.sentiment = await ai.analyze_sentiment(blob)
    issue.summary = await ai.generate_text(
        "Ringkas isu berikut dalam satu kalimat bahasa Indonesia:\n" + blob, max_tokens=120
    )
    return issue
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd server && python -m pytest tests/test_pulse_ingest.py -v`
Expected: PASS (semua test di file ini)

- [ ] **Step 5: Commit**

```bash
git add server/app/services/pulse.py server/tests/test_pulse_ingest.py
git commit -m "feat: add Pulse core ingest/cluster/crawl/enrich service"
```

---

## Task 9: Pulse Router — Topics CRUD

**Files:**
- Create: `server/app/routers/pulse.py`
- Test: `server/tests/test_pulse_api.py`

- [ ] **Step 1: Tulis test yang gagal**

Buat `server/tests/test_pulse_api.py`:

```python
"""Tests for Pulse API."""
import pytest

H = lambda tok: {"Authorization": f"Bearer {tok}"}


@pytest.mark.asyncio
async def test_create_and_list_topic(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={
        "label": "Franchise X", "query": "franchise x",
    }, headers=H(admin_token))
    assert res.status_code == 200
    topic_id = res.json()["id"]

    res = await client.get("/api/admin/pulse/topics", headers=H(admin_token))
    assert res.status_code == 200
    assert any(t["id"] == topic_id for t in res.json())


@pytest.mark.asyncio
async def test_create_topic_requires_admin(client, user_token):
    res = await client.post("/api/admin/pulse/topics", json={
        "label": "X", "query": "x",
    }, headers=H(user_token))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_update_and_delete_topic(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={"label": "A", "query": "a"}, headers=H(admin_token))
    topic_id = res.json()["id"]

    res = await client.put(f"/api/admin/pulse/topics/{topic_id}", json={"is_active": False}, headers=H(admin_token))
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    res = await client.delete(f"/api/admin/pulse/topics/{topic_id}", headers=H(admin_token))
    assert res.status_code == 200

    res = await client.get("/api/admin/pulse/topics", headers=H(admin_token))
    assert all(t["id"] != topic_id for t in res.json())
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd server && python -m pytest tests/test_pulse_api.py -k topic -v`
Expected: FAIL — 404 (router belum terdaftar)

- [ ] **Step 3: Implementasi router (topics + helper dicts)**

Buat `server/app/routers/pulse.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from ..database import get_db
from ..config import get_settings
from ..models.user import User
from ..models.pulse import WatchTopic, Issue, SourceItem
from ..schemas import WatchTopicCreate, WatchTopicUpdate, N8nItem
from ..middleware.auth import require_admin
from ..services.pulse import crawl_topic, ingest_items, enrich_issue

router = APIRouter()


def _topic_dict(t: WatchTopic) -> dict:
    return {
        "id": t.id, "label": t.label, "query": t.query,
        "sources": t.sources, "browserless_targets": t.browserless_targets,
        "is_active": t.is_active, "crawl_interval_minutes": t.crawl_interval_minutes,
        "last_crawled_at": t.last_crawled_at, "created_at": t.created_at,
    }


def _issue_dict(i: Issue) -> dict:
    return {
        "id": i.id, "topic_id": i.topic_id, "title": i.title,
        "item_count": i.item_count, "score": i.score,
        "sentiment": i.sentiment, "summary": i.summary,
        "first_seen_at": i.first_seen_at, "last_seen_at": i.last_seen_at,
    }


@router.get("/topics")
async def list_topics(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(WatchTopic).order_by(WatchTopic.created_at.desc()))
    return [_topic_dict(t) for t in result.scalars().all()]


@router.post("/topics")
async def create_topic(req: WatchTopicCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    topic = WatchTopic(
        label=req.label, query=req.query, sources=req.sources,
        browserless_targets=req.browserless_targets,
        crawl_interval_minutes=req.crawl_interval_minutes, created_by=admin.id,
    )
    db.add(topic)
    await db.flush()
    return _topic_dict(topic)


@router.put("/topics/{topic_id}")
async def update_topic(topic_id: str, req: WatchTopicUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(WatchTopic).where(WatchTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic tidak ditemukan")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    await db.flush()
    return _topic_dict(topic)


@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(WatchTopic).where(WatchTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic tidak ditemukan")
    await db.delete(topic)
    return {"deleted": topic_id}
```

- [ ] **Step 4: Register router**

Di `server/app/main.py`, ubah baris import router (saat ini baris 45) dan tambahkan include. Ganti:

```python
from .routers import auth, missions, users, admin
```

menjadi:

```python
from .routers import auth, missions, users, admin, pulse
```

Dan tambahkan setelah baris `app.include_router(admin.router, ...)`:

```python
app.include_router(pulse.router, prefix="/api/admin/pulse", tags=["pulse"])
```

- [ ] **Step 5: Jalankan test, pastikan lulus**

Run: `cd server && python -m pytest tests/test_pulse_api.py -k topic -v`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add server/app/routers/pulse.py server/app/main.py server/tests/test_pulse_api.py
git commit -m "feat: add Pulse topics CRUD endpoints"
```

---

## Task 10: Pulse Router — Crawl, Issues, Webhook

**Files:**
- Modify: `server/app/routers/pulse.py` (append endpoints)
- Test: `server/tests/test_pulse_api.py` (append)

- [ ] **Step 1: Tulis test yang gagal**

Append ke `server/tests/test_pulse_api.py`:

```python
@pytest.mark.asyncio
async def test_webhook_creates_issue_and_list_issues(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={"label": "T", "query": "t"}, headers=H(admin_token))
    topic_id = res.json()["id"]

    res = await client.post("/api/admin/pulse/webhook/n8n", json={
        "topic_id": topic_id, "url": "https://x.com/1",
        "title": "Berita penting hari ini", "text": "isi",
    })
    assert res.status_code == 200
    assert res.json()["ingested"] == 1

    res = await client.get("/api/admin/pulse/issues", params={"topic_id": topic_id}, headers=H(admin_token))
    assert res.status_code == 200
    issues = res.json()
    assert len(issues) == 1
    issue_id = issues[0]["id"]

    res = await client.get(f"/api/admin/pulse/issues/{issue_id}", headers=H(admin_token))
    assert res.status_code == 200
    assert len(res.json()["source_items"]) == 1


@pytest.mark.asyncio
async def test_webhook_unknown_topic_404(client):
    res = await client.post("/api/admin/pulse/webhook/n8n", json={
        "topic_id": "nope", "url": "https://x.com/2", "title": "x",
    })
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_enrich_without_ai_keeps_sentiment_null(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={"label": "E", "query": "e"}, headers=H(admin_token))
    topic_id = res.json()["id"]
    await client.post("/api/admin/pulse/webhook/n8n", json={
        "topic_id": topic_id, "url": "https://x.com/e1", "title": "isu", "text": "konten",
    })
    issues = (await client.get("/api/admin/pulse/issues", params={"topic_id": topic_id}, headers=H(admin_token))).json()
    issue_id = issues[0]["id"]
    res = await client.post(f"/api/admin/pulse/issues/{issue_id}/enrich", headers=H(admin_token))
    assert res.status_code == 200
    assert res.json()["sentiment"] is None  # no AI key in tests
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd server && python -m pytest tests/test_pulse_api.py -k "webhook or enrich" -v`
Expected: FAIL — 404/405 (endpoints belum ada)

- [ ] **Step 3: Implementasi**

Append ke `server/app/routers/pulse.py`:

```python
@router.post("/topics/{topic_id}/crawl")
async def crawl_now(topic_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(WatchTopic).where(WatchTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic tidak ditemukan")
    count = await crawl_topic(db, topic, get_settings())
    return {"topic_id": topic_id, "ingested": count}


@router.get("/issues")
async def list_issues(
    topic_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = select(Issue)
    if topic_id:
        query = query.where(Issue.topic_id == topic_id)
    query = query.order_by(Issue.score.desc()).limit(limit)
    result = await db.execute(query)
    return [_issue_dict(i) for i in result.scalars().all()]


@router.get("/issues/{issue_id}")
async def get_issue(issue_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue tidak ditemukan")
    items = (await db.execute(
        select(SourceItem).where(SourceItem.issue_id == issue_id).order_by(SourceItem.published_at.desc())
    )).scalars().all()
    data = _issue_dict(issue)
    data["source_items"] = [
        {"id": s.id, "source": s.source, "platform": s.platform, "url": s.url,
         "title": s.title, "author": s.author, "published_at": s.published_at}
        for s in items
    ]
    return data


@router.post("/issues/{issue_id}/enrich")
async def enrich(issue_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue tidak ditemukan")
    await enrich_issue(db, issue)
    await db.flush()
    return _issue_dict(issue)


@router.post("/webhook/n8n")
async def n8n_webhook(
    item: N8nItem,
    x_webhook_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    if settings.PULSE_WEBHOOK_SECRET and x_webhook_secret != settings.PULSE_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Webhook secret tidak valid")
    result = await db.execute(select(WatchTopic).where(WatchTopic.id == item.topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic tidak ditemukan")
    raw = {
        "source": "n8n", "platform": item.platform, "url": item.url,
        "title": item.title, "text": item.text, "author": item.author,
        "published_at": item.published_at,
    }
    created = await ingest_items(db, topic, [raw])
    return {"ingested": created}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd server && python -m pytest tests/test_pulse_api.py -v`
Expected: PASS (semua test API)

- [ ] **Step 5: Commit**

```bash
git add server/app/routers/pulse.py server/tests/test_pulse_api.py
git commit -m "feat: add Pulse crawl/issues/webhook/enrich endpoints"
```

---

## Task 11: Scheduler Wiring

**Files:**
- Create: `server/app/services/scheduler.py`
- Modify: `server/app/main.py:33-36`

- [ ] **Step 1: Implementasi scheduler**

Buat `server/app/services/scheduler.py`:

```python
"""Periodic Pulse crawl via APScheduler."""
from datetime import datetime
from sqlalchemy import select
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from ..database import async_session
from ..config import get_settings
from ..models.pulse import WatchTopic
from .pulse import crawl_topic

scheduler = AsyncIOScheduler()


async def crawl_due_topics():
    settings = get_settings()
    async with async_session() as db:
        topics = (await db.execute(
            select(WatchTopic).where(WatchTopic.is_active == True)  # noqa: E712
        )).scalars().all()
        now = datetime.utcnow()
        for topic in topics:
            due = (
                topic.last_crawled_at is None
                or (now - topic.last_crawled_at).total_seconds() >= topic.crawl_interval_minutes * 60
            )
            if due:
                try:
                    await crawl_topic(db, topic, settings)
                except Exception:
                    pass
        await db.commit()


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(crawl_due_topics, "interval", minutes=5, id="pulse_crawl", replace_existing=True)
        scheduler.start()
```

- [ ] **Step 2: Wire ke startup**

Di `server/app/main.py`, ganti fungsi `startup` (baris 33-36):

```python
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

menjadi:

```python
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if settings.ENABLE_SCHEDULER:
        from .services.scheduler import start_scheduler
        start_scheduler()
```

- [ ] **Step 3: Verifikasi seluruh test backend tetap hijau**

Run: `cd server && python -m pytest -v`
Expected: PASS — semua test (existing + pulse) lulus. (Scheduler tidak aktif di test karena startup event tidak dijalankan oleh ASGITransport.)

- [ ] **Step 4: Verifikasi server boot manual**

Run: `cd server && python -c "from app.main import app; print('boot ok')"`
Expected: `boot ok` tanpa error import.

- [ ] **Step 5: Commit**

```bash
git add server/app/services/scheduler.py server/app/main.py
git commit -m "feat: add APScheduler periodic Pulse crawl"
```

---

## Task 12: Frontend — usePulse Hooks

**Files:**
- Create: `src/hooks/usePulse.js`

- [ ] **Step 1: Implementasi hooks**

Buat `src/hooks/usePulse.js`:

```javascript
import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

// Mock fallback (demo mode saat backend tidak tersedia)
const MOCK_ISSUES = [
  { id: 'm1', topic_id: 't1', title: 'TNI gelar bakti sosial di Jakarta', item_count: 8, score: 7.2, sentiment: 0.6, summary: null, last_seen_at: null },
  { id: 'm2', topic_id: 't1', title: 'Diskusi kebijakan publik pekan ini', item_count: 5, score: 4.1, sentiment: -0.2, summary: null, last_seen_at: null },
];

export function useTopics() {
  const { data, loading, error, refetch } = useApi('/admin/pulse/topics', { defaultData: [] });
  const { mutate } = useMutation();

  const createTopic = useCallback(async (payload) => {
    const r = await mutate(() => api.post('/admin/pulse/topics', payload));
    refetch();
    return r;
  }, [mutate, refetch]);

  const updateTopic = useCallback(async (id, payload) => {
    const r = await mutate(() => api.put(`/admin/pulse/topics/${id}`, payload));
    refetch();
    return r;
  }, [mutate, refetch]);

  const deleteTopic = useCallback(async (id) => {
    const r = await mutate(() => api.delete(`/admin/pulse/topics/${id}`));
    refetch();
    return r;
  }, [mutate, refetch]);

  const crawlNow = useCallback(async (id) => {
    const r = await mutate(() => api.post(`/admin/pulse/topics/${id}/crawl`));
    refetch();
    return r;
  }, [mutate, refetch]);

  return { topics: data || [], loading, error, createTopic, updateTopic, deleteTopic, crawlNow, refetch };
}

export function useIssues({ topicId } = {}) {
  const params = {};
  if (topicId) params.topic_id = topicId;
  const { data, loading, error, refetch } = useApi('/admin/pulse/issues', { params, defaultData: MOCK_ISSUES });
  return { issues: data || [], loading, error, refetch };
}

export async function fetchIssueDetail(issueId) {
  return api.get(`/admin/pulse/issues/${issueId}`);
}
```

- [ ] **Step 2: Verifikasi lint/format (opsional) & commit**

```bash
git add src/hooks/usePulse.js
git commit -m "feat: add usePulse hooks (topics + issues)"
```

---

## Task 13: Frontend — Command Center Shell + Route

**Files:**
- Create: `src/components/admin/ComingSoon.jsx`
- Create: `src/pages/admin/CommandCenter.jsx`
- Modify: `src/Router.jsx`

- [ ] **Step 1: ComingSoon placeholder**

Buat `src/components/admin/ComingSoon.jsx`:

```jsx
import React from 'react';

export default function ComingSoon({ name }) {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mb-2 text-2xl font-black text-[#1B4332]">{name}</div>
        <p className="text-sm text-[#6B6555]">Modul ini akan hadir di fase berikutnya.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Command Center shell**

Buat `src/pages/admin/CommandCenter.jsx`:

```jsx
import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import PulseDashboard from '../../components/admin/pulse/PulseDashboard';
import ComingSoon from '../../components/admin/ComingSoon';

const MODULES = [
  { key: 'pulse', label: 'Pulse', sub: 'Social Listening', path: 'pulse', enabled: true },
  { key: 'studio', label: 'Studio', sub: 'AI Content', path: 'studio', enabled: false },
  { key: 'scheduler', label: 'Scheduler', sub: 'Distribusi', path: 'scheduler', enabled: false },
  { key: 'rally', label: 'Rally', sub: 'Engagement', path: 'rally', enabled: false },
  { key: 'campaigns', label: 'Campaigns', sub: 'Orkestrasi', path: 'campaigns', enabled: false },
];

export default function CommandCenter() {
  return (
    <div className="flex min-h-screen bg-[#F5F3EE] text-[#2B2B2B]">
      <aside className="w-60 shrink-0 bg-[#1B4332] p-4 text-white">
        <div className="mb-6 text-lg font-black text-[#D4A843]">SINAR Command</div>
        <nav className="space-y-1">
          {MODULES.map((m) => (
            <NavLink
              key={m.key}
              to={m.path}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 transition ${isActive ? 'bg-[#2D6A4F]' : 'hover:bg-[#234F3B]'} ${m.enabled ? '' : 'pointer-events-none opacity-40'}`
              }
            >
              <div className="text-sm font-semibold">{m.label}</div>
              <div className="text-[11px] text-white/60">{m.sub}{!m.enabled && ' · segera'}</div>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route index element={<Navigate to="pulse" replace />} />
          <Route path="pulse" element={<PulseDashboard />} />
          <Route path="studio" element={<ComingSoon name="Studio" />} />
          <Route path="scheduler" element={<ComingSoon name="Scheduler" />} />
          <Route path="rally" element={<ComingSoon name="Rally" />} />
          <Route path="campaigns" element={<ComingSoon name="Campaigns" />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Tambah route**

Di `src/Router.jsx`, tambahkan lazy import setelah baris `const LegacyApp = lazy(...)`:

```javascript
const CommandCenter = lazy(() => import('./pages/admin/CommandCenter'));
```

Dan di dalam `<Routes>`, tambahkan route SEBELUM route `path="/*"`:

```jsx
          <Route path="/command-center/*" element={
            <ProtectedRoute>
              <CommandCenter />
            </ProtectedRoute>
          } />
```

> Catatan: PulseDashboard/TopicManager/IssueCard dibuat di Task 14–15. Build penuh diverifikasi di Task 16. Jangan jalankan `npm run build` sampai Task 16 (komponen belum lengkap).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ComingSoon.jsx src/pages/admin/CommandCenter.jsx src/Router.jsx
git commit -m "feat: add Command Center shell + /command-center route"
```

---

## Task 14: Frontend — TopicManager

**Files:**
- Create: `src/components/admin/pulse/TopicManager.jsx`

- [ ] **Step 1: Implementasi**

Buat `src/components/admin/pulse/TopicManager.jsx`:

```jsx
import React, { useState } from 'react';
import { useTopics } from '../../../hooks/usePulse';

export default function TopicManager({ onSelectTopic, selectedTopicId }) {
  const { topics, createTopic, deleteTopic, crawlNow } = useTopics();
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim() || !query.trim()) return;
    setBusy(true);
    try {
      await createTopic({ label: label.trim(), query: query.trim() });
      setLabel('');
      setQuery('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-[#1B4332]">Watch Topics</h3>

      <form onSubmit={submit} className="mb-4 space-y-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (mis. Franchise X)"
          className="w-full rounded-lg border border-[#E5E1D8] px-3 py-2 text-sm"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kata kunci pencarian"
          className="w-full rounded-lg border border-[#E5E1D8] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#1B4332] py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Menyimpan…' : 'Tambah Topik'}
        </button>
      </form>

      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelectTopic(null)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!selectedTopicId ? 'bg-[#EDEBE3] font-semibold' : 'hover:bg-[#F5F3EE]'}`}
          >
            Semua isu
          </button>
        </li>
        {topics.map((t) => (
          <li key={t.id} className="group flex items-center gap-1">
            <button
              onClick={() => onSelectTopic(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-left text-sm ${selectedTopicId === t.id ? 'bg-[#EDEBE3] font-semibold' : 'hover:bg-[#F5F3EE]'}`}
            >
              {t.label}
            </button>
            <button
              onClick={() => crawlNow(t.id)}
              title="Crawl sekarang"
              className="rounded px-2 py-1 text-xs text-[#2D6A4F] hover:bg-[#F5F3EE]"
            >
              ↻
            </button>
            <button
              onClick={() => deleteTopic(t.id)}
              title="Hapus"
              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/pulse/TopicManager.jsx
git commit -m "feat: add Pulse TopicManager component"
```

---

## Task 15: Frontend — IssueCard + PulseDashboard

**Files:**
- Create: `src/components/admin/pulse/IssueCard.jsx`
- Create: `src/components/admin/pulse/PulseDashboard.jsx`

- [ ] **Step 1: IssueCard**

Buat `src/components/admin/pulse/IssueCard.jsx`:

```jsx
import React, { useState } from 'react';
import { fetchIssueDetail } from '../../../hooks/usePulse';

function sentimentBadge(s) {
  if (s === null || s === undefined) return { label: 'n/a', cls: 'bg-gray-100 text-gray-500' };
  if (s > 0.2) return { label: 'positif', cls: 'bg-green-100 text-green-700' };
  if (s < -0.2) return { label: 'negatif', cls: 'bg-red-100 text-red-700' };
  return { label: 'netral', cls: 'bg-yellow-100 text-yellow-700' };
}

export default function IssueCard({ issue }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      setLoading(true);
      try {
        setDetail(await fetchIssueDetail(issue.id));
      } catch {
        setDetail({ source_items: [] });
      } finally {
        setLoading(false);
      }
    }
  };

  const badge = sentimentBadge(issue.sentiment);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <button onClick={toggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <div className="font-semibold text-[#2B2B2B]">{issue.title || '(tanpa judul)'}</div>
          {issue.summary && <div className="mt-1 text-xs text-[#6B6555]">{issue.summary}</div>}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#6B6555]">
            <span>{issue.item_count} post</span>
            <span>·</span>
            <span>skor {Number(issue.score).toFixed(1)}</span>
            <span className={`rounded-full px-2 py-0.5 ${badge.cls}`}>{badge.label}</span>
          </div>
        </div>
        <span className="text-[#6B6555]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-3 border-t border-[#EDEBE3] pt-3">
          {loading && <div className="text-xs text-[#6B6555]">Memuat sumber…</div>}
          {detail && (
            <ul className="space-y-2">
              {(detail.source_items || []).map((s) => (
                <li key={s.id} className="text-xs">
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-[#2D6A4F] hover:underline">
                    {s.title || s.url}
                  </a>
                  <span className="ml-2 text-[#9A9486]">{s.platform} · {s.author || '—'}</span>
                </li>
              ))}
              {detail.source_items && detail.source_items.length === 0 && (
                <li className="text-xs text-[#9A9486]">Belum ada sumber.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: PulseDashboard**

Buat `src/components/admin/pulse/PulseDashboard.jsx`:

```jsx
import React, { useState } from 'react';
import { useIssues } from '../../../hooks/usePulse';
import TopicManager from './TopicManager';
import IssueCard from './IssueCard';

export default function PulseDashboard() {
  const [topicId, setTopicId] = useState(null);
  const { issues, loading } = useIssues({ topicId });

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-black text-[#1B4332]">Pulse — Top Isu Hari Ini</h1>
        <p className="text-sm text-[#6B6555]">Pantau apa yang sedang dibicarakan dari sumber publik.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <TopicManager onSelectTopic={setTopicId} selectedTopicId={topicId} />

        <section className="space-y-3">
          {loading && <div className="text-sm text-[#6B6555]">Memuat isu…</div>}
          {!loading && issues.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#6B6555] shadow-sm">
              Belum ada isu. Tambahkan watch topic lalu klik ↻ untuk crawl.
            </div>
          )}
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/pulse/IssueCard.jsx src/components/admin/pulse/PulseDashboard.jsx
git commit -m "feat: add Pulse dashboard + issue card"
```

---

## Task 16: Build Verification & Manual Smoke Test

**Files:** (none — verification only)

- [ ] **Step 1: Build frontend**

Run: `npm run build`
Expected: build sukses tanpa error (semua import komponen Pulse resolve).

- [ ] **Step 2: Jalankan seluruh test backend**

Run: `cd server && python -m pytest -v`
Expected: PASS — semua test (existing + pulse) hijau.

- [ ] **Step 3: Smoke test manual**

1. Start backend: `cd server && uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Buka `http://localhost:5173/command-center/pulse`
4. Verifikasi: sidebar tampil (Pulse aktif; Studio/Scheduler/Rally/Campaigns redup "segera"). Tambah watch topic → muncul di daftar. Klik ↻ pada topik → backend crawl Google News → setelah refresh, isu muncul di kanan (butuh koneksi internet). Klik kartu isu → expand menampilkan sumber.

Expected: alur berfungsi; jika backend mati, dashboard tampil dengan MOCK_ISSUES (demo mode).

- [ ] **Step 4: Commit (jika ada penyesuaian)**

```bash
git add -A
git commit -m "chore: Fase 1 Pulse verification" --allow-empty
```

---

## Self-Review Notes (spec coverage)

- Shell + sidebar 5 modul → Task 13.
- AI Service abstraction pluggable (default Claude, opsional) → Task 4 + dipakai Task 8/10.
- Pulse: RSS (Task 6) + Browserless (Task 7) + dedup deterministik (Task 2) + ranking (Task 3) + clustering (Task 8) + dashboard Top Isu (Task 15).
- Endpoints topics/crawl/issues/webhook → Task 9–10.
- APScheduler crawl periodik → Task 11.
- Env baru (BROWSERLESS_API_KEY, AI_PROVIDER, ANTHROPIC_API_KEY, PULSE_WEBHOOK_SECRET) → Task 1.
- Guardrail legal: hanya konten publik + allowlist domain Browserless (Task 7), webhook secret (Task 10).
- Testing: unit dedup/ranking/ai/rss/browserless + integrasi API → Task 2,3,4,6,7,8,9,10.
- Modul lain = placeholder ComingSoon → Task 13.
```

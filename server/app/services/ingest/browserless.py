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

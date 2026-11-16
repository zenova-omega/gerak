"""How a project's report is put together: which pages, in what order, and under whose name.

Stored with the project's other settings. A save is checked as a whole and refused as a whole: a logo must be a small
embedded PNG, JPEG or WebP (never a link, never SVG, which can carry script), the accent a plain hex colour. `ai.summary`
names the stored written summary the report prints: one of the summary card's formats, 'off' for sentences worked out
from the figures, or None for the first one stored (executive, then brief)."""
import re

from ..models.pulse_settings import PulseProjectSettings

LOGO = re.compile(r'data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+')
MAX_LOGO = 420_000          # characters of the data URL: about 300 KB of image
MAX_SECTIONS = 24
SUMMARY_CHOICES = (None, 'off', 'executive', 'brief', 'timeline')
EMPTY = {'sections': [], 'brand': {'logo': None, 'accent': None, 'organisation': '', 'description': ''}, 'ai': {'summary': None}}


def _clean(payload):
    if not isinstance(payload, dict):
        raise ValueError('Pengaturan laporan tidak terbaca.')
    sections = payload.get('sections', [])
    if not isinstance(sections, list) or len(sections) > MAX_SECTIONS:
        raise ValueError('Daftar bagian laporan tidak sah.')
    cleaned, seen = [], set()
    for row in sections:
        key = row.get('key') if isinstance(row, dict) else None
        if not isinstance(key, str) or not re.fullmatch(r'[a-z][a-z0-9_]{1,23}', key) or key in seen:
            raise ValueError('Nama bagian laporan tidak sah.')
        seen.add(key)
        cleaned.append({'key': key, 'on': row.get('on') is not False})
    brand = payload.get('brand') or {}
    if not isinstance(brand, dict):
        raise ValueError('Pengaturan merek tidak terbaca.')
    logo, accent = brand.get('logo') or None, brand.get('accent') or None
    if logo is not None and (not isinstance(logo, str) or len(logo) > MAX_LOGO or not LOGO.fullmatch(logo)):
        raise ValueError('Logo harus berupa PNG, JPEG, atau WebP paling besar 300 KB.')
    if accent is not None and (not isinstance(accent, str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', accent)):
        raise ValueError('Warna aksen harus berbentuk #rrggbb.')
    organisation, description = brand.get('organisation') or '', brand.get('description') or ''
    if not isinstance(organisation, str) or len(organisation) > 80 or not isinstance(description, str) or len(description) > 600:
        raise ValueError('Nama organisasi paling panjang 80 karakter dan deskripsi 600 karakter.')
    ai = payload.get('ai') if payload.get('ai') is not None else {}
    if not isinstance(ai, dict) or ai.get('summary') not in SUMMARY_CHOICES:
        raise ValueError('Pilihan ringkasan AI tidak sah.')
    return {'sections': cleaned, 'brand': {'logo': logo, 'accent': accent.lower() if accent else None,
                                           'organisation': organisation.strip(), 'description': description.strip()},
            'ai': {'summary': ai.get('summary')}}


async def read(db, topic_id):
    row = await db.get(PulseProjectSettings, topic_id)
    saved = (row.data or {}).get('report') if row else None
    return _clean(saved) if isinstance(saved, dict) else {'sections': [], 'brand': dict(EMPTY['brand']), 'ai': dict(EMPTY['ai'])}


async def save(db, topic_id, payload):
    """Store the report settings of one project. Raises ValueError, changing nothing, when any part is not acceptable."""
    cleaned = _clean(payload)
    row = await db.get(PulseProjectSettings, topic_id)
    if row is None:
        row = PulseProjectSettings(topic_id=topic_id, data={})
        db.add(row)
    row.data = {**(row.data or {}), 'report': cleaned}
    await db.flush()
    return cleaned

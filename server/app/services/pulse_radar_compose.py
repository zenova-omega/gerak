"""Grouping the radar's signals into issues.

One question to the answer engine: which of these headlines, videos and search terms are the same story, what is a
neutral name for it, and what would someone type to follow it. Everything else is decided here, from the signals
themselves: an issue must point at signals that exist, where it is loud is read from the province lists and never
from the answer, and a story keeps its key from one refresh to the next so its movement can be told.
"""
import asyncio
import json
import re
import uuid

from .pulse_radar_signals import plain

CATEGORIES = ('politik', 'hukum', 'ekonomi', 'bencana', 'sosial', 'teknologi', 'olahraga', 'hiburan', 'dunia', 'lainnya')
ANSWER_TOKENS = 8000
MAX_ISSUES = 60
REASON_LENGTH = 300
NATIONAL_PROVINCES = 5      # an issue found only on province lists is national once this many provinces carry it
BRIEF_LENGTH = 400

SYSTEM = (
    'Anda menyusun daftar isu publik yang sedang ramai di Indonesia dari sinyal yang diberikan: judul berita, video populer, '
    'dan kata pencarian populer. Tulis dalam bahasa Indonesia yang netral, langsung, dan tidak sensasional. Pakai hanya apa yang '
    'ada di sinyal; jangan menambah fakta, angka, atau dugaan. Jangan menyebut diri Anda atau cara kerja Anda. '
    'Jawab HANYA dengan satu objek JSON yang sah, tanpa teks lain.')

_PLATFORM = {'news': 'berita', 'search': 'pencarian', 'youtube': 'video'}
# The assistant talking about itself instead of the news: the first person, outside anything it quotes. Checked on the
# text it wrote (reason, brief), never on a headline. A story about an AI company, or about "model bahasa", is a story.
_QUOTED = re.compile(r'"[^"]*"|“[^”]*”|\'[^\']*\'|‘[^’]*’')
_FIRST_PERSON = re.compile(r"\b(saya|aku)\b|\bas an ai\b|\bi (am|cannot|can't)\b", re.I)


def _self_talk(text):
    return bool(_FIRST_PERSON.search(_QUOTED.sub(' ', text or '')))


def _text(value, limit=None):
    """A text field of the answer as plain text; anything that is not text is empty."""
    if not isinstance(value, str):
        return ''
    return plain(value, limit) if limit else plain(value)


def _figure(signal):
    value = signal.get('figure')
    if signal['platform'] == 'news':
        return f'{value} liputan lain' if value else ''
    if signal['platform'] == 'youtube':
        return f'{value} tayangan' if value else ''
    return f'{value}+ pencarian nasional' if value is not None else 'hanya di daftar provinsi'


def build_prompt(signals, previous):
    lines = ['SINYAL (id | jenis | judul | angka | provinsi tempat kata itu masuk pencarian populer):']
    for signal in signals:
        provinces = ', '.join(f'{code[3:]} {count}' for code, count in sorted(signal.get('provinces', {}).items(), key=lambda pair: -pair[1]))
        lines.append(' | '.join([signal['id'], _PLATFORM.get(signal['platform'], signal['platform']), signal['title'], _figure(signal), provinces]).rstrip(' |'))
    lines.append('')
    lines.append('ISU PADA PEMBARUAN SEBELUMNYA (key | judul):')
    lines.extend(f"{issue['key']} | {issue['title']}" for issue in previous) if previous else lines.append('(belum ada)')
    lines.append('')
    lines.append(
        'TUGAS:\n'
        '1. Kelompokkan sinyal yang membicarakan peristiwa atau pokok yang sama menjadi satu isu. Satu sinyal hanya untuk satu isu. '
        'Sinyal yang bukan isu publik (jadwal sholat, cuaca harian, lirik lagu, kata tanpa konteks) boleh ditinggalkan.\n'
        '2. Untuk tiap isu tulis: "title" nama netral paling panjang 70 karakter; "category" salah satu dari: ' + ', '.join(CATEGORIES) + '; '
        '"reason" satu kalimat paling panjang 160 karakter tentang mengapa isu ini ramai sekarang menurut sinyalnya; '
        '"signals" daftar id sinyal yang menjadi dasarnya; "q" dua sampai empat kata kunci utama yang dipakai orang untuk membicarakannya, dipisah koma; '
        '"required" kata konteks yang wajib ada bila kata kuncinya terlalu umum, atau kosong; "excluded" kata yang perlu dikecualikan, atau kosong; '
        '"key" isi dengan key dari daftar sebelumnya bila ini isu yang sama, selain itu kosong.\n'
        '3. Kata pencarian yang hanya ada di daftar provinsi dan tidak termasuk isu nasional mana pun dikelompokkan menjadi isu sendiri dengan cara yang sama.\n'
        '4. Urutkan dari yang paling ramai. Paling banyak 40 isu.\n'
        '5. "brief": paling banyak dua kalimat tentang apa yang paling menonjol, dengan nomor urut isu dalam kurung siku, misalnya [1].\n\n'
        'FORMAT JAWABAN:\n'
        '{"brief": "...", "issues": [{"key": "", "title": "...", "category": "...", "reason": "...", "signals": ["S1"], "q": "...", "required": "", "excluded": ""}]}')
    return '\n'.join(lines)


def _object(text):
    """The JSON object in an answer, with or without words or a code fence around it."""
    if not isinstance(text, str):
        return None
    for candidate in (text, text[text.find('{'):text.rfind('}') + 1] if '{' in text and '}' in text else ''):
        try:
            value = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(value, dict):
            return value
    return None


def _words(title):
    return {word for word in re.findall(r'[a-z0-9]{4,}', str(title).lower())}


def _same_story(title, previous, used):
    """The key of a previous issue this title retells: at least half of the two titles' words are shared."""
    words = _words(title)
    for issue in previous:
        other = _words(issue['title'])
        if issue['key'] not in used and words and other and len(words & other) / len(words | other) >= 0.5:
            return issue['key']
    return None


def parse_answer(text, signals, previous):
    """The checked issues of an answer, or None when the answer is not the object that was asked for."""
    data = _object(text)
    if data is None or not isinstance(data.get('issues'), list):
        return None
    known = {signal['id']: signal for signal in signals}
    issued, used, issues, written_as = {issue['key'] for issue in previous}, set(), [], {}
    for position, raw in enumerate(data['issues'][:MAX_ISSUES], 1):
        if not isinstance(raw, dict) or not isinstance(raw.get('signals'), list):
            continue
        ids = list(dict.fromkeys(value for value in raw['signals'] if isinstance(value, str) and value in known))
        title, reason = _text(raw.get('title')), _text(raw.get('reason'), REASON_LENGTH)
        if not ids or not title or _self_talk(reason):
            continue
        category = raw['category'].strip().lower() if isinstance(raw.get('category'), str) else ''
        key = raw.get('key') if isinstance(raw.get('key'), str) else ''
        if key not in issued or key in used:
            key = _same_story(title, previous, used) or 'r-' + uuid.uuid4().hex[:10]
        used.add(key)
        cited = [known[value] for value in ids]
        terms = [signal['title'] for signal in cited if signal['platform'] == 'search']
        query = {name: _text(raw.get(name), 200) for name in ('q', 'required', 'excluded')}
        if not query['q']:
            query['q'] = ', '.join(terms[:3]) or title
        provinces = {code for signal in cited for code in signal.get('provinces', {})}
        national = any(signal['platform'] != 'search' or signal.get('figure') is not None for signal in cited) or len(provinces) >= NATIONAL_PROVINCES
        issues.append({'key': key, 'scope': 'national' if national else 'local', 'title': title, 'category': category if category in CATEGORIES else 'lainnya',
                       'reason': reason, 'signal_ids': ids, 'query': query})
        written_as[position] = key
    brief = _text(data.get('brief'), BRIEF_LENGTH)
    if not brief or _self_talk(brief):
        return {'brief': None, 'issues': issues}
    # The brief numbers issues in the order the answer listed them. The list on the page is ordered later, so a number
    # becomes the key of the issue it meant ("[#key]"); the run turns keys into row numbers when it is stored.
    brief = re.sub(r'\s*\[(\d+)\]', lambda found: f' [#{written_as[int(found.group(1))]}]' if int(found.group(1)) in written_as else '', brief)
    return {'brief': brief, 'issues': issues}


async def compose(ai, signals, previous, *, timeout=300):
    """Ask the engine once. None means there is no composed list this time: no engine, no signals, an error, a timeout
    or an answer that cannot be read. The caller keeps the last composed run on the page."""
    if ai is None or not signals:
        return None
    try:
        text = await asyncio.wait_for(ai.generate_text(build_prompt(signals, previous), system=SYSTEM, max_tokens=ANSWER_TOKENS), timeout)
        return parse_answer(text, signals, previous)
    except Exception:       # the engine's own errors, an outage, a timeout, an answer of an unexpected shape: all mean "not this time"
        return None

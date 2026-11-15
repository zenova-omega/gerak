"""Places named in the text of a post, and the province a profile location names, read on the server.

This is the twin of src/lib/pulsePlaces.js. The app reads place names in the browser, for the spread map; the server
needs the same reading for what the AI is told (Tanya AI, AI Insights, the AI summary). Both follow the same rules,
load the same lists (pulse_places_data.json, written from the app's module by scripts/build-pulse-places.mjs) and run
the same cases (src/lib/pulsePlaces.cases.json). Change a rule in both places and add a case for it.

What it reads is what a post TALKS ABOUT, and what an account owner WROTE on a profile. Neither says where a post
was written: no source in use reports that, and the lines for the AI say so.
"""
import json
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path

_DATA = json.loads(Path(__file__).with_name('pulse_places_data.json').read_text(encoding='utf-8'))
_WEAK, _STRONG = frozenset(_DATA['weak']), frozenset(_DATA['strong'])
_OUTLET_BEFORE, _OUTLET_AFTER, _BANDS = frozenset(_DATA['outletBefore']), frozenset(_DATA['outletAfter']), frozenset(_DATA['bands'])
_NOT_PLACES = frozenset(_DATA['notPlaces'])
_LONGEST_NOT = max(len(phrase.split(' ')) for phrase in _NOT_PLACES)
_MANY_HASHTAGS = _DATA['manyHashtags']
_SIGN_OFF = re.compile(_DATA['signOff'], re.I)

# 'jawa barat' -> (code, 'Jawa Barat', kind). A name marked "?" counts with a capital letter or after a place word,
# one marked "!" only after a place word; see the app's module for why.
_ENTRIES, _LONGEST = {}, 1
for _code, _names in _DATA['places'].items():
    for _raw in (_names + '|' + _DATA['english'][_code] if _code in _DATA['english'] else _names).split('|'):
        _place = _raw.rstrip('?!')
        _ENTRIES[_place.lower()] = (_code, _place, 'capital' if _raw.endswith('?') else 'cue' if _raw.endswith('!') else 'plain')
        _LONGEST = max(_LONGEST, len(_place.split(' ')))
_PROFILE_SHORT = {short: (code, place, 'plain') for short, (code, place) in _DATA['profileShort'].items()}
PROVINCE_NAMES = {code: names.split('|')[0].rstrip('?!') for code, names in _DATA['places'].items()}

_HASHTAG = re.compile(r'#\w+')
_MARKUP = re.compile(r'<[^>]*>')
_LINK = re.compile(r'https?://\S+|www\.\S+', re.I)
_MENTION = re.compile(r'@[\w.]+', re.A)
_SITE = re.compile(r'[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|id|tv|co|news|info)\b', re.I | re.A)
_WORD = re.compile(r'[^\W_]+')


def _hashtag(match):
    """A #CamelCase hashtag as its words, unless the whole tag is a place name."""
    tag = match.group(0)[1:]
    if tag.lower() in _ENTRIES:
        return tag
    out = []
    for index, char in enumerate(tag):
        if index and char.isupper() and (tag[index - 1].islower() or tag[index - 1].isdigit()):
            out.append(' ')
        out.append(' ' if char == '_' else char)
    return ''.join(out)


def _words(text):
    """Words of a text without links, account names and markup. A long row of hashtags is not read at all."""
    tagged = _HASHTAG.sub(' ', text) if len(_HASHTAG.findall(text)) > _MANY_HASHTAGS else text
    clean = _SITE.sub(' ', _MENTION.sub(' ', _LINK.sub(' ', _MARKUP.sub(' ', tagged))))
    return [(match.group(0), match.group(0).lower()) for match in _WORD.finditer(_HASHTAG.sub(_hashtag, clean))]


def _counts(entry, tokens, at, length):
    before = tokens[at - 1][1] if at else ''
    after = tokens[at + length][1] if at + length < len(tokens) else ''
    band = tokens[at + length + 1][1] if at + length + 1 < len(tokens) else ''
    if before in _OUTLET_BEFORE or after in _OUTLET_AFTER or (re.fullmatch(r'[0-9]+', after) and band in _BANDS):
        return False       # the name of a news outlet, or a line of a channel list
    place, kind = entry[1], entry[2]
    if kind == 'plain':
        return True
    raw = tokens[at][0]
    shouted = len(raw) > 1 and raw == raw.upper() and place != place.upper()     # capitals that say nothing
    capital = not shouted and raw[0] != raw[0].lower()
    if kind == 'capital':
        return capital or before in _WEAK or before in _STRONG
    return before in _STRONG or (capital and before in _WEAK)


def places_in(text, loose=False):
    """Provinces a text names, in the order it names them: [{code, name, places}]. `loose` is for a field that holds a
    location by nature (a profile's location): every name counts however it is typed, and profile short forms are read."""
    if not isinstance(text, str) or not text:
        return []
    tokens, found = _words(text), {}
    at = 0
    while at < len(tokens):
        step = 0
        for length in range(min(_LONGEST_NOT, len(tokens) - at), 1, -1):
            if ' '.join(token[1] for token in tokens[at:at + length]) in _NOT_PLACES:
                step = length
                break
        if not step:
            for length in range(min(_LONGEST, len(tokens) - at), 0, -1):
                entry = _ENTRIES.get(' '.join(token[1] for token in tokens[at:at + length]))
                if entry is None and loose and length == 1:
                    entry = _PROFILE_SHORT.get(tokens[at][1])
                if entry is None or (not loose and not _counts(entry, tokens, at, length)):
                    continue
                row = found.setdefault(entry[0], {'code': entry[0], 'name': PROVINCE_NAMES[entry[0]], 'places': []})
                if entry[1] not in row['places']:
                    row['places'].append(entry[1])
                step = length
                break
        at += step or 1
    return list(found.values())


def province_of_location(text):
    """The province a profile's location text names, as {code, name, place}, or None ("Indonesia", "Bumi", empty)."""
    found = places_in(text, loose=True)
    return {'code': found[0]['code'], 'name': found[0]['name'], 'place': found[0]['places'][0]} if found else None


def _without_author(value, author):
    """A text without the name of the account that posted it: a news title ends in its publisher, a video description
    repeats its channel. A one-word name is kept, it is too likely to be an ordinary word."""
    if not isinstance(value, str):
        return ''
    name = author.strip() if isinstance(author, str) else ''
    if not re.search(r'\s', name):
        return value
    return re.sub(r'\s+'.join(re.escape(part) for part in name.split()), ' ', value, flags=re.I)


@lru_cache(maxsize=40000)
def _post_places(title, text, author):
    title, text = _without_author(title, author), _without_author(text, author)
    end = _SIGN_OFF.search(text)       # from the first call to subscribe or "Baca juga" on, the text is not about this post
    return tuple((row['code'], row['name'], tuple(row['places'])) for row in places_in(title + '\n' + (text[:end.start()] if end else text)))


def post_places(title, text, author):
    """Provinces one post names: its title, and its text up to the sign-off. Remembered, since every question reads the same posts."""
    return [{'code': code, 'name': name, 'places': list(names)} for code, name, names in _post_places(title, text, author)]


def _ranked(rows, unit):
    return [{'code': code, 'name': PROVINCE_NAMES[code], unit: count, 'names': names.most_common()}
            for code, (count, names) in sorted(rows.items(), key=lambda pair: (-pair[1][0], PROVINCE_NAMES[pair[0]]))]


def place_summary(items):
    """What a set of stored posts names: {posts, named, provinces: [{code, name, posts, names}]}, most named first.
    A post naming two provinces counts in both. `names` are the names that were used, with their counts."""
    rows, named, total = {}, 0, 0
    for item in items:
        total += 1
        found = _post_places(item.title, item.text, item.author)
        named += bool(found)
        for code, _, names in found:
            row = rows.setdefault(code, [0, Counter()])
            row[0] += 1
            row[1].update(names)
    return {'posts': total, 'named': named, 'provinces': _ranked(rows, 'posts')}


def location_summary(origin):
    """Where X accounts say they are, from the account_origin_v1 reading (`pulse_demography.account_origin`), the rule
    the map and the Jaringan card count by. Returns {accounts, asked, located, named, provinces}: every X account, those
    the profile job has asked, those with a location text, those whose location names a province, and the provinces by
    accounts, then name, with the place names behind each (equal counts by name)."""
    rows = {}
    for row in sorted((row for row in origin['rows'] if row['province']), key=lambda row: row['province']['place']):
        entry = rows.setdefault(row['province']['code'], [0, Counter()])
        entry[0] += 1
        entry[1][row['province']['place']] += 1
    return {'accounts': origin['accounts'], 'asked': origin['accounts'] - origin['unasked'], 'located': origin['with_location'],
            'named': origin['province_read'], 'provinces': _ranked(rows, 'accounts')}


_LINE_ROWS, _LINE_NAMES = 8, 3


def context_lines(named, homes):
    """Two lines for the AI's data block: the provinces the posts name, and the provinces X profiles name."""
    def listed(rows, unit):
        return '; '.join(f"{row['name']} {row[unit]} {'posting' if unit == 'posts' else 'akun'} ({', '.join(f'{name} {count}' for name, count in row['names'][:_LINE_NAMES])})"
                         for row in rows[:_LINE_ROWS])
    if named['provinces']:
        first = (f"TEMPAT YANG DISEBUT DALAM POSTING (yang dibicarakan, BUKAN lokasi penulis): {named['named']} dari {named['posts']} posting menyebut provinsi atau kota | "
                 + listed(named['provinces'], 'posts'))
    else:
        first = 'TEMPAT YANG DISEBUT DALAM POSTING: tidak ada posting yang menyebut provinsi atau kota'
    unasked = homes['accounts'] - homes['asked']
    if not homes['accounts']:
        second = 'LOKASI PROFIL AKUN X: tidak ada akun X dalam cakupan'
    elif not homes['asked']:
        second = f"LOKASI PROFIL AKUN X: {homes['accounts']} akun X, lokasi profilnya belum diperiksa"
    elif not homes['provinces']:
        second = f"LOKASI PROFIL AKUN X: belum ada dari {homes['asked']} akun X yang diperiksa yang menulis lokasi yang menyebut provinsi" + (f", {unasked} belum diperiksa" if unasked else '')
    else:
        second = (f"LOKASI PROFIL AKUN X (keterangan pemilik akun, BUKAN posisi saat memposting): {homes['named']} dari {homes['accounts']} akun X bisa dipetakan"
                  + (f", {unasked} belum diperiksa" if unasked else '') + ' | ' + listed(homes['provinces'], 'accounts'))
    return [first, second]

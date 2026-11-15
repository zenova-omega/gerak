"""Signals for the issue radar: what Indonesia is reading, searching and watching right now, from public lists.

Three sources, each allowed to fail on its own: national news (top stories and sections), trending searches for the
country and for each province, and the most popular videos. A search term is the only signal that says WHERE something
is loud, because its list exists per province. Nothing here is asked on behalf of a project, and nothing is stored.
"""
import asyncio
import html
import re
from datetime import datetime
from xml.etree import ElementTree

import feedparser
import httpx

from .ingest.common import credential

# The provinces the map can draw (2017 boundaries), by ISO 3166-2 code.
PROVINCES = ('ID-AC', 'ID-BA', 'ID-BB', 'ID-BE', 'ID-BT', 'ID-GO', 'ID-JA', 'ID-JB', 'ID-JI', 'ID-JK', 'ID-JT', 'ID-KB',
             'ID-KI', 'ID-KR', 'ID-KS', 'ID-KT', 'ID-KU', 'ID-LA', 'ID-MA', 'ID-MU', 'ID-NB', 'ID-NT', 'ID-PA', 'ID-PB',
             'ID-RI', 'ID-SA', 'ID-SB', 'ID-SG', 'ID-SN', 'ID-SR', 'ID-SS', 'ID-ST', 'ID-SU', 'ID-YO')
NEWS_SECTIONS = ('NATION', 'BUSINESS', 'TECHNOLOGY', 'ENTERTAINMENT', 'SPORTS', 'SCIENCE', 'HEALTH', 'WORLD')
YOUTUBE_CATEGORIES = (None, '25', '24', '22', '17', '28')

TRENDING_URL = 'https://trends.google.com/trending/rss'
NEWS_URL = 'https://news.google.com/rss'
NEWS_SECTION_URL = 'https://news.google.com/rss/headlines/section/topic/'
NEWS_EDITION = {'hl': 'id', 'gl': 'ID', 'ceid': 'ID:id'}
YOUTUBE_URL = 'https://www.googleapis.com/youtube/v3/videos'

TITLE_LENGTH = 120
SECTION_STORIES = 15        # stories kept from one news section
LIST_VIDEOS = 10            # videos kept from one popular list
LOCAL_TERMS = 120           # search terms that are on province lists only
MAX_FEED_BYTES = 2_000_000


def plain(text, limit=TITLE_LENGTH):
    """A title as text: no markup, one line, cut with an ellipsis when it is longer than a row can show."""
    text = html.unescape(re.sub(r'</?[a-zA-Z][^>]*>', ' ', str(text or '')))      # tags only: "harga < 10 dan > 5" is a headline, not markup
    text = ' '.join(text.split())
    return text if len(text) <= limit else text[:limit - 1].rstrip() + '…'


def web_link(url):
    """A link a reader may follow: http or https, or none."""
    url = str(url or '').strip()
    return url if re.match(r'https?://', url, re.I) else None


def _feed(text):
    """Is this an RSS document worth parsing? An error page, a truncated answer or one that defines entities is not."""
    return isinstance(text, str) and 0 < len(text) <= MAX_FEED_BYTES and '<rss' in text[:2000] and '<!ENTITY' not in text and '<!DOCTYPE' not in text


def _local(tag):
    return tag.rsplit('}', 1)[-1]


def parse_trending(xml):
    """Rows of a trending-searches feed: the term, the lower bound of its searches, and the news listed with it."""
    if not _feed(xml):
        return []
    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError:
        return []
    rows = []
    for item in root.iter('item'):
        fields, news = {}, []
        for child in item:
            name = _local(child.tag)
            if name == 'news_item':
                story = {_local(part.tag): (part.text or '') for part in child}
                title = plain(story.get('news_item_title'))
                if title:
                    news.append({'title': title, 'url': web_link(story.get('news_item_url')), 'source': plain(story.get('news_item_source'), 80) or None})
            else:
                fields[name] = child.text or ''
        term = plain(fields.get('title'))
        if not term:
            continue
        digits = re.sub(r'\D', '', fields.get('approx_traffic', ''))
        rows.append({'term': term, 'searches': int(digits) if digits else 0, 'news': news})
    return rows


def parse_news(xml):
    """Stories of a news feed: headline, link, publisher, time, and the other coverage the feed lists under it."""
    if not _feed(xml):
        return []
    rows = []
    for entry in feedparser.parse(xml).entries:
        source = getattr(entry, 'source', None)
        publisher = plain((source.get('title') if hasattr(source, 'get') else getattr(source, 'title', None)) if source is not None else '', 80)
        title = str(getattr(entry, 'title', '') or '')
        if publisher and title.endswith(' - ' + publisher):
            title = title[:-len(' - ' + publisher)]
        title = plain(title)
        if not title:
            continue
        link = web_link(getattr(entry, 'link', None))
        related = []
        for url, name, who in re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>(?:.*?<font[^>]*>(.*?)</font>)?', str(getattr(entry, 'summary', '') or ''), re.S):
            other = plain(name)
            if other and other != title and web_link(url) != link:
                related.append({'title': other, 'url': web_link(url), 'source': plain(who, 80) or None})
        published = getattr(entry, 'published_parsed', None)
        rows.append({'title': title, 'url': link, 'source': publisher or None, 'published_at': datetime(*published[:6]) if published else None, 'related': related})
    return rows


async def _text(client, url, params=None):
    response = await client.get(url, params=params)
    response.raise_for_status()
    return response.text


async def _trending(client, geo):
    try:
        return parse_trending(await _text(client, TRENDING_URL, {'geo': geo}))
    except httpx.HTTPError:
        return []


async def _news(client, section=None):
    try:
        return parse_news(await _text(client, NEWS_SECTION_URL + section if section else NEWS_URL, NEWS_EDITION))
    except httpx.HTTPError:
        return []


async def _videos(client, key):
    """The popular lists, most general first. A refusal stops the reading: the allowance is shared by every list."""
    found, read = {}, False
    for category in YOUTUBE_CATEGORIES:
        params = {'part': 'snippet,statistics', 'chart': 'mostPopular', 'regionCode': 'ID', 'maxResults': 20, 'hl': 'id'}
        if category:
            params['videoCategoryId'] = category
        try:
            response = await client.get(YOUTUBE_URL, params=params, headers={'x-goog-api-key': key})
            response.raise_for_status()
            items = response.json().get('items', [])
        except (httpx.HTTPError, ValueError):
            if not read:
                return None
            continue        # one category the country has no list for does not undo the lists already read
        read = True
        for item in items[:LIST_VIDEOS]:
            video, snippet = item.get('id'), item.get('snippet') or {}
            title = plain(snippet.get('title'))
            if not isinstance(video, str) or not title or video in found:
                continue
            views = str((item.get('statistics') or {}).get('viewCount') or '')
            found[video] = {'title': title, 'url': 'https://www.youtube.com/watch?v=' + video, 'source': plain(snippet.get('channelTitle'), 80) or None,
                            'figure': int(views) if views.isdigit() else None, 'section': snippet.get('categoryId')}
    return list(found.values())


def _term(text):
    return ' '.join(str(text).lower().split())


async def collect(settings, *, client=None, pause=0.3):
    """One reading of every list. Returns the numbered signals, what could not be read, and the provinces that were."""
    own = client is None
    client = client or httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers={'User-Agent': 'Mozilla/5.0 (compatible; radar)'})
    missing, signals = [], []
    try:
        # News: the top stories, then each section. A story is kept once, under the first place it was seen.
        stories, seen = [], set()
        top = await _news(client)
        if not top:
            missing.append('news')
        for section, rows in [(None, top)] + [(section, (await _news(client, section))[:SECTION_STORIES]) for section in NEWS_SECTIONS]:
            for row in rows:
                mark = row['url'] or row['title'].lower()
                if mark in seen or row['title'].lower() in seen:
                    continue
                seen.update({mark, row['title'].lower()})
                stories.append({'platform': 'news', 'title': row['title'], 'url': row['url'], 'source': row['source'], 'figure': len(row['related']),
                                'provinces': {}, 'related': row['related'], 'section': section})

        # Searches: the country's list, then every province's. A term is one signal however many lists carry it.
        terms, provinces_read = {}, []
        national = await _trending(client, 'ID')
        if not national:
            missing.append('search')
        for row in national:
            terms.setdefault(_term(row['term']), {'figure': row['searches'], 'provinces': {}, 'related': row['news']})
        for code in PROVINCES:
            rows = await _trending(client, code)
            if pause:
                await asyncio.sleep(pause)
            if not rows:
                missing.append(code)
                continue
            provinces_read.append(code)
            for row in rows:
                term = terms.setdefault(_term(row['term']), {'figure': None, 'provinces': {}, 'related': row['news']})
                term['provinces'][code] = max(row['searches'], term['provinces'].get(code, 0))
                term['related'] = term['related'] or row['news']
        on_country = [(name, term) for name, term in terms.items() if term['figure'] is not None]
        local = sorted(((name, term) for name, term in terms.items() if term['figure'] is None),
                       key=lambda pair: (-len(pair[1]['provinces']), -max(pair[1]['provinces'].values(), default=0), pair[0]))[:LOCAL_TERMS]
        searches = [{'platform': 'search', 'title': name, 'url': None, 'source': None, 'figure': term['figure'], 'provinces': term['provinces'],
                     'related': term['related'][:3], 'section': None} for name, term in on_country + local]

        key = credential(settings, 'YOUTUBE_API_KEY')
        key = key.get_secret_value() if hasattr(key, 'get_secret_value') else (key or '')
        videos = await _videos(client, key) if key else None
        if videos is None:
            missing.append('youtube')
        watched = [{'platform': 'youtube', **video, 'provinces': {}, 'related': []} for video in videos or []]
    finally:
        if own:
            await client.aclose()
    for number, signal in enumerate(stories + searches + watched, 1):
        signals.append({'id': f'S{number}', **signal})
    return {'signals': signals, 'missing': missing, 'provinces_read': provinces_read}

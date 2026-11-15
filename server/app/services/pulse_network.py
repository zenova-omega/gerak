"""Deterministic sample analysis. No inferred identity, location or bot probability."""
import math
import re
from collections import Counter, defaultdict
from datetime import timezone

from .pulse_measures import (account_key, account_name, content_shares, first_sort_key, has_clock, interactions_total,
                              local_day, post_account, read_time, reported)


def timestamp(value):
    """A time as an aware UTC datetime, read by `read_time`; None when it cannot be read."""
    moment = read_time(value)
    return None if moment is None else moment.replace(tzinfo=timezone.utc)


def first_order(post):
    """The order of "who was first" (clock_v1), see `first_sort_key`."""
    return first_sort_key(post.get('published_at'), post['id'])


def is_later(post, first):
    """Published after `first`: on a later day, or the same day with both clocks and a later time. A date-only post of
    the first post's day is not known to be later."""
    day, first_day = local_day(post.get('published_at')), local_day(first.get('published_at'))
    if day is None or first_day is None or day != first_day:
        return day is not None and first_day is not None and day > first_day
    return has_clock(post.get('published_at')) and has_clock(first.get('published_at')) and \
        read_time(post['published_at']) > read_time(first['published_at'])


def normalized(post):
    # Use title for video/news (descriptions contain repeated channel boilerplate).
    text = post.get('text') if post.get('platform') == 'x' else post.get('title')
    text = re.sub(r'https?://\S+|(?<!\w)@[A-Za-z0-9_]+', ' ', text or '')
    return ' '.join(re.findall(r'\w+', text.lower()))


def observed_total(rows, key):
    """Sum of one reported metric over the posts of one narrative; None when none reports it.

    Shares are content_shares_v1, since a narrative is one piece of content: a repost's carried count
    (`original_shares`, see `mark_repost`) is taken once, the largest, where it exceeds the posts' own."""
    if key == 'shares':
        return content_shares(rows)
    values = [n for n in (reported((p.get('metrics') or {}).get(key)) for p in rows) if n is not None]
    return sum(values) if values else None


def known_followers(rows):
    """Largest follower count seen on an account's posts; None when no post carries one.

    Followers are reported per post at collection time, so the same account can show several figures. The
    largest is the closest to its present audience. A missing count stays None: it is unknown, not zero."""
    counts = [value for value in ((p.get('metrics') or {}).get('author_followers') for p in rows)
              if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0]
    return max(counts, default=None)


def evidence(post):
    return {k: post.get(k) for k in ('id', 'author', 'platform', 'title', 'published_at', 'url')}


def analyze_network(posts):
    sample = posts[:1000]
    by_account, nodes, edges = defaultdict(list), {}, {}
    for p in sample:
        key = post_account(p)
        if not key:
            continue
        by_account[key].append(p)
        nodes[key] = {'id': key, 'label': None, 'platform': p.get('platform'), 'observed': True}
    for key, rows in by_account.items():
        nodes[key]['label'] = account_name(rows)   # account_v1: the most recently published name; None when none has one

    def link(source, target, kind, p):
        if source == target:
            return
        key = (source, target, kind) if kind == 'mention' else (*sorted((source, target)), kind)
        edge = edges.setdefault(key, {'source': key[0], 'target': key[1], 'kind': kind, 'count': 0, 'evidence': []})
        if p['id'] not in {e['id'] for e in edge['evidence']}:
            edge['count'] += 1
            edge['evidence'].append(evidence(p))

    for p in sample:
        source = post_account(p)
        if p.get('platform') != 'x' or not source:
            continue
        for handle in set(re.findall(r'(?<![\w@])@([A-Za-z0-9_]{1,15})\b', p.get('text') or '')):
            target = account_key('x', handle, None)   # a mention names a handle: the X key of account_v1
            nodes.setdefault(target, {'id': target, 'label': '@' + handle, 'platform': 'x', 'observed': False})
            link(source, target, 'mention', p)

    # Greedy representative-based lexical clusters: no transitive similarity chains.
    groups = []
    for p in sorted(sample, key=first_order):
        tokens = set(normalized(p).split())
        if len(tokens) < 8:
            continue
        for group in groups:
            union = tokens | group['tokens']
            if len(tokens & group['tokens']) / len(union) >= .65:
                group['posts'].append(p)
                break
        else:
            groups.append({'tokens': tokens, 'posts': [p]})
    narratives = []
    shared = Counter()   # per account: similar-content groups it shares with at least two other accounts
    for group in groups:
        rows = group['posts']
        authors = {key for key in map(post_account, rows) if key}
        if len(authors) < 2:
            continue
        if len(authors) >= 3:
            shared.update(authors)
        dated = [p for p in rows if timestamp(p.get('published_at'))]
        first = dated[0] if dated else None   # rows come in first_order (clock_v1)
        later = {post_account(p) for p in dated if first and is_later(p, first) and post_account(p) != post_account(first)} - {None}
        # A time tie counts posts with a clock only; a date-only first post ties with nobody by time.
        tied = 0 if not first else 1 if not has_clock(first['published_at']) else \
            sum(has_clock(p['published_at']) and read_time(p['published_at']) == read_time(first['published_at']) for p in dated)
        # Similarity edges have no causal direction and point to evidence on both sides.
        anchor = next((p for p in rows if post_account(p)), None)
        for p in rows:
            if anchor and post_account(p):
                link(post_account(anchor), post_account(p), 'similarity', anchor)
                link(post_account(anchor), post_account(p), 'similarity', p)
        narratives.append({'id': str(rows[0]['id']), 'title': rows[0].get('title') or rows[0].get('text', '')[:160],
                           'post_count': len(rows), 'account_count': len(authors), 'later_accounts': len(later),
                           'first_observed': evidence(first) if first else None,
                           'tied_first_count': tied,
                           # Posts whose source gave a date only: they take part in "who was first" by their day only.
                           'date_only_posts': sum(not has_clock(p['published_at']) for p in dated),
                           'timeline': [evidence(p) for p in rows],
                           'engagement': interactions_total(rows)['value'], 'interaction_posts': interactions_total(rows)['posts'],
                           # Last recorded numbers of every post in the group, added up. None when no post reports that number.
                           'metrics': {key: observed_total(rows, key) for key in ('likes', 'comments', 'shares', 'views')}})
    accounts = []
    for key, rows in by_account.items():
        # The 10-minute window reads posts with a clock only (clock_v1); date-only posts are counted as left out.
        dates = sorted(read_time(p['published_at']) for p in rows if has_clock(p.get('published_at')))
        date_only = sum(1 for p in rows if timestamp(p.get('published_at')) and not has_clock(p.get('published_at')))
        firsts = sorted((p for p in rows if timestamp(p.get('published_at'))), key=first_order)
        texts = Counter(normalized(p) for p in rows if len(normalized(p).split()) >= 8)
        repeated = max(texts.values(), default=0)
        peak, left = 0, 0
        for right, dt in enumerate(dates):
            while (dt - dates[left]).total_seconds() > 600:
                left += 1
            peak = max(peak, right - left + 1)
        signals = []
        if repeated >= 3:
            signals.append({'kind': 'repetition', 'detail': f'{repeated} posting memiliki teks identik setelah normalisasi.'})
        if peak >= 5:
            signals.append({'kind': 'burst', 'detail': f'{peak} posting teramati dalam jendela 10 menit.'})
        if shared[key] >= 2:
            signals.append({'kind': 'shared_copy', 'detail': f'Teksnya serupa dengan akun lain di {shared[key]} kelompok konten, masing-masing dipakai tiga akun atau lebih.'})
        # Two different amplification behaviours together are worth a named pattern. It describes what the
        # account did in this sample; it is not a probability and says nothing about who runs the account.
        accounts.append({**nodes[key], 'posts': len(rows), 'signals': signals, 'pattern': 'amplification' if len(signals) >= 2 else None,
                         'assessment': 'review_signals' if signals else 'insufficient_data' if len(rows) < 5 else 'no_signals_observed',
                         'first_seen': timestamp(firsts[0]['published_at']).isoformat() if firsts else None,
                         'date_only_posts': date_only,
                         'engagement': interactions_total(rows)['value'], 'interaction_posts': interactions_total(rows)['posts'],
                         'followers': known_followers(rows),
                         'evidence': [evidence(p) for p in rows]})
    degree = Counter()
    for edge in edges.values():
        degree[edge['source']] += edge['count']
        degree[edge['target']] += edge['count']
    for node in nodes.values():
        node['connections'] = degree[node['id']]
        node['posts'] = len(by_account[node['id']])
        # The map sizes a circle by this. Accounts that were only mentioned have no post, so no count.
        node['followers'] = known_followers(by_account[node['id']])
    ordered = sorted((p for p in sample if timestamp(p.get('published_at'))), key=first_order)
    return {'nodes': list(nodes.values()), 'edges': list(edges.values()),
            'narratives': sorted(narratives, key=lambda n: (-n['account_count'], -n['post_count'])),
            'earliest': [evidence(p) for p in ordered[:10]],
            'accounts': sorted(accounts, key=lambda a: (-len(a['signals']), -a['posts'])),
            'analyzed_posts': len(sample), 'total_posts': len(posts), 'sample_limit': 1000}

"""Deterministic sample analysis. No inferred identity, location or bot probability."""
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone


def timestamp(value):
    try:
        dt = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace('Z', '+00:00'))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except (ValueError, TypeError, AttributeError):
        return None


def normalized(post):
    # Use title for video/news (descriptions contain repeated channel boilerplate).
    text = post.get('text') if post.get('platform') == 'x' else post.get('title')
    text = re.sub(r'https?://\S+|(?<!\w)@[A-Za-z0-9_]+', ' ', text or '')
    return ' '.join(re.findall(r'\w+', text.lower()))


def account_key(post):
    platform = post.get('platform') or 'unknown'
    # X handles are case insensitive. Other platforms use provider IDs when present.
    identity = (post.get('author') or '').lstrip('@').lower() if platform == 'x' else str((post.get('metrics') or {}).get('author_id') or post.get('author') or '')
    return f'{platform}:{identity}'


def evidence(post):
    return {k: post.get(k) for k in ('id', 'author', 'platform', 'title', 'published_at', 'url')}


def analyze_network(posts):
    sample = posts[:1000]
    by_account, nodes, edges = defaultdict(list), {}, {}
    for p in sample:
        if not p.get('author'):
            continue
        key = account_key(p)
        by_account[key].append(p)
        nodes[key] = {'id': key, 'label': p['author'], 'platform': p.get('platform'), 'observed': True}

    def link(source, target, kind, p):
        if source == target:
            return
        key = (source, target, kind) if kind == 'mention' else (*sorted((source, target)), kind)
        edge = edges.setdefault(key, {'source': key[0], 'target': key[1], 'kind': kind, 'count': 0, 'evidence': []})
        if p['id'] not in {e['id'] for e in edge['evidence']}:
            edge['count'] += 1
            edge['evidence'].append(evidence(p))

    for p in sample:
        if p.get('platform') != 'x' or not p.get('author'):
            continue
        for handle in set(re.findall(r'(?<![\w@])@([A-Za-z0-9_]{1,15})\b', p.get('text') or '')):
            target = 'x:' + handle.lower()
            nodes.setdefault(target, {'id': target, 'label': '@' + handle, 'platform': 'x', 'observed': False})
            link(account_key(p), target, 'mention', p)

    # Greedy representative-based lexical clusters: no transitive similarity chains.
    groups = []
    for p in sorted(sample, key=lambda x: (timestamp(x.get('published_at')) or datetime.max.replace(tzinfo=timezone.utc), str(x['id']))):
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
        authors = {account_key(p) for p in rows if p.get('author')}
        if len(authors) < 2:
            continue
        if len(authors) >= 3:
            shared.update(authors)
        dated = [p for p in rows if timestamp(p.get('published_at'))]
        first = dated[0] if dated else None
        later = {account_key(p) for p in dated if first and timestamp(p['published_at']) > timestamp(first['published_at']) and account_key(p) != account_key(first)}
        # Similarity edges have no causal direction and point to evidence on both sides.
        anchor = next((p for p in rows if p.get('author')), None)
        for p in rows:
            if anchor and p.get('author'):
                link(account_key(anchor), account_key(p), 'similarity', anchor)
                link(account_key(anchor), account_key(p), 'similarity', p)
        narratives.append({'id': str(rows[0]['id']), 'title': rows[0].get('title') or rows[0].get('text', '')[:160],
                           'post_count': len(rows), 'account_count': len(authors), 'later_accounts': len(later),
                           'first_observed': evidence(first) if first else None,
                           'tied_first_count': sum(timestamp(p.get('published_at')) == timestamp(first.get('published_at')) for p in dated) if first else 0,
                           'timeline': [evidence(p) for p in rows],
                           'engagement': sum((p.get('metrics') or {}).get('engagement') or 0 for p in rows)})
    accounts = []
    for key, rows in by_account.items():
        dates = sorted(timestamp(p.get('published_at')) for p in rows if timestamp(p.get('published_at')))
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
                         'first_seen': dates[0].isoformat() if dates else None,
                         'engagement': sum((p.get('metrics') or {}).get('engagement') or 0 for p in rows),
                         'evidence': [evidence(p) for p in rows]})
    degree = Counter()
    for edge in edges.values():
        degree[edge['source']] += edge['count']
        degree[edge['target']] += edge['count']
    for node in nodes.values():
        node['connections'] = degree[node['id']]
        node['posts'] = len(by_account[node['id']])
    ordered = sorted((p for p in sample if timestamp(p.get('published_at'))), key=lambda p: (timestamp(p['published_at']), str(p['id'])))
    return {'nodes': list(nodes.values()), 'edges': list(edges.values()),
            'narratives': sorted(narratives, key=lambda n: (-n['account_count'], -n['post_count'])),
            'earliest': [evidence(p) for p in ordered[:10]],
            'accounts': sorted(accounts, key=lambda a: (-len(a['signals']), -a['posts'])),
            'analyzed_posts': len(sample), 'total_posts': len(posts), 'sample_limit': 1000}

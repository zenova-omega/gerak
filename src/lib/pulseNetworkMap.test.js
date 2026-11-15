import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('the map sizes circles by followers, rings them by platform and draws each kind of relation its own way', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' });
  try {
    const { default: Explorer } = await server.ssrLoadModule('/src/components/admin/pulse/NetworkExplorer.jsx');
    const { platformColor } = await server.ssrLoadModule('/src/lib/pulseChartTheme.js');
    const evidence = (id, count = 1) => Array.from({ length: count }, (_, i) => ({ id: id + i, author: id, platform: 'x', title: 'Posting ' + id + i, published_at: '2026-11-10T00:00:00Z', url: 'https://example.com/' + id + i }));
    const nodes = [
      { id: 'x:besar', label: '@besar', platform: 'x', observed: true, connections: 3, followers: 2_000_000 },
      { id: 'tiktok:kecil', label: 'kecil', platform: 'tiktok', observed: true, connections: 1 },           // count only on its post
      { id: 'news:media', label: 'Media', platform: 'news', observed: true, connections: 1, followers: null },
      { id: 'x:disebut', label: '@disebut', platform: 'x', observed: false, connections: 1, followers: null },
    ];
    const edges = [
      // A relation is as strong as the posts that carry it: the frame counts its evidence.
      { source: 'tiktok:kecil', target: 'x:besar', kind: 'similarity', count: 6, evidence: evidence('a', 6) },
      { source: 'x:besar', target: 'x:disebut', kind: 'mention', count: 1, evidence: evidence('b', 1) },
      { source: 'news:media', target: 'x:besar', kind: 'mention', count: 3, evidence: evidence('c', 3) },
    ];
    const data = { nodes, edges, accounts: nodes.filter(node => node.observed).map(node => ({ id: node.id, evidence: evidence(node.id) })), analyzed_posts: 3 };
    const posts = [{ id: 'tiktok:kecil0', platform: 'tiktok', author: 'kecil', metrics: { author_followers: 1500 } }];
    const html = renderToStaticMarkup(React.createElement(Explorer, { data, posts }));
    const part = label => html.slice(html.indexOf(`aria-label="Pilih akun ${label},`)).split('</g>')[0];
    const radius = label => Number(part(label).match(/class="nx-node-ring" r="([\d.]+)"/)[1]);

    // Size: more followers, larger circle; no known count is the smallest size, whatever the platform.
    assert.ok(radius('@besar') > radius('kecil') && radius('kecil') > radius('Media'));
    assert.equal(radius('Media'), radius('@disebut'));
    assert.match(html, /aria-label="Pilih akun @besar, X, 2\.000\.000 pengikut"/);
    assert.match(html, /aria-label="Pilih akun kecil, TikTok, 1\.500 pengikut"/);
    assert.match(html, /aria-label="Pilih akun Media, Berita, jumlah pengikut tidak diketahui"/);

    // Colour: the ring takes the product-wide platform colour, and the platform is also named without colour.
    for (const [label, platform] of [['@besar', 'x'], ['kecil', 'tiktok'], ['Media', 'news']]) {
      const before = html.slice(0, html.indexOf(`aria-label="Pilih akun ${label},`));
      assert.ok(before.slice(before.lastIndexOf('<g class="nx-account-node"')).includes(`--nx-node:${platformColor(platform)}`), label);
      assert.match(part(label) + '</g>', /class="nx-node-badge"/);
    }
    assert.notEqual(platformColor('x'), platformColor('tiktok'));
    assert.match(html, /<g class="nx-account-node"[^>]*data-mentioned=""[^>]*aria-label="Pilih akun @disebut,/);

    // Lines: a mention is a solid arrow, similar content a dashed line without a head, thicker with more posts.
    const lines = [...html.matchAll(/<g class="nx-edge" data-kind="(\w+)"[^>]*><path d="[^"]+" stroke-width="([\d.]+)"( stroke-dasharray="[^"]+")?\s*\/?>(?:<\/path>)?(<polygon)?/g)].map(match => ({ kind: match[1], width: Number(match[2]), dashed: Boolean(match[3]), head: Boolean(match[4]) }));
    assert.equal(lines.length, 3);
    for (const line of lines) assert.equal(line.dashed, line.kind === 'similarity'), assert.equal(line.head, line.kind === 'mention');
    const widths = lines.map(line => line.width).sort((a, b) => a - b);
    assert.ok(widths[0] < widths[1] && widths[1] < widths[2], widths.join(' '));
    assert.equal(lines.find(line => line.kind === 'similarity').width, widths[2]);   // six posts link that pair

    // The key says what the map now shows.
    for (const text of ['Makin besar, makin banyak pengikut', 'Paling kecil: pengikut tidak diketahui', 'Panah: menyebut akun', 'Putus-putus: konten serupa', 'Makin tebal, makin banyak posting penghubung']) assert.ok(html.includes(text), text);
    assert.doesNotMatch(html, /lebih banyak hubungan/);
    assert.doesNotMatch(html.slice(html.indexOf('class="nx-legend')).split('</div>')[0], /—/);
  } finally { await server.close(); }
});

test('an account no post names (account_v1: a channel known by its id) is drawn and listed as "Nama tidak tersedia"', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' });
  try {
    const { default: Explorer } = await server.ssrLoadModule('/src/components/admin/pulse/NetworkExplorer.jsx');
    const evidence = id => [{ id, author: '', platform: 'youtube', title: 'Video ' + id, published_at: '2026-11-10T00:00:00Z', url: 'https://example.com/' + id }];
    const nodes = [
      { id: 'youtube:UC9', label: null, platform: 'youtube', observed: true, connections: 1, followers: null },
      { id: 'youtube:UC1', label: 'Kanal', platform: 'youtube', observed: true, connections: 1, followers: null },
    ];
    const edges = [{ source: 'youtube:UC1', target: 'youtube:UC9', kind: 'similarity', count: 1, evidence: [...evidence('a'), ...evidence('b')] }];
    const data = { nodes, edges, accounts: nodes.map(node => ({ id: node.id, label: node.label, evidence: evidence(node.id) })), analyzed_posts: 2 };
    const html = renderToStaticMarkup(React.createElement(Explorer, { data, posts: [] }));
    assert.match(html, /aria-label="Pilih akun Nama tidak tersedia, YouTube, jumlah pengikut tidak diketahui"/);
    assert.doesNotMatch(html, /null/);
  } finally { await server.close(); }
});

test('the faces beside a repeated text are its accounts by account_v1, one per account the count names', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' });
  try {
    const { default: Analysis } = await server.ssrLoadModule('/src/components/admin/pulse/NetworkAnalysis.jsx');
    const entry = (id, platform, author, day) => ({ id, author, platform, title: 'teks sama', published_at: `2026-11-${day}T03:00:00Z`, url: 'https://example.com/' + id });
    // One X handle written two ways and one renamed YouTube channel (its id is on the full post, not on the timeline entry).
    const timeline = [entry('1', 'x', 'Okezonenews', '10'), entry('2', 'x', '@okezonenews', '11'), entry('3', 'youtube', 'Kanal Lama', '09'), entry('4', 'youtube', 'Kanal Baru', '12')];
    const posts = timeline.map(row => ({ ...row, metrics: row.platform === 'youtube' ? { author_id: 'UC1' } : {} }));
    const data = { nodes: [], edges: [], accounts: [], earliest: [], analyzed_posts: 4, total_posts: 4,
      narratives: [{ id: '1', title: 'teks sama', post_count: 4, account_count: 2, later_accounts: 1, timeline, metrics: {}, engagement: null, interaction_posts: 0 }] };
    const html = renderToStaticMarkup(React.createElement(Analysis, { data, posts }));
    const faces = html.match(/<span class="pn-faces" aria-hidden="true">([\s\S]*?)<\/span><b>/)[1];
    assert.equal((faces.match(/ps-profile-avatar/g) || []).length, 2);
  } finally { await server.close(); }
});

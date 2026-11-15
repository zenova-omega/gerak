// The growth table, the chart tooltip and the places where an account is named: each shows who it is with the
// account's picture when one is known, and none of them runs two facts together without a gap.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

let server;
before(async () => { server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' }); });
after(async () => { await server?.close(); });
const load = path => server.ssrLoadModule(path);
const html = element => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse/overview'] }, element));
const photo = 'https://pbs.twimg.com/profile_images/1/gibran_200x200.jpg';

const posts = [
  { id: 'p1', platform: 'x', author: 'gibran_rakabuming', text: 'Saya   sampaikan pengunduran diri\nhari ini.', published_at: '2026-11-14T10:00:00Z', metrics: { profile_image_url: photo, like_count: 9 } },
  { id: 'p2', platform: 'tiktok', author: 'tearsafterain', title: 'Wapres mundur?', published_at: '2026-11-14T10:00:00Z', metrics: {} },
  { id: 'p3', platform: 'x', author: 'tanpa_riwayat', text: 'tidak ada riwayat', metrics: {} },
];
const growthRow = (id, more) => ({ id, platform: 'x', author: 'x', availability: { growth: true }, reset_detected: false, ...more });
const growth = { posts: [
  growthRow('p2', { platform: 'tiktok', author: 'tearsafterain', delta_engagement: 95, elapsed_hours: 2 / 60, rate_per_hour: 2850, acceleration_per_hour_squared: null,
    previous_observed_at: '2026-11-14T10:32:00Z', latest_observed_at: '2026-11-14T10:34:00Z', first_observed_growth_at: null }),
  growthRow('p1', { author: 'gibran_rakabuming', delta_engagement: 12414, elapsed_hours: 2.05, rate_per_hour: 6087.7, acceleration_per_hour_squared: -4,
    previous_observed_at: '2026-11-14T22:09:00Z', latest_observed_at: '2026-11-15T00:12:00Z', first_observed_growth_at: '2026-11-14T10:09:00Z' }),
] };

async function growthHtml(props = {}) {
  const { default: GrowthEvidence } = await load('/src/pulse/GrowthEvidence.jsx');
  return html(React.createElement(GrowthEvidence, { data: growth, posts, loaded: true, onOpen() {}, ...props }));
}
const bodyRows = markup => (markup.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0] || '').split(/(?=<tr)/).slice(1);

test('growth: the fastest post is first and each row shows who posted, with the account picture', async () => {
  const rows = bodyRows(await growthHtml());
  assert.equal(rows.length, 2);
  assert.match(rows[0], /gibran_rakabuming/);
  assert.match(rows[0], /<img[^>]+class="psi-photo"[^>]+src="https:\/\/pbs\.twimg\.com\/profile_images\/1\/gibran_200x200\.jpg"/);
  assert.match(rows[1], /tearsafterain/);
  assert.match(rows[1], /psi-fallback/, 'no picture known: initials, never a broken image');
});

test('growth: a row says what the post is, in one line of its own words', async () => {
  const rows = bodyRows(await growthHtml());
  assert.match(rows[0], /Saya sampaikan pengunduran diri hari ini\./);
  assert.match(rows[1], /Wapres mundur\?/);
});

test('growth: the addition states how long it took, so a two-minute reading is not mistaken for a trend', async () => {
  const rows = bodyRows(await growthHtml());
  assert.match(rows[0], /\+12\.414<\/b><small>dalam 2 jam 3 menit<\/small>/);
  assert.match(rows[1], /\+95<\/b><small>dalam 2 menit<\/small>/);
});

test('growth: the rate has a bar sized against the fastest row', async () => {
  const rows = bodyRows(await growthHtml());
  assert.match(rows[0], /6\.087,7<\/b><span class="pge-bar" style="--share:1"/);
  assert.match(rows[1], /2\.850<\/b><span class="pge-bar" style="--share:0\.468\d*"/);
});

test('growth: the change of pace is a tag, and the first observed growth is never glued to it', async () => {
  const markup = await growthHtml();
  const rows = bodyRows(markup);
  assert.match(rows[0], /class="pu-tag[^"]*"[^>]*>[\s\S]*?Melambat/);
  assert.match(rows[1], /data-tone="unknown"[^>]*>[\s\S]*?Belum cukup data/);
  assert.doesNotMatch(markup, /(Melambat|Mempercepat|Tetap|Belum cukup data)Pertumbuhan teramati/);
  assert.match(rows[0], /15 Nov 2026, 05\.09 → 07\.12 WIB<\/span><small>Tumbuh sejak 14 Nov 2026, 17\.09 WIB<\/small>/);
  assert.doesNotMatch(rows[1], /Pertumbuhan teramati sejak/);
});

test('growth: every column has a header and the post is the row header', async () => {
  const markup = await growthHtml();
  for (const name of ['Posting', 'Tambahan interaksi', 'Per jam', 'Perubahan laju', 'Pengamatan']) assert.match(markup, new RegExp(`<th scope="col"[^>]*>${name}</th>`));
  assert.equal((markup.match(/<th scope="row"/g) || []).length, 2);
  assert.match(markup, /2 dari 3 posting dapat dibandingkan\./);
});

test('growth: pressing a row opens that post', async () => {
  const { default: GrowthEvidence } = await load('/src/pulse/GrowthEvidence.jsx');
  const opened = [];
  const tree = GrowthEvidence({ data: growth, posts, loaded: true, onOpen: (title, list) => opened.push([title, list.map(post => post.id)]) });
  const buttons = [];
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.props?.className === 'pge-post') buttons.push(node);
    walk(node.props?.children);
  })(tree);
  assert.equal(buttons.length, 2);
  buttons[0].props.onClick();
  assert.deepEqual(opened, [['Pertumbuhan interaksi', ['p1']]]);
});

test('growth: nothing comparable still says so and draws no table', async () => {
  const markup = await growthHtml({ data: { posts: [] } });
  assert.match(markup, /Belum cukup pengamatan/);
  assert.doesNotMatch(markup, /<table/);
});

const tipRows = [
  { dataKey: 'positive', name: 'Positif', value: 82, color: 'green' },
  { dataKey: 'neutral', name: 'Netral', value: 494, color: 'grey' },
  { dataKey: 'negative', name: 'Negatif', value: 648, color: 'red' },
];
const top = () => [
  { id: 'a', author: 'rianfahardhi', platform: 'tiktok', photo, text: 'wapres gibran ajukan pengunduran diri?', value: 199190 },
  { id: 'b', author: '', platform: 'x', text: 'tanpa nama', value: null },
];
async function tipHtml(props = {}) {
  const { PulseChartTooltip } = await load('/src/components/ui/PulseAnalytics.jsx');
  return html(React.createElement(PulseChartTooltip, { active: true, payload: tipRows, label: '10 Nov', total: true, percent: true, top, topUnit: 'Interaksi', ...props }));
}

test('tooltip: the date and the total share the head, so the total is not a row of its own', async () => {
  const markup = await tipHtml();
  assert.match(markup, /<header class="pu-hover-head"><strong>10 Nov<\/strong><span>Total <b>1\.224<\/b><\/span><\/header>/);
  assert.doesNotMatch(markup, /<small>Total/);
});

test('tooltip: the shares are drawn as one bar and each row keeps its count and its share apart', async () => {
  const markup = await tipHtml();
  const bar = markup.match(/<span class="pu-hover-bar"[^>]*>([\s\S]*?)<\/span>/)?.[1] || '';
  assert.equal((bar.match(/<i /g) || []).length, 3);
  assert.match(bar, /flex-grow:648/);
  assert.match(markup, /Negatif<b>648<\/b><em>53%<\/em>/);
  assert.match(markup, /Positif<b>82<\/b><em>7%<\/em>/);
});

test('tooltip: tone shares are tone_share_v1, of the analysed posts; "belum dianalisis" keeps its count and has no share', async () => {
  const rows = [
    { dataKey: 'positive', name: 'Positif', value: 1, color: 'green' },
    { dataKey: 'neutral', name: 'Netral', value: 299, color: 'grey' },
    { dataKey: 'negative', name: 'Negatif', value: 0, color: 'red' },
    { dataKey: 'unknown', name: 'Belum dianalisis', value: 100, fill: 'url(#hatch)' },
  ];
  const markup = await tipHtml({ payload: rows, top: undefined });
  assert.match(markup, /Positif<b>1<\/b><em>&lt;1%<\/em>/, 'one post of 300 is a sliver, not 0%');
  assert.match(markup, /Netral<b>299<\/b><em>100%<\/em>/, 'the same with the unknown row shown or hidden');
  assert.match(markup, /Belum dianalisis<b>100<\/b><\/li>/);
  const hidden = await tipHtml({ payload: rows.slice(0, 3), top: undefined });
  assert.match(hidden, /Netral<b>299<\/b><em>100%<\/em>/);
  const waiting = await tipHtml({ payload: [{ ...rows[2] }, rows[3]], top: undefined });
  assert.doesNotMatch(waiting, /<em>/, 'nothing analysed that day: no percentage at all');
});

test('tooltip: without shares there is no bar and no percent', async () => {
  const markup = await tipHtml({ percent: false });
  assert.doesNotMatch(markup, /pu-hover-bar/);
  assert.doesNotMatch(markup, /<em>/);
});

test('tooltip: the top posts say what their number counts and show the account picture', async () => {
  const markup = await tipHtml();
  assert.match(markup, /<p class="pu-chart-top-head"><span>Posting teratas<\/span><span>Interaksi<\/span><\/p>/);
  const list = markup.match(/<ol class="pu-chart-top"[\s\S]*?<\/ol>/)?.[0] || '';
  const [first, second] = list.split(/(?=<li)/).slice(1);
  assert.match(first, /<img[^>]+class="psi-photo"[^>]+gibran_200x200\.jpg/);
  assert.match(first, /<img[^>]+loading="eager"/, 'a card that appears under the pointer does not wait to fetch its pictures');
  assert.match(first, /<b>rianfahardhi<\/b><span>wapres gibran ajukan pengunduran diri\?<\/span>/);
  assert.match(first, /<i>199\.190<\/i>/);
  assert.match(second, /psi-fallback/);
  assert.match(second, /<b>Tanpa nama<\/b>/);
  assert.match(second, /<i>—<\/i>/);
});

test('tooltip: the name in a top post is not pushed to the right by the rule for the count column', () => {
  const css = readFileSync(new URL('./ds/analytics-kit.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.pu-chart-tooltip li > b\s*\{[^}]*margin-left:\s*auto/, 'that selector also matches the account name in the list of top posts');
  assert.match(css, /\.pu-hover-rows > li > b[^{]*\{[^}]*margin-left:\s*auto/);
});

test('sentiment chart hands the tooltip the platform and the picture of each top post', () => {
  const source = readFileSync(new URL('./SentimentAnalytics.jsx', import.meta.url), 'utf8');
  const line = source.split('\n').find(text => text.includes('const topOfDay=')) || '';
  assert.match(line, /platform:post\.platform/);
  assert.match(line, /photo:accountPhoto\(post\)/);
  assert.match(source, /topUnit="Interaksi"/);
});

const comment = more => ({ id: 'c1', author: 'sagitariussssgirls', text: 'semangat pak', likes: 3, replies: 0, published_at: '2026-11-14T10:00:00Z', url: 'https://www.tiktok.com/@a/video/1', ...more });

test('an account picture in the page itself is still fetched only when it comes into view', async () => {
  const { default: PostAvatar } = await load('/src/components/admin/pulse/PostAvatar.jsx');
  assert.match(html(React.createElement(PostAvatar, { post: { author: 'a', platform: 'x', profile_image_url: photo } })), /<img[^>]+loading="lazy"/);
});

test('a comment shows the picture stored with it', async () => {
  const { Comment } = await load('/src/components/admin/pulse/CommentsPanel.jsx');
  const markup = html(React.createElement(Comment, { comment: comment({ profile_image_url: 'https://yt3.ggpht.com/abc=s88-c-k-c0x00ffffff-no-rj' }), platform: 'youtube' }));
  assert.match(markup, /<img[^>]+class="psi-photo"[^>]+src="https:\/\/yt3\.ggpht\.com\/abc=s88-c-k-c0x00ffffff-no-rj"/);
});

test('a comment without a stored picture shows initials and the platform mark', async () => {
  const { Comment } = await load('/src/components/admin/pulse/CommentsPanel.jsx');
  const markup = html(React.createElement(Comment, { comment: comment(), platform: 'tiktok' }));
  assert.match(markup, /psi-fallback[^>]*>SA</);
  assert.match(markup, /aria-label="TikTok"/);
});

test('comments under a post use the stored picture too', async () => {
  const { PostComments } = await load('/src/components/admin/pulse/CommentsPanel.jsx');
  const post = { id: 'p', platform: 'youtube', metrics: { comment_snapshot: { status: 'success', fetched_at: '2026-11-14T10:00:00Z', items: [comment({ profile_image_url: 'https://yt3.ggpht.com/abc=s88' })] } } };
  assert.match(html(React.createElement(PostComments, { post })), /<img[^>]+class="psi-photo"[^>]+src="https:\/\/yt3\.ggpht\.com\/abc=s88"/);
});

test('the comment evidence under the response breakdown and the seed post name their account with a picture slot', () => {
  const response = readFileSync(new URL('./ResponseAnalysisPanel.jsx', import.meta.url), 'utf8');
  assert.match(response, /<AccountAvatar size="sm" author=\{row\.author\} platform=\{row\.platform\|\|row\.post\?\.platform\} photo=\{row\.profile_image_url\}/);
  const seed = readFileSync(new URL('./SeedPostPreview.jsx', import.meta.url), 'utf8');
  assert.match(seed, /<PostAvatar size="sm" post=\{post\}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const issue = (rank, title, regions = [], more = {}) => ({ key: 'k' + rank, scope: 'national', rank, title, category: 'politik', reason: 'Ramai.',
  platforms: { news: { count: 5 } }, regions, evidence_titles: [], query: { q: title }, movement: null, project: null, ...more });
const region = (code, searches) => ({ code, searches });
const issues = [
  issue(1, 'Pengunduran diri Wapres', [region('ID-JK', 2000), region('ID-JI', 1000), region('ID-JB', 500)]),
  issue(2, 'Timnas Indonesia', [region('ID-JK', 200), region('ID-JI', 500)]),
  issue(3, 'Perampokan di Malang', [region('ID-JI', 200)], { evidence_titles: ['Dua perampok di Malang ditangkap', 'Polisi Bogor ikut memburu'] }),
];

async function render(props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: RadarMap } = await server.ssrLoadModule('/src/pulse/RadarMap.jsx');
    return renderToStaticMarkup(React.createElement(RadarMap, props));
  } finally { await server.close(); }
}
const provinces = html => [...html.matchAll(/<path[^>]*class="rdm-province"[^>]*>/g)].map(match => match[0]);
const labelled = (html, name) => provinces(html).find(tag => tag.includes(`aria-label="${name}`)) || '';
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('every province is a labelled control that says how many issues are loud there', async () => {
  const html = await render({ issues, province: 'ID-JI' });
  assert.equal(provinces(html).length, 34);
  assert.ok(provinces(html).every(tag => /role="button"/.test(tag) && /tabindex="0"/.test(tag)));
  assert.match(labelled(html, 'Jawa Timur: 3 isu ramai'), /data-shade="3"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-shade="3"/);
  assert.match(labelled(html, 'DKI Jakarta: 2 isu ramai'), /data-shade="2"/);
  assert.match(labelled(html, 'Jawa Barat: 1 isu ramai'), /data-shade="1"/);
  assert.match(labelled(html, 'Bali: tidak ada isu dari daftar ini'), /data-shade="0"/);
  assert.equal(provinces(html).filter(tag => /aria-pressed="true"/.test(tag)).length, 1);
});

test('with many issues the shades are spread over the busiest province and the legend says the ranges', async () => {
  const many = Array.from({ length: 7 }, (_, index) => issue(index + 1, 'Isu ' + (index + 1), [region('ID-JI', 500), ...(index < 4 ? [region('ID-JK', 500)] : []), ...(index < 2 ? [region('ID-BA', 500)] : [])]));
  const html = await render({ issues: many });
  assert.match(labelled(html, 'Jawa Timur: 7 isu ramai'), /data-shade="3"/);
  assert.match(labelled(html, 'DKI Jakarta: 4 isu ramai'), /data-shade="2"/);
  assert.match(labelled(html, 'Bali: 2 isu ramai'), /data-shade="1"/);
  assert.match(text(html), /Isu yang ramai di provinsi: 1–2 3–4 5–7/);
  assert.match(text(await render({ issues })), /Isu yang ramai di provinsi: 1 2 3/);
});

test('a province whose list was not read says so and is not drawn as zero', async () => {
  const html = await render({ issues, provincesRead: ['ID-JK', 'ID-JI', 'ID-JB', 'ID-BA'] });
  assert.match(labelled(html, 'Papua: daftar tidak terbaca'), /data-shade="unread"/);
  assert.match(labelled(html, 'Bali: tidak ada isu dari daftar ini'), /data-shade="0"/);
  assert.match(text(html), /daftar tidak terbaca/, 'the legend explains the hatch');
  assert.doesNotMatch(text(await render({ issues })), /daftar tidak terbaca/, 'with every list read the legend has no such entry');
});

test('one chosen issue draws only its provinces, shaded by searches, and pins the places it names', async () => {
  const html = await render({ issues, selectedIssue: issues[2] });
  assert.match(labelled(html, 'Jawa Timur: 200+ pencarian'), /data-shade="1"/);
  assert.match(labelled(html, 'DKI Jakarta: tidak masuk pencarian populer'), /data-shade="0"/);
  assert.equal((html.match(/class="rdm-pin"/g) || []).length, 2);
  assert.match(text(html), /Sebaran isu: Perampokan di Malang/);
  assert.match(text(html), /Tempat yang disebut: Malang, Bogor/);
  const partly = await render({ issues, selectedIssue: issues[2], provincesRead: ['ID-JI', 'ID-JK'] });
  assert.match(labelled(partly, 'Papua: daftar tidak terbaca'), /data-shade="unread"/, 'with one issue drawn, a province whose list was not read is still not a "no"');
  assert.match(labelled(partly, 'DKI Jakarta: tidak masuk pencarian populer'), /data-shade="0"/);
  assert.match(partly.match(/<details[^>]*class="rdm-data"[\s\S]*?<\/details>/)[0], /Papua<\/th><td[^>]*>tidak terbaca</);
  assert.match(text(partly), /daftar tidak terbaca/, 'and the legend explains the hatch here too');
  const loud = await render({ issues, selectedIssue: issues[0] });
  assert.match(labelled(loud, 'DKI Jakarta: 2.000+ pencarian'), /data-shade="3"/);
  assert.match(labelled(loud, 'Jawa Timur: 1.000+ pencarian'), /data-shade="2"/);
  assert.equal((loud.match(/class="rdm-pin"/g) || []).length, 0);
});

test('the legend and the table of numbers are always there, and the map names what it is drawn from', async () => {
  const html = await render({ issues });
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    assert.equal((await server.ssrLoadModule('/src/pulse/RadarMap.jsx')).MAP_SOURCE, 'Peta memakai pencarian populer per provinsi dan tempat yang disebut berita. X, TikTok, dan Instagram tidak memberi lokasi.');
  } finally { await server.close(); }
  assert.match(text(html), /Isu yang ramai di provinsi/);
  const data = html.match(/<details[^>]*class="rdm-data"[\s\S]*?<\/details>/)[0];
  assert.match(data, /<summary[^>]*>Lihat angka<\/summary>/);
  assert.deepEqual([...data.matchAll(/<th[^>]*scope="col"[^>]*>([^<]*)</g)].map(match => match[1]), ['Provinsi', 'Isu ramai', 'Isu teratas']);
  assert.equal((data.match(/<tr/g) || []).length, 35, 'a heading row and every province');
  assert.match(data, /Jawa Timur<\/th><td[^>]*>3<\/td><td[^>]*>Pengunduran diri Wapres</);
});

test('with a province chosen there is a way back to the whole country', async () => {
  assert.match(await render({ issues, province: 'ID-JI' }), /<button[^>]*>Seluruh Indonesia<\/button>/);
  assert.doesNotMatch(await render({ issues }), /Seluruh Indonesia/);
});

test('with nothing to draw the map says so instead of showing an empty country', async () => {
  assert.match(text(await render({ issues: [] })), /Belum ada isu yang masuk pencarian populer provinsi pada daftar ini\./);
});

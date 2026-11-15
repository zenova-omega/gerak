import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordFrequency, matchingPosts, jakartaGrid, publicationHours } from './pulseInfographics.js';

test('RSS markup contributes visible words only while genuine plaintext target survives', () => {
  const posts = [{ id: 1, text: '<a href="https://example.com" target="_blank"><font color="#123">Jakarta&nbsp;banjir</font></a>' }];
  assert.deepEqual(wordFrequency(posts).terms.map(row => row.term), ['banjir', 'jakarta']);
  assert.equal(matchingPosts(posts, 'target').count, 0);
  assert.deepEqual(wordFrequency([{ text: 'target Jakarta' }]).terms.map(row => row.term), ['jakarta', 'target']);
});

test('HTML scripts styles comments attributes and entities never become keyword noise', () => {
  const posts = [{ text: '<!-- rahasia --><script>tracking rahasia</script><style>.rahasia { color: red }</style><p title="atribut > tersembunyi">Jakarta&#160;banjir &amp; warga &#x70;asar &quot;aman&quot;</p>' }];
  assert.deepEqual(wordFrequency(posts).terms.map(row => row.term), ['aman', 'banjir', 'jakarta', 'pasar', 'warga']);
});

test('words count documents, not repetitions, and exclude Indonesian stopwords, authors and URLs', () => {
  const posts = [
    { id: 'a', title: 'Banjir banjir di Jakarta dan yang', text: 'Banjir https://contoh.id/rahasia www.situs.com/iklan t.co/abc @pengguna', author: 'Rahasia' },
    { id: 'b', title: 'Jakarta untuk warga', text: 'warga dari dengan adalah pada ini itu' },
    { id: 'a', title: 'Duplicate banjir' },
  ];
  assert.deepEqual(wordFrequency(posts).terms.map(({ term, count }) => [term, count]), [['jakarta', 2], ['banjir', 1], ['warga', 1]]);
  assert.equal(wordFrequency(posts).total, 2);
});

test('word cloud caps at 24 terms and scales by document count without nonfinite sizes', () => {
  const words = Array.from({ length: 30 }, (_, i) => 'kata' + String.fromCharCode(97 + Math.floor(i / 26), 97 + i % 26));
  const result = wordFrequency([{ id: 1, title: words.join(' ') }, { id: 2, title: words[0] }]);
  assert.equal(result.terms.length, 24);
  assert.equal(result.terms[0].count, 2);
  assert.ok(result.terms[0].fontSize > result.terms[1].fontSize);
  assert.ok(result.terms.every(t => Number.isFinite(t.fontSize) && t.fontSize >= 14 && t.fontSize <= 36));
  assert.deepEqual(wordFrequency([]).terms, []);
});

test('selected term matches whole normalized words and returns only ten evidence posts with full count', () => {
  const posts = Array.from({ length: 12 }, (_, id) => ({ id, title: 'BANJIR', url: 'https://example.com/' + id }));
  posts.push({ id: 99, title: 'kebanjiran https://banjir.id' });
  assert.equal(matchingPosts(posts, 'banjir').count, 12);
  assert.deepEqual(matchingPosts(posts, 'banjir').rows.map(p => p.id), [0,1,2,3,4,5,6,7,8,9]);
  assert.equal(matchingPosts(posts, '').count, 0);
});

test('Jakarta grid keeps unknown coverage and zero cells when there are no sourced coordinates', () => {
  const result = jakartaGrid([], 42);
  assert.deepEqual([result.located, result.inside, result.outside, result.unknown, result.rejected], [0,0,0,42,0]);
  assert.equal(result.cells.length, 100);
  assert.ok(result.cells.every(cell => cell.count === 0));
  assert.equal(jakartaGrid([]).unknown, null);
});

test('grid validates numeric world coordinates, source provenance and positive integer counts', () => {
  const result = jakartaGrid([
    { lat: -6.2, lon: 106.8, count: 2, provenance: 'Source geotag' },
    { lat: '-6.2', lon: 106.8, count: 3, provenance: 'Source geotag' },
    { lat: -6.2, lon: 106.8, count: 9, provenance: ' ' },
    { lat: 91, lon: 106.8, count: 1, provenance: 'Invalid' },
    { lat: -6.2, lon: 106.8, count: -1, provenance: 'Invalid' },
    { lat: -6.2, lon: 106.8, count: 1.5, provenance: 'Invalid' },
    { lat: -6.2, lon: 106.8, provenance: 'Count unavailable' },
  ], 7);
  assert.deepEqual([result.located, result.inside, result.rejected, result.unknown], [2,2,6,7]);
  assert.equal(result.points[0].provenance, 'Source geotag');
});

test('grid includes exact bounding edges with north at the top and leaves outside coordinates outside', () => {
  const result = jakartaGrid([
    { lat: -6.08, lon: 106.68, count: 2, provenance: 'Northwest source' },
    { lat: -6.38, lon: 107, count: 3, provenance: 'Southeast source' },
    { lat: -6.381, lon: 107, count: 4, provenance: 'Outside source' },
  ], 1);
  assert.deepEqual([result.located, result.inside, result.outside], [9,5,4]);
  assert.equal(result.cells[0].count, 2);
  assert.equal(result.cells[99].count, 3);
  assert.equal(result.cells.reduce((sum, cell) => sum + cell.count, 0), 5);
});

test('hours use publication time in WIB across midnight and explicit offsets, never crawl time', () => {
  const result = publicationHours([
    { id: 'a', published_at: '2026-11-10T18:15:00Z' },
    { id: 'b', published_at: '2026-11-10T18:15:00' },
    { id: 'c', published_at: '2026-11-10T01:15:00+07:00' },
    { id: 'd', published_at: null, crawled_at: '2026-11-10T18:15:00Z' },
    { id: 'a', published_at: '2026-11-10T18:15:00Z' },
  ]);
  assert.equal(result.bins.length, 24);
  assert.equal(result.bins[1], 3);
  assert.deepEqual([result.dated, result.unknown, result.total], [3,1,4]);
});

test('date-only and impossible publication dates do not create guessed hourly activity', () => {
  const result = publicationHours([{ published_at: '2026-11-10' }, { published_at: '2026-02-30T10:00:00Z' }, { published_at: 'invalid' }, { published_at: '2026-11-10T24:00:00Z' }]);
  assert.equal(result.unknown, 4);
  assert.ok(result.bins.every(value => value === 0));
});

test('panel shows words and hours, and no longer carries the Jakarta map', async () => {
  const { createServer } = await import('vite');
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: Panel } = await server.ssrLoadModule('/src/components/admin/pulse/InfographicsPanel.jsx');
    const posts = Array.from({ length: 12 }, (_, id) => ({ id, title: 'Banjir warga Jakarta', published_at: '2026-11-10T18:15:00Z', url: id ? 'https://example.com/' + id : 'javascript:alert(1)' }));
    const html = renderToStaticMarkup(React.createElement(Panel, { posts, locations: [], unknownCount: 12 }));
    assert.match(html, /id="pulse-infographics"/);
    assert.doesNotMatch(html, /Peta sumber|Peta sebaran/);
    assert.equal((html.match(/class="pi-hour-bar"/g) || []).length, 24);
    assert.equal((html.match(/class="pi-grid-cell"/g) || []).length, 0);
    assert.equal((html.match(/class="pi-source"/g) || []).length, 10);
    assert.match(html, /10 dari 12 posting/);
    assert.match(html, /aria-label="banjir: 12 posting"/);
    assert.doesNotMatch(html, /href="javascript:/);
    assert.doesNotMatch(html, /data-active="true"/);
  } finally { await server.close(); }
});

test('posts that carry a date without a clock are left out of the hour chart', async () => {
  const { publicationHours } = await import('./pulseInfographics.js');
  const hours = publicationHours([
    { id: 'a', published_at: '2026-11-12T00:00:00' },          // Instagram: date only
    { id: 'b', published_at: '2026-11-12T00:00:00Z' },
    { id: 'c', published_at: '2026-11-12T03:15:00' },          // 10.15 WIB
    { id: 'd', published_at: null },
  ]);
  assert.equal(hours.bins[7], 0, 'nothing is invented at 07.00 WIB');
  assert.equal(hours.bins[10], 1);
  assert.deepEqual([hours.total, hours.dated, hours.unknown], [4, 1, 3]);
});

test('hours are counted in the installation zone (clock_v1)', async () => {
  const { setZone } = await import('./pulseMeasures.js');
  setZone({ offset_minutes: 540, name: 'WIT' });
  try {
    const hours = publicationHours([{ id: 'a', published_at: '2026-11-10T03:00:00Z' }, { id: 'b', published_at: '2026-11-10 16:30:00' }, { id: 'c', published_at: '2026-11-10T00:00:00' }]);
    assert.equal(hours.bins[12], 1);
    assert.equal(hours.bins[1], 1);
    assert.deepEqual([hours.dated, hours.unknown], [2, 1]);
  } finally { setZone({ offset_minutes: 420, name: 'WIB' }); }
});

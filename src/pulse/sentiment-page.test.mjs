import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';

test('sentiment page exposes dated evidence links, coverage and source reasons',async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Page}=await server.ssrLoadModule('/src/pulse/SentimentAnalytics.jsx');
    const posts=[{id:'p',author:'Source A',platform:'instagram',url:'https://www.instagram.com/p/test/',text:'Caption sumber',published_at:'2026-11-03T01:00:00Z',metrics:{sentiment:{label:'negative',reason:'Kekhawatiran dalam caption'},engagement:8}},{id:'u',published_at:'2026-11-03T02:00:00Z',metrics:{}}];
    const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/sentiment?topic=p1&author=stale&from=2026-11-01']},React.createElement(Page,{data:{posts}})));
    assert.match(html,/sentiment=negative/);
    assert.match(html,/day=2026-11-03/);
    assert.match(html,/from=2026-11-01/);
    assert.doesNotMatch(html,/author=stale/);
    assert.match(html,/Kekhawatiran dalam caption/);
    assert.doesNotMatch(html,/psa-coverage|pea-coverage|Analisis belum lengkap|1 dari 2/);
    assert.match(html,/Belum dianalisis/);
    assert.match(html,/Belum dapat dibandingkan/);
    assert.match(html,/Caption asli/);
    assert.match(html,/aria-label="Analisis sentimen posting"/);
  }finally{await server.close();}
});

test('sentiment page reads public opinion from comments and keeps the press apart from the public',async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Voices}=await server.ssrLoadModule('/src/pulse/VoiceOverview.jsx');
    const {publicOpinion}=await server.ssrLoadModule('/src/lib/pulseVoice.js');
    const {default:Page}=await server.ssrLoadModule('/src/pulse/SentimentAnalytics.jsx');
    const post=(id,platform,label,kind)=>({id,platform,author:'A',text:'Teks '+id,published_at:'2026-11-03T01:00:00Z',metrics:label?{sentiment:{label,reason:'r',...(kind?{kind}:{})}}:{}});
    const posts=[post('a','x','negative'),post('b','x','neutral','sarcasm'),post('c','instagram','neutral','question'),post('d','news','neutral'),post('e','news','neutral'),post('f','news',null)];
    const comments=[{sentiment:{label:'negative'},stance:{label:'opposes'},post:posts[0]},{sentiment:{label:'negative'},stance:{label:'unclear'},post:posts[0]},{sentiment:{label:'neutral',kind:'question'},stance:{label:'unclear'},post:posts[1]},{sentiment:null,stance:null,post:posts[1]}];
    const render=(voice,hideUnknown=false)=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Voices,{posts,opinion:publicOpinion(comments),loaded:true,hideUnknown,onHideUnknown(){},voice,onVoice(){},commentsLink:'/pulse/comments?topic=p1'})));
    const html=render('public');
    // Opinion is read from the analysed comments only; the unanalysed one is coverage, not a category.
    assert.match(html,/<h2>Opini publik<\/h2>/);
    assert.match(html,/<strong>67%<\/strong> negatif<small>dari 3 komentar teranalisis pada 2 posting<\/small>/);
    assert.match(html,/3 dari 4 komentar tersimpan · bertambah otomatis/);
    assert.match(html,/aria-label="Opini publik: Negatif 67%, Netral 33%"/);
    assert.match(html,/Tolak <b>33%<\/b>/);
    assert.match(html,/href="\/pulse\/comments\?topic=p1"/);
    // The public's posts and the press are two separate readings; a neutral news item is a report.
    assert.match(html,/aria-label="Posting warganet: Negatif 33%, Netral 67%"/);
    assert.match(html,/data-kind="sarcasm"[^>]*>Sindiran <b>50%<\/b>/);
    // tone_share_v1: a share is of the analysed posts; "belum dianalisis" is a count beside the three (was 67% and 33%).
    assert.match(html,/aria-label="Pemberitaan: Netral 100%, Belum dianalisis 1 berita"/);
    assert.match(html,/data-kind="report"[^>]*>Berita <b>100%<\/b>/);
    assert.match(html,/aria-pressed="true"[^>]*>(?:<[^>]*>)*Suara warganet/);
    assert.match(render('news',true),/aria-label="Pemberitaan: Netral 100%"/);
    // Below the top card the page details one voice: the public's posts by default, so news does not drown it.
    const page=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/sentiment?topic=p1']},React.createElement(Page,{data:{posts}})));
    assert.match(page,/Jumlah posting per sentimen, suara warganet/);
    assert.match(page,/platform=instagram%2Cx&amp;sentiment=negative/);
    assert.doesNotMatch(page,/Teks d<|Teks e</);
    const press=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/sentiment?topic=p1&voice=news']},React.createElement(Page,{data:{posts}})));
    assert.match(press,/Jumlah posting per sentimen, pemberitaan/);
    assert.match(press,/platform=news&amp;sentiment=neutral/);
  }finally{await server.close();}
});

test('tone_share_v1 on the Sentimen page: the three shares are of the analysed posts, the same with the toggle on and off', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: Page } = await server.ssrLoadModule('/src/pulse/SentimentAnalytics.jsx');
    const { default: Voices } = await server.ssrLoadModule('/src/pulse/VoiceOverview.jsx');
    const { publicOpinion } = await server.ssrLoadModule('/src/lib/pulseVoice.js');
    const post = (id, label, platform = 'x') => ({ id, platform, author: 'A', text: 'Teks ' + id, published_at: '2026-11-03T01:00:00Z', metrics: label ? { sentiment: label } : {} });
    const posts = [post('a', 'negative'), post('b', { label: 'negative' }), post('c', 'neutral'), post('d', { label: 'positive' }), post('e'), post('f'), post('g'), post('h')];
    // The toggle is a stored preference ("Hanya yang sudah dianalisis"); the page reads it while rendering.
    const page = (rows, hidden) => {
      globalThis.localStorage = { getItem: () => (hidden ? '1' : '0'), setItem() {} };
      try { return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse/sentiment?topic=p1'] }, React.createElement(Page, { data: { posts: rows } }))); }
      finally { delete globalThis.localStorage; }
    };
    const stats = html => Object.fromEntries([...html.matchAll(/class="pu-stat-label"><i aria-hidden="true"><\/i>([^<]+)<\/span><span class="pu-stat-value">(?:(?!pu-stat-label).)*?<b>([^<]*)<\/b><small>([^<]*)<\/small>/g)].map(match => [match[1], `${match[2]} ${match[3]}`]));
    const off = stats(page(posts, false)), on = stats(page(posts, true));
    assert.deepEqual(off, { Positif: '25% dari yang dianalisis', Netral: '25% dari yang dianalisis', Negatif: '50% dari yang dianalisis', 'Belum dianalisis': '50% dari seluruh posting' });
    assert.deepEqual(on, { Positif: '25% dari yang dianalisis', Netral: '25% dari yang dianalisis', Negatif: '50% dari yang dianalisis' }, 'the toggle only removes the "belum dianalisis" figure');
    // One post of 300 is a sliver, never nothing.
    const sliver = stats(page([post('p', 'positive'), ...Array.from({ length: 299 }, (_, index) => post('n' + index, 'neutral'))], false));
    assert.equal(sliver.Positif, '&lt;1% dari yang dianalisis');
    assert.equal(sliver.Netral, '100% dari yang dianalisis');
    // The voices on top: the same percentages with the toggle on and off; "belum dianalisis" is a count beside them.
    const voices = hideUnknown => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Voices, { posts, opinion: publicOpinion([]), loaded: true, hideUnknown, onHideUnknown() {}, voice: 'public', onVoice() {}, commentsLink: '/pulse/comments' })));
    assert.match(voices(false), /aria-label="Posting warganet: Negatif 50%, Netral 25%, Positif 25%, Belum dianalisis 4 posting"/);
    assert.match(voices(true), /aria-label="Posting warganet: Negatif 50%, Netral 25%, Positif 25%"/);
    assert.match(voices(false), /<strong>50%<\/strong> negatif<small>dari 4 posting yang sudah dianalisis<\/small>/);
    assert.match(voices(true), /<strong>50%<\/strong> negatif<small>dari 4 posting yang sudah dianalisis<\/small>/);
    assert.match(voices(false), /title="Sembunyikan posting yang belum dianalisis\. Persentase selalu dihitung dari yang sudah dianalisis\."/, 'the switch says what it does now');
    // Nothing analysed yet: no percentage at all, and the waiting posts carry the whole count.
    const waiting = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Voices, { posts: [post('u'), post('v')], opinion: publicOpinion([]), loaded: true, hideUnknown: false, onHideUnknown() {}, voice: 'public', onVoice() {}, commentsLink: '/pulse/comments' })));
    assert.doesNotMatch(waiting, /\d%|NaN/);
    assert.match(waiting, /2 posting menunggu analisis/);
    const empty = stats(page([post('u'), post('v')], false));
    assert.deepEqual(empty, { 'Belum dianalisis': '100% dari seluruh posting' }, 'no tone share is printed, not 0% and not NaN%');
  } finally { await server.close(); }
});

test('the sentiment summary of the full dashboard prints tone shares of the analysed posts; "belum dianalisis" keeps its part of all posts', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: Summary } = await server.ssrLoadModule('/src/components/admin/pulse/SentimentSummary.jsx');
    const post = sentiment => ({ metrics: sentiment ? { sentiment } : {} });
    const rows = posts => Object.fromEntries([...renderToStaticMarkup(React.createElement(Summary, { posts, onSelect() {} }))
      .matchAll(/<span>([^<]+)<\/span><span class="ps-sentiment-track">.*?<strong>(\d+)<\/strong><small>([^<]*)<\/small>/g)].map(match => [match[1], `${match[2]} ${match[3]}`]));
    assert.deepEqual(rows([post('negative'), post({ label: 'negative' }), post('neutral'), post({ label: 'positive' }), post(), post(), post(), post()]),
      { Positif: '1 25%', Netral: '1 25%', Negatif: '2 50%', 'Belum dianalisis': '4 50% dari seluruh posting' });
    assert.deepEqual(rows([post(), post()]), { Positif: '0 ', Netral: '0 ', Negatif: '0 ', 'Belum dianalisis': '2 100% dari seluruh posting' }, 'nothing analysed: no tone percentage, not 0% and not NaN%');
  } finally { await server.close(); }
});

test('the daily sentiment chart names the installation zone of its days (day_v1), never WIB written by hand', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { setZone, zone } = await server.ssrLoadModule('/src/lib/pulseMeasures.js');
    const { default: Page } = await server.ssrLoadModule('/src/pulse/SentimentAnalytics.jsx');
    const before = zone();
    setZone({ offset_minutes: 540, name: 'WIT' });
    try {
      const posts = [{ id: 'p', author: 'Source A', platform: 'x', url: 'https://x.com/i/status/1', text: 'Isi', published_at: '2026-11-03T01:00:00Z', metrics: { sentiment: { label: 'negative' } } }];
      const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse/sentiment?topic=p1'] }, React.createElement(Page, { data: { posts } })));
      assert.match(html, /Tanggal publikasi WIT\./);
      assert.match(html, /<th>Tanggal WIT<\/th>/);
      assert.doesNotMatch(html, /\bWIB\b/);
    } finally { setZone(before); }
  } finally { await server.close(); }
});

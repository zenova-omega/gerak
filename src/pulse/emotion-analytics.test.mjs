import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
test('emotion UI separates missing results from observed zero and exposes source drilldown',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {default:Panel}=await server.ssrLoadModule('/src/pulse/EmotionAnalytics.jsx');
  const missing=renderToStaticMarkup(React.createElement(Panel,{posts:[{id:'a',metrics:{sentiment:{label:'negative'}}}]}));
  assert.match(missing,/Belum ada hasil emosi/);assert.match(missing,/1 posting belum dianalisis/);assert.doesNotMatch(missing,/aria-label="Marah:/);
  const result=renderToStaticMarkup(React.createElement(Panel,{posts:[{id:'a',metrics:{emotion:{label:'anger',confidence:.9,reason:'Nada marah'}}}]}));
  assert.match(result,/aria-label="Marah: 1 posting. Lihat sumber"/);assert.match(result,/100%/);assert.doesNotMatch(result,/Belum ada hasil emosi/);
 }finally{await server.close();}
});

test('the daily chart comes first, and the emotions under it are its key and its filter, largest first', async () => {
 const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
 try {
  const { default: Panel } = await server.ssrLoadModule('/src/pulse/EmotionAnalytics.jsx');
  const stated = (id, label, day) => ({ id, published_at: `2026-11-${day}T05:00:00Z`, platform: 'x', author: 'akun_' + id, text: 'Isi ' + id, metrics: { emotion: { label, confidence: 0.9, reason: 'alasan' } } });
  const posts = [stated('a', 'anger', '10'), stated('b', 'anger', '10'), stated('c', 'anger', '11'), stated('d', 'joy', '11'), stated('e', 'none', '10'), stated('f', 'none', '11'), { id: 'g', metrics: {} }];
  const html = renderToStaticMarkup(React.createElement(Panel, { posts }));
  assert.ok(html.indexOf('Perkembangan emosi') > 0 && html.indexOf('Perkembangan emosi') < html.indexOf('class="pea-emotions"'), 'the chart is above the emotions');
  const order = [...html.matchAll(/aria-label="([A-Za-z]+): (\d+) posting\. Lihat sumber"/g)].map(match => match[1] + ' ' + match[2]);
  assert.deepEqual(order, ['Marah 3', 'Senang 1', 'Sedih 0', 'Takut 0', 'Jijik 0', 'Kagum 0']);
  assert.match(html, /75% dari yang beremosi/, 'a share is of the posts that state an emotion');
  assert.match(html, /25% dari yang beremosi/);
  // The answer first: how many posts state an emotion at all, and which emotion leads.
  assert.match(html, /67%<\/strong><span>posting menyatakan emosi<\/span><small>4 dari 6 yang dianalisis<\/small>/);
  assert.match(html, /Marah<\/strong><span>emosi terbanyak<\/span><small>3 posting<\/small>/);
  assert.match(html, /Tanpa emosi jelas <strong>2<\/strong>/);
  assert.match(html, /1 belum dianalisis/);
  // Every emotion keeps one colour, shared by its tile and its bars.
  assert.match(html, /class="pea-emotion anger"/);
  assert.doesNotMatch(html, /11-10/, 'days are written as dates a reader says: 10 Nov');
  assert.match(html, /<th[^>]*>10 Nov<\/th>/);
 } finally { await server.close(); }
});

test('the emotion chart names the installation zone of its days (day_v1), never WIB written by hand', async () => {
 const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
 try {
  const { setZone, zone } = await server.ssrLoadModule('/src/lib/pulseMeasures.js');
  const { default: Panel } = await server.ssrLoadModule('/src/pulse/EmotionAnalytics.jsx');
  const before = zone();
  setZone({ offset_minutes: 540, name: 'WIT' });
  try {
   const posts = [{ id: 'a', published_at: '2026-11-10T05:00:00Z', platform: 'x', author: 'akun_a', text: 'Isi a', metrics: { emotion: { label: 'anger', confidence: 0.9, reason: 'alasan' } } }];
   const html = renderToStaticMarkup(React.createElement(Panel, { posts }));
   assert.match(html, /tanggal WIT/);
   assert.match(html, /tanggal WIT/);
   assert.match(html, /Data harian · WIT/);
   assert.doesNotMatch(html, /\bWIB\b/);
  } finally { setZone(before); }
 } finally { await server.close(); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
test('response panel separates caption stance from comment emotion and shows incomplete coverage',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {ResponseAnalysisView}=await server.ssrLoadModule('/src/pulse/ResponseAnalysisPanel.jsx');
  const html=renderToStaticMarkup(React.createElement(ResponseAnalysisView,{posts:[{id:'a',text:'Sumber nyata',metrics:{comment_snapshot:{items:[{id:'c',text:'Komentar nyata'}]}}}],response:{target:'Isu A',posts:[{post_id:'a',stance:{label:'unclear',reason:'Teks hanya melaporkan'},comments:[]}]},loaded:true,printable:true}));
  assert.match(html,/Isu A/);assert.match(html,/Sentimen komentar/);assert.match(html,/Sikap dalam posting/);assert.match(html,/0 dari 1 komentar/);assert.match(html,/1 dari 1 posting/);assert.match(html,/Belum dianalisis/);assert.doesNotMatch(html,/akurasi 100/);
 }finally{await server.close();}
});

test('comment tone shares in the response panel are sampleToneShares: whole numbers of the analysed comments (a sample), one of 300 is <1%', async () => {
 const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
 try {
  const { ResponseAnalysisView } = await server.ssrLoadModule('/src/pulse/ResponseAnalysisPanel.jsx');
  const items = Array.from({ length: 300 }, (_, index) => ({ id: 'c' + index, text: 'Komentar ' + index }));
  const comments = items.map((item, index) => ({ id: item.id, sentiment: { label: index ? 'neutral' : 'positive' } }));
  const html = renderToStaticMarkup(React.createElement(ResponseAnalysisView, { posts: [{ id: 'a', text: 'Sumber', metrics: { comment_snapshot: { items } } }], response: { target: 'Isu A', posts: [{ post_id: 'a', comments }] }, loaded: true }));
  assert.match(html, /aria-label="Positif: 1, &lt;1% dari yang sudah dianalisis\. Lihat sumber"/);
  assert.match(html, /aria-label="Netral: 299, 100% dari yang sudah dianalisis\. Lihat sumber"/);
 } finally { await server.close(); }
});

test('the comment scope note names the installation zone of the posts\' dates (day_v1), never WIB written by hand', async () => {
 const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
 try {
  const { setZone, zone } = await server.ssrLoadModule('/src/lib/pulseMeasures.js');
  const { ResponseAnalysisView } = await server.ssrLoadModule('/src/pulse/ResponseAnalysisPanel.jsx');
  const before = zone();
  setZone({ offset_minutes: 540, name: 'WIT' });
  try {
   const html = renderToStaticMarkup(React.createElement(ResponseAnalysisView, { posts: [{ id: 'a', text: 'Sumber', metrics: {} }], response: { target: 'Isu A', posts: [] }, loaded: true, printable: true }));
   assert.match(html, /tanggal publikasi posting induknya \(WIT\)/);
   assert.doesNotMatch(html, /\bWIB\b/);
  } finally { setZone(before); }
 } finally { await server.close(); }
});

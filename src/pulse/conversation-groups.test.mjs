import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
test('conversation groups show only evidence inside the chosen scope and say what is not grouped',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {default:Groups}=await server.ssrLoadModule('/src/pulse/ConversationGroups.jsx');
  const posts=[
   {id:'a',issue_id:'g',platform:'x',author:'Dalam cakupan',text:'Bukti terpilih',url:'https://example.com/selected',metrics:{}},
   {id:'a2',issue_id:'g',platform:'x',author:'Akun kedua',text:'Bukti terpilih',url:'https://example.com/selected-2',metrics:{}},
   {id:'b',issue_id:'g',platform:'instagram',author:'Di luar cakupan',text:'Jangan tampil',url:'https://example.com/excluded',metrics:{}},
   {id:'s',issue_id:'sendiri',platform:'x',author:'Satu saja',text:'Posting tunggal',metrics:{}},
   {id:'c',platform:'x',text:'Tanpa kelompok',metrics:{}}];
  const html=renderToStaticMarkup(React.createElement(Groups,{posts,platforms:['x'],period:{}}));
  const text=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  assert.match(html,/Bukti terpilih/);
  assert.doesNotMatch(html,/Di luar cakupan|Jangan tampil|example.com\/excluded/);   // outside the platform scope
  assert.match(text,/1 kelompok dari 4 posting/);                  // four posts are in scope: the Instagram one is not counted
  assert.match(text,/2 posting di X/);
  assert.match(text,/1 posting berdiri sendiri/);                  // a text seen once is counted, never listed
  assert.doesNotMatch(html,/Posting tunggal/);
  assert.match(text,/1 posting belum dikelompokkan/);
 }finally{await server.close();}
});

test('a group\'s tone prints the module\'s text: one post of 300 is <1%, never 0% (tone_share_v2)', async () => {
 const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
 try {
  const { default: Groups } = await server.ssrLoadModule('/src/pulse/ConversationGroups.jsx');
  const posts = Array.from({ length: 300 }, (_, index) => ({ id: 'p' + index, issue_id: 'g', platform: 'x', author: 'akun' + index, text: 'Teks sama', metrics: { sentiment: index ? 'neutral' : { label: 'positive' } } }));
  const html = renderToStaticMarkup(React.createElement(Groups, { posts, platforms: ['x'], period: {} }));
  assert.match(html, /aria-label="Sentimen 300 posting: positif &lt;1%, netral 100%"/);
  assert.match(html, /Positif <b>&lt;1%<\/b>/);
  assert.doesNotMatch(html, /Positif <b>0%<\/b>/);
 } finally { await server.close(); }
});

test('a group\'s tone is of every post of the group: "belum dianalisis" is the fourth part of the bar (tone_share_v2)', async () => {
 const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
 try {
  const { default: Groups } = await server.ssrLoadModule('/src/pulse/ConversationGroups.jsx');
  const tones = ['negative', 'negative', 'neutral', null];
  const posts = tones.map((label, index) => ({ id: 'q' + index, issue_id: 'g', platform: 'x', author: 'akun' + index, text: 'Teks sama', metrics: label ? { sentiment: label } : {} }));
  const html = renderToStaticMarkup(React.createElement(Groups, { posts, platforms: ['x'], period: {} }));
  assert.match(html, /aria-label="Sentimen 4 posting: netral 25%, negatif 50%, belum dianalisis 25%"/);
  assert.match(html, /Belum dianalisis <b>25%<\/b>/);
  assert.doesNotMatch(html, /posting dianalisis/, 'the caption names the base, every post, not the analysed ones');
 } finally { await server.close(); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

test('network timeline precedes canvas and empty states retain accessible controls',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom'});
 try{
  const {default:Explorer}=await server.ssrLoadModule('/src/components/admin/pulse/NetworkExplorer.jsx');
  const html=renderToStaticMarkup(React.createElement(Explorer,{data:{nodes:[],edges:[],accounts:[],analyzed_posts:0}}));
  assert.ok(html.indexOf('class="nx-replay"')<html.indexOf('class="nx-workspace"'));
  assert.match(html,/data-empty="true"/);
  for(const label of ['Jelajahi penyebaran','Posisi replay','Kecepatan replay','Bukti akun terpilih','Peta 2D','Perspektif 3D','Urutan waktu'])assert.ok(html.includes(label),label);
  assert.doesNotMatch(html,/di bawah peta/);
 }finally{await server.close();}
});

test('an evidence card reads its post\'s tone by tone_share_v2: either stored form, any letter case; no tag before analysis',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom'});
 try{
  const {default:Explorer}=await server.ssrLoadModule('/src/components/admin/pulse/NetworkExplorer.jsx');
  const evidence=['plain','cased','none'].map((id,index)=>({id,title:'Bukti '+id,published_at:`2026-11-1${index}T01:00:00Z`}));
  const posts=[{id:'plain',metrics:{sentiment:'negative'}},{id:'cased',metrics:{sentiment:{label:' Positive '}}},{id:'none',metrics:{}}];
  const html=renderToStaticMarkup(React.createElement(Explorer,{data:{nodes:[{id:'a',label:'Akun A',observed:true}],accounts:[{id:'a',evidence}],edges:[],analyzed_posts:3},posts}));
  const card=id=>html.match(new RegExp(`<li class="nxi-card">(?:(?!</li>).)*Bukti ${id}(?:(?!</li>).)*</li>`))?.[0]||'';
  assert.match(card('plain'),/Negatif/);
  assert.match(card('cased'),/Positif/);
  assert.ok(card('none'));
  assert.doesNotMatch(card('none'),/Belum dianalisis|Negatif|Positif|Netral/);
 }finally{await server.close();}
});

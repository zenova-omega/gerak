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

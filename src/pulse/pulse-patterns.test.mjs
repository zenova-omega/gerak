import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

test('shared source identity keeps names, missing data and actions distinct',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom'});
 try{
  const {PulseSourceHeading,PulsePanelHeading}=await server.ssrLoadModule('/src/components/ui/PulsePatterns.jsx');
  const html=renderToStaticMarkup(React.createElement(PulseSourceHeading,{post:{author:'<Example>',platform:'threads'},rank:2},React.createElement('button',{},'Lihat sumber')));
  assert.match(html,/Peringkat 2/);assert.match(html,/&lt;Example&gt;/);assert.match(html,/Threads/);assert.match(html,/Waktu tidak tersedia/);
  assert.match(html,/pu-source-actions/);assert.match(html,/Foto profil tidak tersedia/);assert.match(html,/Lihat sumber/);
  const missing=renderToStaticMarkup(React.createElement(PulseSourceHeading,{post:{}}));
  assert.match(missing,/Nama sumber tidak tersedia/);assert.doesNotMatch(missing,/Peringkat|pu-source-actions/);
  const panel=renderToStaticMarkup(React.createElement(PulsePanelHeading,{title:'Aktivitas',description:'Status terbaru'},React.createElement('button',{disabled:true},'Perbarui')));
  assert.match(panel,/<h2>Aktivitas<\/h2>/);assert.match(panel,/Status terbaru/);assert.match(panel,/disabled=""/);
 }finally{await server.close();}
});

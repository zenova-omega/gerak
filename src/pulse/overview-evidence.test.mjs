import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
test('overview shows real unique content, unknown sentiment and no fabricated period growth',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {default:Overview}=await server.ssrLoadModule('/src/pulse/ProjectOverview.jsx');
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/overview?topic=t']},React.createElement(Overview,{data:{posts:[{id:'1',platform:'x',author:'Nama nyata',text:'caption asli',metrics:{engagement:7}},{id:'2',platform:'news',author:'Media',text:'caption asli',metrics:{engagement:0}}]},topic:{id:'t',label:'Isu'},period:{}})));
  assert.match(html,/Konten unik/);assert.match(html,/Nama nyata/);assert.match(html,/caption asli/);
  assert.match(html,/Pilih tanggal mulai dan akhir/);assert.match(html,/Sikap terhadap isu dibahas terpisah/);
  assert.doesNotMatch(html,/Percakapan meningkat/);
 } finally {await server.close();}
});

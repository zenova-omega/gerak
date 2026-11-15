import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

test('response charts retain unanalysed counts and printable explanations while screen notes are disclosures',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {ResponseAnalysisView}=await server.ssrLoadModule('/src/pulse/ResponseAnalysisPanel.jsx');
  const props={posts:[{id:'one',text:'Sumber'}],response:{target:'Isu',posts:[]},loaded:true};
  const screen=renderToStaticMarkup(React.createElement(ResponseAnalysisView,props));
  assert.match(screen,/aria-label="Tentang respons dan sikap"/);
  assert.doesNotMatch(screen,/Analisis belum lengkap/);
  assert.match(screen,/aria-label="Belum dianalisis: 1/);
  assert.doesNotMatch(screen,/<p class="pra-note">/);
  const print=renderToStaticMarkup(React.createElement(ResponseAnalysisView,{...props,printable:true}));
  assert.match(print,/bukan identitas penulis/);
  assert.match(print,/tanggal publikasi posting induknya/);
 }finally{await server.close();}
});

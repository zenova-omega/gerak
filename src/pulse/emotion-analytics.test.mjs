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
  assert.match(missing,/Hasil emosi belum tersedia/);assert.match(missing,/1 posting belum dianalisis/);assert.doesNotMatch(missing,/aria-label="Marah:/);
  const result=renderToStaticMarkup(React.createElement(Panel,{posts:[{id:'a',metrics:{emotion:{label:'anger',confidence:.9,reason:'Nada marah'}}}]}));
  assert.match(result,/aria-label="Marah: 1 posting. Lihat sumber"/);assert.match(result,/100%/);assert.doesNotMatch(result,/Hasil emosi belum tersedia/);
 }finally{await server.close();}
});

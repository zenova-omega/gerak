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

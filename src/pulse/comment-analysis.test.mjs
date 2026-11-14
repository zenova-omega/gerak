import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
test('a comment shows its own sentiment and stated stance with reasons, not the video label',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {Comment}=await server.ssrLoadModule('/src/components/admin/pulse/CommentsPanel.jsx');
  const html=renderToStaticMarkup(React.createElement(Comment,{comment:{id:'c',text:'Komentar asli',sentiment:{label:'negative',reason:'Kecewa dengan situasi'},stance:{label:'unclear',reason:'Tidak menyatakan posisi',review_needed:true}}}));
  assert.match(html,/Negatif/);assert.match(html,/Kecewa dengan situasi/);assert.match(html,/Sikap terhadap isu: Hanya membahas/);assert.match(html,/Membahas/);assert.match(html,/Perlu ditinjau/);
 }finally{await server.close();}
});

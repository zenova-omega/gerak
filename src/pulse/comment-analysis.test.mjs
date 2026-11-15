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
  assert.match(html,/Negatif/);assert.match(html,/Kecewa dengan situasi/);assert.match(html,/Sikap terhadap isu: Hanya membahas/);assert.match(html,/Membahas/);
  // Taking no side is an answer, not a doubt: it does not send the comment to review, whatever was stored with it.
  assert.doesNotMatch(html,/Perlu ditinjau/);
  const doubtful=renderToStaticMarkup(React.createElement(Comment,{comment:{id:'d',text:'Komentar lain',sentiment:{label:'negative',confidence:0.5,reason:'Mungkin kesal'},stance:{label:'unclear',reason:'Tidak menyatakan posisi'}}}));
  assert.match(doubtful,/Perlu ditinjau/);
  const sided=renderToStaticMarkup(React.createElement(Comment,{comment:{id:'e',text:'Komentar ketiga',sentiment:{label:'positive',confidence:0.9,reason:'Senang'},stance:{label:'supports',confidence:0.5,reason:'Agak setuju',review_needed:true}}}));
  assert.match(sided,/Perlu ditinjau/);
 }finally{await server.close();}
});

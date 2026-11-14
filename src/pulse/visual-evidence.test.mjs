import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
test('visual evidence uses source media, preserves missing metrics, and never derives anger from negative sentiment',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {default:Card}=await server.ssrLoadModule('/src/pulse/SentimentEvidenceCard.jsx');
  const post={id:'one',author:'Sumber',platform:'instagram',url:'https://www.instagram.com/p/abc/',text:'Caption',metrics:{likes:0,media_url:'https://example.com/photo.jpg',media_type:'image',sentiment:{label:'negative',reason:'Alasan panjang '.repeat(30)}}};
  const render=p=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Card,{post:p,selectedLabel:'negative',accountLink:'/pulse/posts'})));
  const html=render(post);
  assert.match(html,/example.com\/photo.jpg/);assert.match(html,/Buka foto besar dari Sumber/);
  assert.match(html,/Suka/);assert.match(html,/Tidak tersedia/);assert.match(html,/Lihat alasan lengkap/);
  assert.doesNotMatch(html,/Emosi: Marah/);
  assert.match(render({...post,metrics:{...post.metrics,emotion:{label:'anger',confidence:.9,reason:'Menyatakan kemarahan'}}}),/Emosi: Marah/);
 }finally{await server.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
test('conversation cards contain only selected evidence and explain missing grouping',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {default:Groups}=await server.ssrLoadModule('/src/pulse/ConversationGroups.jsx');
  const posts=[{id:'a',issue_id:'g',platform:'x',author:'Dalam cakupan',text:'Bukti terpilih',url:'https://example.com/selected',metrics:{}},{id:'b',issue_id:'g',platform:'instagram',author:'Di luar cakupan',text:'Jangan tampil',url:'https://example.com/excluded',metrics:{}},{id:'c',platform:'x',text:'Tanpa kelompok',metrics:{}}];
  const html=renderToStaticMarkup(React.createElement(Groups,{posts,platforms:['x'],period:{}}));
  assert.match(html,/Bukti terpilih/);assert.match(html,/Dalam cakupan/);assert.match(html,/example.com\/selected/);assert.doesNotMatch(html,/Di luar cakupan|Jangan tampil|example.com\/excluded/);assert.match(html,/belum memiliki kelompok/);
  assert.match(html,/1 kelompok · 2 posting/);
 }finally{await server.close();}
});

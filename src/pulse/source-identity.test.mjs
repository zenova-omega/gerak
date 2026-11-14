import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

test('shared publisher identity preserves photo and accessible platform badge',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {default:Avatar}=await server.ssrLoadModule('/src/components/admin/pulse/PostAvatar.jsx');
  const render=post=>renderToStaticMarkup(React.createElement(Avatar,{post}));
  for(const platform of ['instagram','tiktok','youtube','x','news','threads','facebook']){
   const html=render({author:'Kompas TV',platform});
   assert.match(html,/psi-avatar/);assert.match(html,/psi-platform/);assert.match(html,/>KT</);assert.doesNotMatch(html,/<i>/);
  }
  const html=render({author:'Publisher',platform:'news',metrics:{profile_image_url:'https://example.com/logo.png'}});
  assert.match(html,/width="44" height="44"/);assert.match(html,/Foto profil Publisher/);
  assert.doesNotMatch(render({author:'Unsafe',metrics:{profile_image_url:'javascript:alert(1)'}}),/<img/);
 }finally{await server.close();}
});

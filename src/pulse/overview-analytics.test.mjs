import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

test('overview exposes real evidence links and unknown sentiment without invented reach', async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Overview}=await server.ssrLoadModule('/src/pulse/OverviewAnalytics.jsx');
    const data={total_mentions:2,posts:[{id:'1',author:'Account A',platform:'instagram',published_at:'2026-11-10T23:30:00Z',metrics:{engagement:5}},{id:'2',author:'Account A',platform:'instagram',metrics:{sentiment:'negative',engagement:10}}],influencers:[{author:'Account A',platform:'instagram',mentions:2,engagement:15}],metric_totals:{engagement:{value:15,coverage:2}},platforms:[{platform:'instagram',count:2}]};
    const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/overview?topic=p1&sentiment=positive&author=Old']},React.createElement(Overview,{data})));
    assert.match(html,/Tren mention/);
    assert.match(html,/Top influencer/);
    assert.match(html,/Belum dianalisis/);
    assert.match(html,/day=2026-11-11/);
    assert.match(html,/sentiment=negative/);
    assert.match(html,/author=Account\+A/);
    assert.match(html,/platform=instagram/);
    assert.doesNotMatch(html,/author=Old/);
    assert.doesNotMatch(html,/Estimasi reach/);
  } finally {await server.close();}
});

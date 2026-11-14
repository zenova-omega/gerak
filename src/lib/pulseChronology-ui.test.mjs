import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('explorer opens chronological evidence cards and exposes the observed profile without fetching', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: NetworkExplorer } = await server.ssrLoadModule('/src/components/admin/pulse/NetworkExplorer.jsx');
    const evidence = Array.from({ length: 17 }, (_, i) => ({ id: `post-${i}`, author: '@Observed', platform: 'x', title: `Evidence ${i}`, published_at: i === 16 ? null : `2026-11-10T${String(i).padStart(2, '0')}:00:00Z`, url: i === 0 ? 'javascript:alert(1)' : `https://example.com/${i}` }));
    const data = { nodes: [{ id: 'x:observed', label: '@Observed', platform: 'x', observed: true }], accounts: [{ id: 'x:observed', evidence }], edges: [], analyzed_posts: 17 };
    const html = renderToStaticMarkup(React.createElement(NetworkExplorer, { data, initialMode:'chronology' }));
    assert.match(html, /aria-pressed="true">Jejak Penyebaran/);
    assert.equal((html.match(/class="nx-chronology-card"/g) || []).length, 15);
    assert.match(html, /17 posting.*16 bertanggal.*1 tanpa tanggal/);
    assert.match(html, /Terawal teramati dalam sampel/);
    // The reading notes sit behind the info mark beside the title instead of above every list.
    assert.match(html, /aria-label="Cara membaca jejak penyebaran"/);
    const { chronologyNotes } = await server.ssrLoadModule('/src/lib/pulseChronology.js');
    assert.match(chronologyNotes.join(' '), /asal sebenarnya belum diketahui/);
    assert.match(chronologyNotes.join(' '), /Urutan waktu bukan bukti sebab-akibat/);
    assert.match(html, /Profil berdasarkan bukti/);
    assert.match(html, /Demografi/);
    assert.match(html, /Tidak diketahui; tidak disimpulkan/);
    assert.doesNotMatch(html, /href="javascript:/);
    assert.match(html, /Pilih akun @Observed/);
    for (const mode of ['Peta 2D', 'Perspektif 3D', 'Urutan waktu']) assert.ok(html.includes(mode));
  } finally { await server.close(); }
});

test('network starts in 2D, explains empty relations and does not force a separate theme',async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Explorer}=await server.ssrLoadModule('/src/components/admin/pulse/NetworkExplorer.jsx');
    const html=renderToStaticMarkup(React.createElement(Explorer,{data:{nodes:[],edges:[],accounts:[],analyzed_posts:0}}));
    assert.match(html,/aria-pressed="true">Peta 2D/);
    assert.match(html,/Tampilkan akun tanpa hubungan/);
    assert.doesNotMatch(html,/Ganti tema explorer/);
  }finally{await server.close();}
});

test('2D opens on the whole period and offers a replay from the first publication',async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Explorer}=await server.ssrLoadModule('/src/components/admin/pulse/NetworkExplorer.jsx');
    const evidence=[{id:'late',title:'Later evidence',published_at:'2026-11-11T00:00:00Z'},{id:'early',title:'First evidence',published_at:'2026-11-10T00:00:00Z'}];
    const html=renderToStaticMarkup(React.createElement(Explorer,{data:{nodes:[{id:'a',label:'Account A',observed:true}],accounts:[{id:'a',evidence}],edges:[],analyzed_posts:2}}));
    assert.match(html,/aria-label="Posisi replay"[^>]*max="1"[^>]*value="1"/);
    assert.match(html,/First evidence/);
    assert.match(html,/Later evidence/);
    assert.match(html,/Putar ulang/);
    assert.doesNotMatch(html,/Semua waktu<\/button>/);
  }finally{await server.close();}
});

test('card actions select the exact network account and navigate fifteen-record pages including undated evidence', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: ChronologyCards } = await server.ssrLoadModule('/src/components/admin/pulse/ChronologyCards.jsx');
    const rows = Array.from({ length: 16 }, (_, i) => ({ id: i, accountId: `x:account-${i}`, author: '@SameDisplayName', title: `Post ${i}`, time: i === 15 ? null : i, published_at: '2026-11-10T00:00:00Z' }));
    let selected = '';
    let page = 0;
    const props = { rows, page, selected, firstTime: 0, onSelect: value => { selected = value; }, onPageChange: value => { page = value; } };
    function elements(element) {
      if (!React.isValidElement(element)) return [];
      return [element, ...React.Children.toArray(element.props.children).flatMap(elements)];
    }
    const first = elements(ChronologyCards(props));
    const selectButtons = first.filter(element => element.type === 'button' && element.props['aria-label']);
    selectButtons[1].props.onClick();
    assert.equal(selected, 'x:account-1');
    first.find(element => element.type === 'button' && element.props.children === 'Berikutnya').props.onClick();
    assert.equal(page, 1);
    const second = ChronologyCards({ ...props, page, selected: 'x:account-15' });
    const html = renderToStaticMarkup(second);
    assert.equal((html.match(/class="nx-chronology-card"/g) || []).length, 1);
    assert.match(html, /Tanggal tidak diketahui/);
    assert.doesNotMatch(html, /class="nx-chronology-first"/);
    const secondElements = elements(second);
    assert.equal(secondElements.find(element => element.type === 'button' && element.props['aria-label']).props['aria-pressed'], true);
    assert.equal(secondElements.find(element => element.type === 'button' && element.props.children === 'Berikutnya').props.disabled, true);
    secondElements.find(element => element.type === 'button' && element.props.children === 'Sebelumnya').props.onClick();
    assert.equal(page, 0);
  } finally { await server.close(); }
});

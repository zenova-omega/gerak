import { hasClock, readTime } from './pulseMeasures.js';

/** A publication time in milliseconds, read by the shared reader (day_v1); null when there is none. */
export function replayTime(value) {
  return typeof value === 'string' ? readTime(value) : null;
}
/** The order of publication (clock_v1): a post whose source gave a date only never takes part in the order by time.
 * Timed posts come first by time, then date-only posts by their date, then posts without a date; ties by id.
 * Rows carry `time` (ms or null) and `clock`. */
export function byPublication(a, b) {
  const place = row => (row.time === null ? 2 : row.clock ? 0 : 1);
  return place(a) - place(b) || (a.time ?? 0) - (b.time ?? 0) || String(a.id).localeCompare(String(b.id));
}
export function replayEvents(data) {
  const seen = new Map();
  for (const a of data.accounts || []) for (const p of a.evidence || []) {
    const time = replayTime(p.published_at);
    if (time !== null && !seen.has(p.id)) seen.set(p.id, { ...p, accountId: a.id, time, clock: hasClock(p.published_at) });
  }
  return [...seen.values()].sort(byPublication);
}
export function replayFrame(data, cutoff = Infinity) {
  const visible = p => cutoff === Infinity || (replayTime(p.published_at) !== null && replayTime(p.published_at) <= cutoff);
  const ids = new Set();
  const accounts = (data.accounts || []).map(a=>({...a,evidence:(a.evidence || []).filter(visible)})).filter(a=>a.evidence.length);
  accounts.forEach(a=>ids.add(a.id));
  const edges = (data.edges || []).flatMap(e=>{
    const evidence = (e.evidence || []).filter(visible);
    // An undirected similarity relationship requires both authors to exist AND all
    // evidence establishing that pair to be dated before this frame. Conservative.
    if (!evidence.length || (e.kind === 'similarity' && cutoff !== Infinity && (evidence.length !== e.evidence.length || !ids.has(e.source) || !ids.has(e.target)))) return [];
    return [{...e,evidence,count:evidence.length}];
  });
  edges.forEach(e=>{ids.add(e.source);ids.add(e.target)});
  return {nodes:(data.nodes || []).filter(n=>ids.has(n.id)),edges,accounts};
}
export function topViralAccounts(posts, limit = 3) {
  const totals = new Map();
  for (const p of posts) {
    const value=p.metrics?.engagement;
    if (!p.author || !Number.isFinite(value) || value < 0) continue;
    const identity=p.platform==='x'?p.author.replace(/^@/,'').toLowerCase():String(p.metrics?.author_id || p.author);
    const id=p.platform+':'+identity;
    totals.set(id,(totals.get(id)||0)+value);
  }
  const rows=[...totals].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const threshold=rows[Math.min(limit,rows.length)-1]?.[1] ?? Infinity;
  return new Set(rows.filter(([,v])=>v>=threshold).map(([id])=>id));
}
export function networkPositions(data) {
  // Deterministic force layout computed once for the full graph. Position is NOT geography.
  const nodes=[...(data.nodes || [])].sort((a,b)=>a.id.localeCompare(b.id));
  const positions=Object.fromEntries(nodes.map((n,i)=>{const a=i*2.399963,r=30+Math.sqrt(i)*16;return[n.id,{x:Math.cos(a)*r,y:Math.sin(a)*r,z:Math.sin(i*1.7)*90}]}));
  for(let step=0;step<100;step++) {
    const forces=Object.fromEntries(nodes.map(n=>[n.id,{x:0,y:0}]));
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
      const a=positions[nodes[i].id],b=positions[nodes[j].id],dx=a.x-b.x,dy=a.y-b.y,d2=Math.max(80,dx*dx+dy*dy),f=190/d2;
      forces[nodes[i].id].x+=dx*f;forces[nodes[i].id].y+=dy*f;forces[nodes[j].id].x-=dx*f;forces[nodes[j].id].y-=dy*f;
    }
    for(const e of data.edges || []){const a=positions[e.source],b=positions[e.target];if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,f=.012;forces[e.source].x+=dx*f;forces[e.source].y+=dy*f;forces[e.target].x-=dx*f;forces[e.target].y-=dy*f}
    nodes.forEach(n=>{const p=positions[n.id],f=forces[n.id];p.x+=Math.max(-6,Math.min(6,f.x-p.x*.006));p.y+=Math.max(-6,Math.min(6,f.y-p.y*.006))});
  }
  const max=Math.max(1,...Object.values(positions).flatMap(p=>[Math.abs(p.x),Math.abs(p.y)]));
  Object.values(positions).forEach(p=>{p.x=p.x/max*270;p.y=p.y/max*210});
  return positions;
}

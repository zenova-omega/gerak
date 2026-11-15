import { toneShares } from './pulseMeasures.js';

const TONES=['positive','neutral','negative'];
export const stanceLabels={supports:'Mendukung',opposes:'Menolak',unclear:'Hanya membahas',unknown:'Belum dianalisis'};
// Short form for chips on a card: an emoticon and one word. The full label stays in stanceLabels.
export const stanceShort={supports:['👍','Dukung'],opposes:['👎','Tolak'],unclear:['💬','Membahas'],unknown:['⏳','Belum']};
export const commentLabels={positive:'Positif',neutral:'Netral',negative:'Negatif',unknown:'Belum dianalisis'};
const validated=(value,labels)=>value&&value.label!=='unknown'&&Object.hasOwn(labels,value.label)?value:null;
export function responseEvidence(posts=[],data){
 const byId=new Map((data?.posts||[]).map(row=>[row.post_id,row]));
 const stanceCounts={supports:0,opposes:0,unclear:0,unknown:0};
 const commentCounts={positive:0,neutral:0,negative:0,unknown:0};
 const commentStanceCounts={supports:0,opposes:0,unclear:0,unknown:0};
 const enriched=posts.map(post=>{
  const result=byId.get(post.id),stance=validated(result?.stance,stanceLabels);
  stanceCounts[stance?.label||'unknown']++;
  const comments=new Map((result?.comments||[]).map(c=>[c.id,c]));
  return {...post,stance,responseComments:(post.metrics?.comment_snapshot?.items||[]).map(c=>{
   const analysis=comments.get(c.id),sentiment=validated(analysis?.sentiment,commentLabels),stance=validated(analysis?.stance,stanceLabels);
   commentCounts[sentiment?.label||'unknown']++;commentStanceCounts[stance?.label||'unknown']++;
   return {...c,sentiment,stance,post};
  })};
 });
 return {posts:enriched,comments:enriched.flatMap(p=>p.responseComments),stanceCounts,commentCounts,commentStanceCounts,target:data?.target||''};
}

/** Shares of a breakdown, read over what has been analysed. `unknown` is coverage, not a category: it has no share,
 * so a small analysed sample never reads as "0,9% negatif" of everything stored. Tone counts (positive, neutral,
 * negative) are tone_share_v1 (`toneShares`): whole numbers that add up to 100, and `text` prints a sliver as "<1%".
 * @returns {{total:number, analysed:number, percent:(key:string)=>number|null, text:(key:string)=>string|null}}
 * `percent` is null for `unknown` and when nothing is analysed; `text` is null for those and for a breakdown that is not of tones. */
export function analysedShares(counts){
  const total=Object.values(counts).reduce((a,b)=>a+b,0),analysed=total-(counts.unknown||0);
  if(TONES.every(key=>Object.hasOwn(counts,key))){
    const tone=toneShares(counts);
    return {total,analysed,percent:key=>key==='unknown'||!tone.percent?null:tone.percent[key]??0,text:key=>tone.text?.[key]??null};
  }
  return {total,analysed,percent:key=>key==='unknown'||!analysed?null:(counts[key]||0)/analysed*100,text:()=>null};
}

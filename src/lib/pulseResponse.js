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

import {sentimentDate} from './pulseSentiment.js';
// Faces for emotion labels. Always shown with the label.
export const emotionFaces={joy:'😄',anger:'😡',sadness:'😢',fear:'😨',disgust:'🤢',admiration:'🤩',none:'🤔'};
export const emotionLabels={joy:'Senang',anger:'Marah',sadness:'Sedih',fear:'Takut',disgust:'Jijik',admiration:'Kagum',none:'Tidak jelas'};
export function postEmotion(post){
 const value=post.metrics?.emotion;
 return value&&Object.hasOwn(emotionLabels,value.label)&&typeof value.confidence==='number'&&Number.isFinite(value.confidence)&&value.confidence>=0&&value.confidence<=1&&typeof value.reason==='string'&&value.reason.trim()?value:null;
}
export function emotionEvidence(posts=[]){
 const counts=Object.fromEntries(Object.keys(emotionLabels).map(key=>[key,0]));
 const rows=Object.fromEntries(Object.keys(emotionLabels).map(key=>[key,[]]));
 const days=new Map();let unknown=0,review=0;
 for(const post of posts){
  const value=postEmotion(post);
  if(!value){unknown++;continue;}
  counts[value.label]++;rows[value.label].push(post);
  if(value.review_needed||value.confidence<.7)review++;
  const date=sentimentDate(post);
  if(date){if(!days.has(date))days.set(date,{date,...Object.fromEntries(Object.keys(emotionLabels).map(key=>[key,0]))});days.get(date)[value.label]++;}
 }
 return {counts,rows,unknown,review,analyzed:posts.length-unknown,total:posts.length,days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date))};
}
/** What the emotion panel says first, from `emotionEvidence`: how many analysed posts state an emotion at all, and the
 * six emotions ranked among themselves. A `share` in `ranked` is of the posts that state an emotion, so the six add up
 * to the whole; `share` at the top is of the analysed posts. `lead` is null when no post states one. */
export function emotionSummary(data){
 const keys=Object.keys(emotionLabels).filter(key=>key!=='none');
 const emotional=keys.reduce((sum,key)=>sum+(data.counts[key]||0),0),none=data.counts.none||0,analyzed=emotional+none;
 const ranked=keys.map((key,index)=>({key,index,count:data.counts[key]||0,share:emotional?(data.counts[key]||0)/emotional:0}))
  .sort((a,b)=>b.count-a.count||a.index-b.index).map(row=>({key:row.key,count:row.count,share:row.share}));
 return {emotional,none,analyzed,share:analyzed?emotional/analyzed:0,ranked,lead:emotional?ranked[0]:null};
}
/** The days of `emotionEvidence` with the days in between that had no result added as zeros, so the time axis does not
 * skip a quiet day. Left as it is when first to last day is more than `limit` days: that many bars cannot be read. */
export function filledDays(days=[],limit=92){
 if(days.length<2)return days;
 const at=date=>Date.parse(date+'T00:00:00Z'),span=Math.round((at(days.at(-1).date)-at(days[0].date))/86400000)+1;
 if(!(span>days.length)||span>limit)return days;
 const known=new Map(days.map(row=>[row.date,row])),empty=Object.fromEntries(Object.keys(emotionLabels).map(key=>[key,0]));
 return Array.from({length:span},(_,index)=>{const date=new Date(at(days[0].date)+index*86400000).toISOString().slice(0,10);return known.get(date)||{date,...empty};});
}

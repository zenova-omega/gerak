import {postInteractions} from '../lib/pulseEngagement';

/** The sum of one figure over posts (`interactions` is the shared definition); null when no post reports it. */
export const sumOf=(posts,key)=>{const values=posts.map(p=>key==='interactions'?postInteractions(p.metrics):p.metrics?.[key]).filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0):null;};

const shortDay=value=>new Date(value).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'});
/** First and last publication day of a group, in WIB. Empty when no post carries a date. */
export function dateRange(posts){
 const times=posts.map(p=>Date.parse(p.published_at)).filter(Number.isFinite).sort((a,b)=>a-b);
 if(!times.length)return '';
 const first=shortDay(times[0]),last=shortDay(times.at(-1));
 return first===last?first:`${first} – ${last}`;
}

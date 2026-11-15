import {postInteractions} from '../lib/pulseEngagement';
import {pulseDay} from '../lib/pulseData';
import {sentimentDate} from '../lib/pulseSentiment';

/** The sum of one figure over posts (`interactions` is the shared definition); null when no post reports it. */
export const sumOf=(posts,key)=>{const values=posts.map(p=>key==='interactions'?postInteractions(p.metrics):p.metrics?.[key]).filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0):null;};

/** First and last publication day of a group (day_v1, the installation's zone). Empty when no post carries a date. */
export function dateRange(posts){
 const days=posts.map(sentimentDate).filter(Boolean).sort();
 if(!days.length)return '';
 const first=pulseDay(days[0]),last=pulseDay(days.at(-1));
 return first===last?first:`${first} – ${last}`;
}

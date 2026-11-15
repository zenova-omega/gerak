import {interactionsTotal,reported} from '../lib/pulseMeasures';
import {pulseDay} from '../lib/pulseData';
import {sentimentDate} from '../lib/pulseSentiment';

/** The sum of one reported figure over posts; null when no post reports it. `interactions` is interactions_v1 through
 * `interactionsTotal` (which also gives its post count). Shares of a set take `sharesTotal` or `contentShares`. */
export const sumOf=(posts,key)=>{if(key==='interactions')return interactionsTotal(posts).value;const values=posts.map(p=>reported(p.metrics?.[key])).filter(value=>value!==null);return values.length?values.reduce((a,b)=>a+b,0):null;};

/** First and last publication day of a group (day_v1, the installation's zone). Empty when no post carries a date. */
export function dateRange(posts){
 const days=posts.map(sentimentDate).filter(Boolean).sort();
 if(!days.length)return '';
 const first=pulseDay(days[0]),last=pulseDay(days.at(-1));
 return first===last?first:`${first} – ${last}`;
}

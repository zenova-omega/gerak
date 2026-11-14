import {useEffect,useState} from 'react';
import api from '../lib/api';
import {previousPeriod} from '../lib/pulseOverview';
export default function useOverviewEvidence(topicId,period,revision){
 const from=period?.from||'',to=period?.to||'',key=JSON.stringify([topicId,from,to]);
 const [state,setState]=useState({key:null});
 useEffect(()=>{
  let active=true;
  async function load(){
   const previous=previousPeriod({from,to}),base={topic_id:topicId};
   const requests=[api.get('/admin/pulse/reviews',base),api.get('/admin/pulse/growth',{...base,...(from?{from}:{}),...(to?{to}:{})}),previous?api.get('/admin/pulse/analytics',{...base,...previous}):Promise.resolve(null)];
   const [reviews,growth,comparison]=await Promise.allSettled(requests);
   if(active)setState({key,reviews:reviews.status==='fulfilled'?reviews.value:null,growth:growth.status==='fulfilled'?growth.value:null,previousPosts:comparison.status==='fulfilled'?comparison.value?.posts??null:null,comparisonError:comparison.status==='rejected',loaded:true});
  }
  if(topicId)load();window.addEventListener('pulse-reviews-changed',load);
  return()=>{active=false;window.removeEventListener('pulse-reviews-changed',load);};
 },[topicId,from,to,key,revision]);
 return state.key===key?state:{loaded:false};
}

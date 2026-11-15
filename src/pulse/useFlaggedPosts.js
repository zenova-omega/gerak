import {useEffect,useState} from 'react';
import api from '../lib/api';

/** Ids of the posts an analyst marked "tidak relevan" in one project. They stay stored; the analysis pages leave them
 * out of every figure unless asked, and the Posting page always lists them so the mark can be taken back. */
export default function useFlaggedPosts(topicId){
 const [state,setState]=useState({topicId:null,ids:[],loaded:false});
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const result=await api.get('/admin/pulse/reviews',{topic_id:topicId});
    if(active)setState({topicId,ids:(result?.reviews||[]).filter(row=>row.relevance==='irrelevant').map(row=>row.post_id),loaded:true});
   }catch{if(active)setState({topicId,ids:[],loaded:false});}
  }
  if(topicId)load();
  window.addEventListener('pulse-reviews-changed',load);
  return()=>{active=false;window.removeEventListener('pulse-reviews-changed',load);};
 },[topicId]);
 return state.topicId===topicId?state:{topicId,ids:[],loaded:false};
}

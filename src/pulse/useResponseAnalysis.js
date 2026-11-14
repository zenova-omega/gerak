import {useEffect,useState} from 'react';
import api from '../lib/api';
export default function useResponseAnalysis(topicId){
 const [state,setState]=useState({});
 useEffect(()=>{
  let active=true,timer;
  async function load(){
   try{
    const response=await api.get('/admin/pulse/response-analysis',{topic_id:topicId});
    if(active)setState({topicId,response,loaded:true,error:false});
   }catch{if(active)setState({topicId,response:null,loaded:true,error:true});}
   finally{if(active)timer=setTimeout(load,15000);}
  }
  if(topicId)load();
  return()=>{active=false;clearTimeout(timer);};
 },[topicId]);
 return state.topicId===topicId?state:{response:null,loaded:false,error:false};
}

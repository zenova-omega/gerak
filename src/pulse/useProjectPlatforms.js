import {useCallback,useEffect,useSyncExternalStore} from 'react';
import {useSearchParams} from 'react-router-dom';
import {createPlatformStore,readProjectPlatforms} from '../lib/pulseProjectFilters.js';

const store=createPlatformStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
function subscribe(callback){
  window.addEventListener('pulse-platforms-changed',callback);
  window.addEventListener('storage',callback);
  return ()=>{window.removeEventListener('pulse-platforms-changed',callback);window.removeEventListener('storage',callback);};
}
export default function useProjectPlatforms(id){
  const [params,setParams]=useSearchParams();
  const raw=useSyncExternalStore(subscribe,useCallback(()=>store.read(id||''),[id]),()=> '');
  const platforms=readProjectPlatforms(params,raw);
  const encoded=JSON.stringify(platforms),hasScope=params.has('platforms');
  useEffect(()=>{
    if(id&&hasScope&&store.read(id)!==encoded){store.write(id,JSON.parse(encoded));window.dispatchEvent(new Event('pulse-platforms-changed'));}
  },[id,hasScope,encoded]);
  const setPlatforms=useCallback(value=>{
    store.write(id||'',value);
    window.dispatchEvent(new Event('pulse-platforms-changed'));
    setParams(previous=>{const next=new URLSearchParams(previous);next.set('platforms',value===null?'all':[...value].sort().join(','));return next;});
  },[id,setParams]);
  return [platforms,setPlatforms];
}

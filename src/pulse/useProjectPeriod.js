import { useSyncExternalStore, useCallback } from 'react';

const memory=new Map();
const prefix='pulse:project-period:';
function read(id) {
  try { return localStorage.getItem(prefix+id)||''; } catch { return memory.get(id)||''; }
}
function subscribe(callback) {
  window.addEventListener('pulse-period-changed',callback);
  window.addEventListener('storage',callback);
  return ()=>{window.removeEventListener('pulse-period-changed',callback);window.removeEventListener('storage',callback);};
}
export function validPeriod(from='',to='') {
  const valid=value=>!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
  return valid(from)&&valid(to)&&!(from&&to&&from>to);
}
export default function useProjectPeriod(id) {
  const raw=useSyncExternalStore(subscribe,useCallback(()=>read(id||''),[id]),()=> '');
  let period={from:'',to:''};
  try { const parsed=JSON.parse(raw);if(validPeriod(parsed.from,parsed.to))period={from:parsed.from||'',to:parsed.to||''}; } catch { /* Empty or stale preferences use the full period. */ }
  const setPeriod=useCallback(({from='',to=''})=>{
    if(!validPeriod(from,to))throw new Error('Tanggal akhir harus sama atau setelah tanggal mulai.');
    const value=JSON.stringify({from,to});memory.set(id||'',value);
    try{localStorage.setItem(prefix+(id||''),value);}catch{/* This session still works without persistence. */}
    window.dispatchEvent(new Event('pulse-period-changed'));
  },[id]);
  return [period,setPeriod];
}

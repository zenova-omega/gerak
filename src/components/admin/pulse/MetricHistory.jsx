import { PulseButton } from '../../ui/PulseUI';
import React, { useState } from 'react';
import api from '../../../lib/api';
import { pulseDate, formatCount, pulseError } from '../../../lib/pulseData';

export default function MetricHistory({ itemId }) {
  const [data,setData]=useState(null),[error,setError]=useState(null),[loading,setLoading]=useState(false);
  const load=async()=>{setLoading(true);setError(null);try{setData(await api.get('/admin/pulse/monitor/items/'+encodeURIComponent(itemId)+'/snapshots'))}catch(e){setError(e)}finally{setLoading(false)}};
  return <details className="pm-metric-history" onToggle={e=>{if(e.currentTarget.open&&!data&&!loading&&!error)load()}}><summary>Riwayat angka interaksi</summary>{loading&&<p role="status">Memuat riwayat…</p>}{error&&<p role="alert">{pulseError(error)}</p>}{(data||error)&&<PulseButton disabled={loading} onClick={load}>Muat ulang riwayat</PulseButton>}{data&&!data.snapshots.length&&<p>Belum ada riwayat.</p>}{data?.snapshots.length>0&&<><div className="pm-table"><table><thead><tr><th>Diamati (WIB)</th><th>Likes</th><th>Komentar</th><th>Shares</th><th>Tayangan</th></tr></thead><tbody>{data.snapshots.map(s=><tr key={s.id}><td>{pulseDate(s.observed_at)}</td>{['likes','comments','shares','views'].map(k=><td key={k}>{formatCount(s.metrics[k])}</td>)}</tr>)}</tbody></table></div></>}</details>;
}

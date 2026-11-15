import { useState } from 'react';
import { dailyPostCounts, filterPosts } from '../../../lib/pulsePostFilters';
import { PulseButton } from '../../ui/PulseUI';
import './mention-timeline.css';

export default function MentionTimeline({ posts, filters, onApply, globalPeriod=false }) {
  const [error,setError]=useState('');
  const scoped=filterPosts(posts,{...filters,from:'',to:''});
  const days=dailyPostCounts(scoped);
  const maximum=Math.max(1,...days.map(d=>d.count));
  const undated=scoped.length-days.reduce((sum,d)=>sum+d.count,0);
  function apply(event) {
    event.preventDefault();
    const fields=new FormData(event.currentTarget),from=fields.get('from'),to=fields.get('to');
    if(from&&to&&from>to){setError('Tanggal akhir tidak boleh sebelum tanggal mulai.');return;}
    setError('');onApply({...filters,from,to});
  }
  return <section className="pm-mentions-timeline" aria-label="Timeline posting harian">
    <div className="pm-mentions-title"><h3>Perkembangan percakapan</h3><span>Publikasi · WIB · awal → akhir</span></div>
    {!globalPeriod&&<form key={filters.from+':'+filters.to} onSubmit={apply} className="pm-mentions-dates">
      <label>Tanggal mulai<input name="from" type="date" defaultValue={filters.from}/></label>
      <label>Tanggal akhir<input name="to" type="date" defaultValue={filters.to}/></label>
      <PulseButton type="submit" variant="primary">Terapkan tanggal</PulseButton>
      {(filters.from||filters.to)&&<PulseButton onClick={()=>{setError('');onApply({...filters,from:'',to:''});}}>Seluruh periode</PulseButton>}
    </form>}
    {error&&<p role="alert">{error}</p>}
    <div className="pm-mentions-bars" role="group" aria-label="Pilih tanggal publikasi">{days.map(day=><button key={day.date} type="button" aria-label={`${day.date}: ${day.count} posting`} aria-pressed={filters.from===day.date&&filters.to===day.date} onClick={()=>{setError('');onApply({...filters,from:day.date,to:day.date});}}>
      <strong>{day.count}</strong><span className="pm-mentions-bar" style={{height:Math.max(4,day.count/maximum*76)}} aria-hidden="true"/><time dateTime={day.date}>{day.date.slice(8)}/{day.date.slice(5,7)}<small>{day.date.slice(0,4)}</small></time>
    </button>)}</div>
    {!days.length&&<p>Belum ada posting bertanggal.</p>}
    <small>{undated} posting tanpa tanggal tidak masuk grafik.</small>
  </section>;
}

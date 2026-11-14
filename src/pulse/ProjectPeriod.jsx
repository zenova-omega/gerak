import { useState } from 'react';
import useProjectPeriod from './useProjectPeriod';
import { PulseButton } from '../components/ui/PulseUI';
import { PulseTag } from '../components/ui/PulseTag';
import InfoTip from './InfoTip';
import { wibDay, presets, activePreset, rangeText as periodRange } from './projectPeriodPresets';

export default function ProjectPeriod({topicId}) {
  const [period,setPeriod]=useProjectPeriod(topicId);
  const [error,setError]=useState('');
  const [custom,setCustom]=useState(false);
  const today=wibDay();
  const active=activePreset(period,today);
  const rangeText=periodRange(period);
  function choose(next){ try{setPeriod(next);setError('');setCustom(false);}catch(err){setError(err.message);} }
  function apply(event) {
    event.preventDefault();const data=new FormData(event.currentTarget);
    try{setPeriod({from:data.get('from'),to:data.get('to')});setError('');setCustom(false);}catch(err){setError(err.message);}
  }
  return <section className="ps-project-period ps-scope-group" aria-label="Periode analisis project">
    <span className="ps-scope-label">Periode <InfoTip label="Tentang periode analisis">Waktu publikasi dalam WIB, bukan tanggal crawl. Saat filter aktif, posting tanpa tanggal tidak dihitung. Ikhtisar, Posting, Akun dan Jaringan memakai rentang yang sama. Disimpan per project di browser ini; jadwal crawler dan kuota tidak berubah.</InfoTip></span>
    <div className="pu-tag-group" role="group" aria-label="Pilih periode">
      <PulseTag size="lg" tone="accent" pressed={active==='all'&&!custom} onClick={()=>choose({})}>Semua</PulseTag>
      {presets.map(([key,label,days])=><PulseTag key={key} size="lg" tone="accent" pressed={active===key&&!custom} onClick={()=>choose({from:wibDay(days),to:today})}>{label}</PulseTag>)}
      <PulseTag size="lg" tone="accent" pressed={custom||active==='custom'} aria-expanded={custom} onClick={()=>setCustom(value=>!value)}>Kustom</PulseTag>
    </div>
    <p className="ps-scope-range" role="status">{rangeText}</p>
    {custom&&<form key={topicId+period.from+period.to} onSubmit={apply}>
      <label>Tanggal mulai<input name="from" type="date" defaultValue={period.from} max={today}/></label>
      <label>Tanggal akhir<input name="to" type="date" defaultValue={period.to} max={today}/></label>
      <PulseButton type="submit" variant="primary">Terapkan</PulseButton>
      <PulseButton variant="quiet" onClick={()=>setCustom(false)}>Batal</PulseButton>
    </form>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}

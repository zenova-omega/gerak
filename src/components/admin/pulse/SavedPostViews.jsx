import { useState } from 'react';
import { parseSavedViews } from '../../../lib/pulsePostFilters';
import { PulseButton } from '../../ui/PulseUI';

export default function SavedPostViews({topicId,draft,onLoad}) {
  const key='pulse:saved-post-views:'+topicId;
  const [views,setViews]=useState(()=>{try{return parseSavedViews(localStorage.getItem(key));}catch{return [];}});
  const [name,setName]=useState('');
  const [notice,setNotice]=useState('');
  function save() {
    if(!name.trim())return;
    if(views.some(v=>v.name===name.trim())){setNotice('Nama sudah digunakan. Pilih nama lain.');return;}
    if(views.length>=20){setNotice('Maksimal 20 tampilan per project.');return;}
    const next=parseSavedViews(JSON.stringify([...views,{name:name.trim(),filters:draft}]));
    try{localStorage.setItem(key,JSON.stringify(next));setViews(next);setName('');setNotice('Tampilan tersimpan di browser ini.');}
    catch{setNotice('Penyimpanan browser tidak tersedia. Filter masih dapat diterapkan.');}
  }
  return <section><h3>Tampilan tersimpan</h3><p>Per project, di browser ini. Tanggal tetap mengikuti periode project.</p>
    {views.length>0 && <label>Pilih tampilan<select value="" onChange={e=>{const view=views[Number(e.target.value)];if(view){onLoad({...view.filters});setNotice('Pilihan dimuat. Klik Terapkan filter.');}}}><option value="" disabled>Pilih…</option>{views.map((v,i)=><option value={i} key={v.name}>{v.name}</option>)}</select></label>}
    <label>Nama tampilan<input maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: TikTok negatif"/></label><PulseButton disabled={!name.trim()||!topicId} onClick={save}>Simpan pilihan filter</PulseButton>{notice&&<p role="status">{notice}</p>}
  </section>;
}

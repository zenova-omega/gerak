import { useRef, useState } from 'react';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import { defaultPostFilters, filterPosts, sentimentCounts, sentimentLabels } from '../../../lib/pulsePostFilters';
import { sentimentTone } from '../../../lib/pulseChartTheme';
import { formatCount } from '../../../lib/pulseData';
import { PulseTag } from '../../ui/PulseTag';
import PlatformCheckboxes from './PlatformCheckboxes';
import { PulseButton } from '../../ui/PulseUI';
import './post-filter-drawer.css';
import SavedPostViews from './SavedPostViews';

export default function PostFilterDrawer({ posts, filters, onApply, globalPeriod=false, topicId='' }) {
  const dialog = useRef(null);
  const [draft,setDraft] = useState(filters);
  const [error,setError] = useState('');
  const count = Object.keys(defaultPostFilters).filter(k=>k !== 'sort' && filters[k] !== defaultPostFilters[k]).length;
  const sentimentTotals = sentimentCounts(filterPosts(posts,{...draft,sentiments:null}));
  const field = key => ({value:draft[key],onChange:event=>{setDraft({...draft,[key]:event.target.value});setError('');}});
  function open() { setDraft({...filters});setError('');dialog.current.showModal(); }
  function apply(event) {
    event.preventDefault();
    if(draft.from && draft.to && draft.from > draft.to) { setError('Tanggal akhir tidak boleh sebelum tanggal mulai.');return; }
    onApply(draft);dialog.current.close();
  }
  return <>
    <div className="pf-toolbar"><PulseButton onClick={open} aria-haspopup="dialog"><SlidersHorizontal size={17}/>Filter lanjutan{count ? ` · ${count} aktif` : ''}</PulseButton>{count > 0 && <PulseButton variant="quiet" onClick={()=>onApply({...defaultPostFilters})}>Hapus semua filter</PulseButton>}</div>
    <dialog ref={dialog} className="pf-drawer" aria-labelledby="pf-title" onClick={event=>{if(event.target===dialog.current){const box=dialog.current.getBoundingClientRect();if(event.clientX<box.left || event.clientX>box.right) dialog.current.close();}}}>
      <form onSubmit={apply}>
        <header><div><h2 id="pf-title">Filter posting</h2></div><PulseButton aria-label="Tutup filter" onClick={()=>dialog.current.close()}><X size={20}/></PulseButton></header>
        <div className="pf-body">
          {draft.exactAuthor && <section><h3>Akun dari ranking</h3><p>{draft.exactAuthor}</p><PulseButton onClick={()=>setDraft({...draft,exactAuthor:''})}>Lepas akun terpilih</PulseButton></section>}
          <section><h3>Konten & sumber</h3><label>Keyword atau frasa<input autoFocus type="search" placeholder="Cari dalam teks posting…" {...field('query')}/></label><label>Nama akun<input type="search" placeholder="Contoh: tempodotco" {...field('author')}/></label><PlatformCheckboxes platforms={[...new Set(posts.map(p=>p.platform))]} value={draft.platforms} onChange={platforms=>setDraft({...draft,platforms})} counts={posts.reduce((acc,p)=>({...acc,[p.platform]:(acc[p.platform]||0)+1}),{})} /></section>
          <section><h3>Sentimen posting</h3><div className="pf-sentiments" role="group" aria-label="Sentimen posting">{Object.entries(sentimentLabels).map(([key,label])=>{const selected=draft.sentiments??Object.keys(sentimentLabels),on=selected.includes(key);return <PulseTag key={key} size="lg" dot icon={on?Check:undefined} tone={sentimentTone[key]} pressed={on} count={formatCount(sentimentTotals[key])} onClick={()=>{const next=on?selected.filter(s=>s!==key):[...selected,key];setDraft({...draft,sentiments:next.length===Object.keys(sentimentLabels).length?null:next});}}>{label}</PulseTag>;})}</div><p>{draft.sentiments===null?null:draft.sentiments.length?<>{draft.sentiments.length} dari 4 kategori. <button type="button" className="pf-link" onClick={()=>setDraft({...draft,sentiments:null})}>Tampilkan semua</button></>:<>Tidak ada kategori dipilih. <button type="button" className="pf-link" onClick={()=>setDraft({...draft,sentiments:null})}>Tampilkan semua</button></>}</p></section>
          {globalPeriod?<section><h3>Waktu publikasi</h3><p>Mengikuti periode project.</p></section>:<section><h3>Waktu publikasi · WIB</h3><div className="pf-dates"><label>Dari tanggal<input type="date" {...field('from')}/></label><label>Sampai tanggal<input type="date" {...field('to')}/></label></div></section>}
          <section><h3>Interaksi & media</h3><label>Minimal interaksi<input type="number" min="0" step="1" placeholder="Tanpa batas minimum" {...field('minEngagement')}/></label><label>Gambar pratinjau Instagram & TikTok<select {...field('media')}><option value="all">Semua posting</option><option value="available">Punya gambar pratinjau</option><option value="missing">Tanpa gambar pratinjau</option></select></label><label>Urutkan hasil<select {...field('sort')}><option value="engagement">Interaksi tertinggi</option><option value="recent">Terbaru dahulu</option><option value="oldest">Terlama dahulu · kronologis</option><option value="shares">Repost terbanyak</option><option value="views">Tayangan tertinggi</option></select></label></section>
          <SavedPostViews key={topicId} topicId={topicId} draft={draft} onLoad={setDraft}/>
          {error && <p role="alert" className="pf-error">{error}</p>}
        </div>
        <footer><span role="status">{formatCount(filterPosts(posts,draft).length)} dari {formatCount(posts.length)} posting cocok</span><div><PulseButton onClick={()=>{setDraft({...defaultPostFilters});setError('');}}>Reset pilihan</PulseButton><PulseButton type="submit" variant="primary">Terapkan filter</PulseButton></div></footer>
      </form>
    </dialog>
  </>;
}

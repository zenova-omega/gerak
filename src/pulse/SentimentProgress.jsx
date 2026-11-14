import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../lib/api';
import './sentiment-progress.css';
import InfoTip from './InfoTip';
import {sentimentCounts} from '../lib/pulsePostFilters';

export default function SentimentProgress({ topicId, onChange, quiet = false, posts }) {
  const [state,setState] = useState(null);
  const [error,setError] = useState(false);
  useEffect(() => {
    let active = true, timer, previous = null;
    async function poll() {
      try {
        const data = await api.get('/admin/pulse/sentiment/progress',topicId ? {topic_id:topicId} : undefined);
        if (!active) return;
        setState(data); setError(false);
        const signature = `${data.total}:${data.analyzed}`;
        if (previous !== null && signature !== previous) onChange?.({background:true});
        previous = signature;
      } catch { if (active) setError(true); }
      finally { if (active) timer = setTimeout(poll,10000); }
    }
    poll();
    return () => {active=false;clearTimeout(timer);};
  },[topicId,onChange]);
  if (quiet) return null;
  if (!state) return <p className="ps-ai-progress-status" role="status">{error?'Status analisis belum tersedia.':'Memuat hasil analisis…'}</p>;
  const total=posts ? posts.length : state.total;
  const analyzed=posts ? total-sentimentCounts(posts).unknown : state.analyzed;
  const percent = (total ? analyzed/total*100 : 0).toLocaleString('id-ID',{maximumFractionDigits:1});
  return <section className="ps-ai-progress" aria-label="Progress analisis sentimen otomatis">
    <div className="ps-ai-progress-heading"><strong><Sparkles size={16} aria-hidden="true"/>{!total?'Tidak ada posting pada pilihan ini':analyzed < total ? 'Analisis belum lengkap' : 'Analisis selesai'}</strong><span>{analyzed.toLocaleString('id-ID')} / {total.toLocaleString('id-ID')} posting dianalisis ({percent}%)</span></div>
    <progress value={analyzed} max={Math.max(1,total)} aria-label="Posting dengan hasil sentimen"/>
    <div className="ps-help-row">{posts?'Cakupan periode & platform terpilih':'Cakupan seluruh project'} <InfoTip label="Tentang progress analisis">Posting yang belum dianalisis tidak dihitung sebagai netral. Seluruh project: {state.analyzed}/{state.total} berlabel.</InfoTip></div>
    {error && <p role="status">Koneksi status terputus. Angka terakhir mungkin belum mutakhir.</p>}
  </section>;
}

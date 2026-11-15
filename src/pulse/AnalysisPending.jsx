import {Sparkles} from 'lucide-react';
import './analysis-pending.css';

export default function AnalysisPending({post,compact=false}) {
 if(compact)return <aside className="pulse-analysis-pending" aria-label="Status analisis AI"><strong>Analisa belum tersedia.</strong></aside>;
 const hasText=Boolean((post?.text||post?.title||'').trim());
 return <aside className="pulse-analysis-pending" aria-label="Status analisis AI"><Sparkles size={17} aria-hidden="true"/><div><strong>Analisis AI belum tersedia</strong>{!hasText&&<p>Tidak ada teks untuk dianalisis.</p>}</div></aside>;
}

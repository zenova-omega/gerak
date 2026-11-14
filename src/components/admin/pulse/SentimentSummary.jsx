import { sentimentCounts, sentimentLabels } from '../../../lib/pulsePostFilters';

export default function SentimentSummary({posts,onSelect}) {
  const counts=sentimentCounts(posts);
  const total=posts.length;
  return <section className="pulse-panel ps-sentiment" aria-label="Analisis sentimen posting">
    <div className="pulse-panel-heading"><div><h2>Sentimen percakapan</h2><p>{total-counts.unknown} dari {total} posting sudah memiliki label sentimen per posting.</p></div></div>
    <div className="ps-sentiment-bars">{Object.entries(sentimentLabels).map(([key,label])=><button type="button" key={key} onClick={()=>onSelect(key)} aria-label={`Lihat posting ${label}: ${counts[key]}`}>
      <span>{label}</span><span className="ps-sentiment-track"><span className={'ps-sentiment-fill '+key} style={{width:`${total?counts[key]/total*100:0}%`}}/></span><strong>{counts[key]}</strong><small>{total?Math.round(counts[key]/total*100):0}%</small>
    </button>)}</div>
    <p className="pulse-footnote">Klik kategori untuk memeriksa posting sumber. Sentimen adalah nada konten, bukan posisi politik akun. Belum dianalisis tidak berarti netral.</p>
  </section>;
}

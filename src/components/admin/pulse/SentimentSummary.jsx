import { sentimentCounts, sentimentLabels } from '../../../lib/pulsePostFilters';
import { toneShares } from '../../../lib/pulseMeasures';

export default function SentimentSummary({posts,onSelect}) {
  const counts=sentimentCounts(posts);
  const total=posts.length, tone=toneShares(counts);
  // tone_share_v1: a tone's share is of the analysed posts; "belum dianalisis" is a count with its part of all posts.
  const part=key=>key==='unknown'?(total?counts.unknown/total*100:0):(tone.analysed?counts[key]/tone.analysed*100:0);
  return <section className="pulse-panel ps-sentiment" aria-label="Analisis sentimen posting">
    <div className="pulse-panel-heading"><div><h2>Sentimen percakapan</h2><p>{total-counts.unknown} dari {total} posting sudah memiliki label sentimen per posting.</p></div></div>
    <div className="ps-sentiment-bars">{Object.entries(sentimentLabels).map(([key,label])=><button type="button" key={key} onClick={()=>onSelect(key)} aria-label={`Lihat posting ${label}: ${counts[key]}`}>
      <span>{label}</span><span className="ps-sentiment-track"><span className={'ps-sentiment-fill '+key} style={{width:`${part(key)}%`}}/></span><strong>{counts[key]}</strong><small>{key==='unknown'?(total?`${Math.round(part(key))}% dari seluruh posting`:''):tone.text?.[key]??''}</small>
    </button>)}</div>
    <p className="pulse-footnote">Klik kategori untuk memeriksa posting sumber. Sentimen adalah nada konten, bukan posisi politik akun. Belum dianalisis tidak berarti netral.</p>
  </section>;
}

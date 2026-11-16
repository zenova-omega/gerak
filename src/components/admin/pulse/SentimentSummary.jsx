import { sentimentCounts, sentimentLabels } from '../../../lib/pulsePostFilters';
import { toneShares } from '../../../lib/pulseMeasures';
import { PulseCard } from '../../ui/PulseSurface';
import InfoTip from '../../../pulse/InfoTip';

export default function SentimentSummary({posts,onSelect}) {
  const counts=sentimentCounts(posts);
  const total=posts.length, tone=toneShares(counts);
  // tone_share_v2: every share is of all posts, "belum dianalisis" the fourth part of the 100.
  const part=key=>tone.percent?.[key]??0;
  return <PulseCard className="pulse-panel ps-sentiment" aria-label="Analisis sentimen posting" padding="none" level={2} title={<>Sentimen percakapan<InfoTip label="Tentang sentimen">Nada konten, bukan posisi politik akun. “Belum dianalisis” tidak berarti netral. Persen dari total posting.</InfoTip></>} description={<>{total-counts.unknown} dari {total} posting berlabel</>}>
    <div className="ps-sentiment-bars">{Object.entries(sentimentLabels).map(([key,label])=><button type="button" key={key} onClick={()=>onSelect(key)} aria-label={`Lihat posting ${label}: ${counts[key]}`}>
      <span>{label}</span><span className="ps-sentiment-track"><span className={'ps-sentiment-fill '+key} style={{width:`${part(key)}%`}}/></span><strong>{counts[key]}</strong><small>{tone.text?.[key]??''}</small>
    </button>)}</div>
  </PulseCard>;
}

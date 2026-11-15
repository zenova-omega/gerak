import {useEffect, useState} from 'react';
import api from '../lib/api';
import {PulseButton} from '../components/ui/PulseUI';
import InfoTip from './InfoTip';
import './SentimentEvaluation.css';

const labels = {positive:'Positif', neutral:'Netral', negative:'Negatif'};
const caveat = 'Kesepakatan pada data yang ditinjau, bukan akurasi umum.';

function evaluationParams(topicId, period = {}, platforms = null) {
  return {topic_id:topicId, from_date:period?.from || undefined, to_date:period?.to || undefined,
    platforms:platforms == null ? undefined : platforms.join(',')};
}

export function SentimentEvaluationView({data, loading=false, error=false, onRetry, noTopic=false}) {
  const scored = data?.paired_count > 0 && Number.isFinite(data?.agreement);
  return <section className="pse-evaluation" aria-label="Evaluasi sentimen ditinjau" aria-busy={loading}>
    <header><h2>Evaluasi sentimen ditinjau <InfoTip label="Tentang evaluasi">{caveat}</InfoTip></h2></header>
    {noTopic ? <p>Pilih project.</p> : loading ? <p role="status">Memuat…</p> : error ?
      <div role="alert"><p>Evaluasi belum dapat dimuat.</p><PulseButton onClick={onRetry}>Coba lagi</PulseButton></div> : data && <>
        <p className="pse-summary">{scored ? <><strong>{(data.agreement * 100).toLocaleString('id-ID', {maximumFractionDigits:1})}% kesepakatan</strong> · {data.matches} dari {data.paired_count} pasangan cocok.</> : 'Belum ada pasangan label.'}</p>
        <p className="pse-meta">{data.reviewed_count} label manual · {data.paired_count} pasangan.</p>
        {scored && <div className="pse-matrix"><table>
          <caption>Baris: label mesin. Kolom: label manual.</caption>
          <thead><tr><th scope="col">Mesin / Manual</th>{Object.entries(labels).map(([key, label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
          <tbody>{Object.entries(labels).map(([machine, label]) => <tr key={machine}><th scope="row">{label}</th>{Object.keys(labels).map(manual => <td key={manual} className={machine === manual ? 'pse-match' : undefined}>{data.confusion_matrix?.[machine]?.[manual] ?? 0}</td>)}</tr>)}</tbody>
        </table></div>}
        {data.samples?.length > 0 && <details><summary>Contoh bukti ({data.samples.length} dari {data.paired_count} pasangan)</summary>
          <ol>{data.samples.map(sample => <li key={sample.post_id}><p className="pse-meta">ID posting: {sample.post_id} · Mesin: {labels[sample.machine_sentiment]} · Manual: {labels[sample.manual_sentiment]}</p><p className="pse-caption">{sample.text || 'Teks tidak tersedia.'}</p></li>)}</ol>
          <p className="pse-meta">{data.samples_truncated ? 'Hanya 20 pasangan pertama.' : ''}</p>
        </details>}
      </>}
  </section>;
}

export default function SentimentEvaluation({topicId, period, platforms=null}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(null);
  const scope = JSON.stringify(evaluationParams(topicId, period, platforms));
  useEffect(() => {
    const changed = event => {
      if (topicId && event.detail?.topic_id === topicId) setAttempt(value => value + 1);
    };
    window.addEventListener('pulse-reviews-changed', changed);
    return () => window.removeEventListener('pulse-reviews-changed', changed);
  }, [topicId]);
  useEffect(() => {
    let active = true;
    if (topicId) {
      api.get('/admin/pulse/evaluation', JSON.parse(scope)).then(
        data => { if (active) setState({scope, attempt, data}); },
        () => { if (active) setState({scope, attempt, error:true}); },
      );
    }
    return () => { active = false; };
  }, [topicId, scope, attempt]);
  const current = state?.scope === scope && state?.attempt === attempt ? state : null;
  return <SentimentEvaluationView noTopic={!topicId} loading={!!topicId && !current}
    data={current?.data} error={current?.error} onRetry={() => setAttempt(value => value + 1)}/>;
}

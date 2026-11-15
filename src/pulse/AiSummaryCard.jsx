import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { PulseButton } from '../components/ui/PulseUI';
import { PulseTag } from '../components/ui/PulseTag';
import { PulseArrow } from '../components/ui/PulseArrow';
import { formatCount, pulseDate, safeSourceUrl } from '../lib/pulseData';
import SummaryInfographic, { Timeline } from './SummaryInfographics';
import { PulseLoader } from '../components/ui/PulseLoader';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { cardFormats, openingFormat } from './summaryModel';

const formatHelp = { brief: 'Enam jawaban singkat: awal, viral, topik, isi, sentimen, alasan.', timeline: 'Urutan kejadian per tanggal, lalu titik viral dan suasananya.', executive: 'Satu paragraf untuk pimpinan dan tiga hal yang perlu dipantau.' };

/** Text with evidence codes ([P1], [A2], [N1], [K3]) turned into links to the source list of this card. */
function Cited({ text, codes, prefix }) {
  return text.split(/(\[[PANKIT]\d{1,2}\])/).map((part, index) => {
    const code = part.match(/^\[([PANKIT]\d{1,2})\]$/)?.[1];
    return code && codes.has(code) ? <a key={index} className="pc-cite" href={`#${prefix}-${code}`}>{code}</a> : code ? null : part;
  });
}

/** The project in a few lines, written on request from stored posts and comments. Nothing is generated
 * until the analyst asks, so a half-crawled project is never summarised by accident. */
export default function AiSummaryCard({ topicId, period = {}, platforms = null, posts = 0 }) {
  const [state, setState] = useState(null);
  const [format, setFormat] = useState('brief');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!topicId) return;
    let active = true;
    api.get('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/summary')
      .then(data => { if (active) { setState(data); setFormat(openingFormat(data)); } })
      .catch(() => { if (active) setState({ available: false, error: true, summaries: {} }); });
    return () => { active = false; };
  }, [topicId]);
  async function make(key) {
    if (busy) return;
    setBusy(key); setError('');
    try {
      const body = { format: key };
      if (period.from) body.from = period.from;
      if (period.to) body.to = period.to;
      if (platforms !== null) body.platforms = platforms;
      const made = await api.post('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/summary', body);
      setState(current => ({ ...current, summaries: { ...(current?.summaries || {}), [key]: made } }));
    } catch (err) {
      setError(err.status === 503 ? 'Summary AI belum tersedia di instalasi ini.' : err.status === 409 ? 'Belum ada posting dalam cakupan ini untuk diringkas.' : err.status ? 'Summary belum berhasil disusun. Coba lagi.' : 'Tidak dapat terhubung ke server PULSE.');
    } finally { setBusy(''); }
  }
  if (!topicId || !state) return null;
  const formats = state.formats?.length ? state.formats : cardFormats;
  const summary = state.summaries?.[format];
  const thin = posts < (state.min_posts || 30);
  const stale = summary && posts > summary.scope.posts;
  const codes = new Set((summary?.sources || []).map(source => source.code));
  const prefix = 'ais-' + format;
  return <section className="ais-card" aria-label="Summary AI" aria-busy={Boolean(busy)}>
    <header className="ais-head">
      <span className="ais-mark" aria-hidden="true"><Sparkles size={20} strokeWidth={1.75} /></span>
      <div><span className="ais-eyebrow">SUMMARY AI</span><h2>{summary ? 'Isu ini dalam beberapa baris' : 'Ringkas isu ini dengan AI'}</h2></div>
      <div className="pu-tag-group ais-formats" role="group" aria-label="Bentuk summary">{formats.map(item => <PulseTag key={item.key} size="lg" tone="accent" pressed={format === item.key} onClick={() => setFormat(item.key)}>{item.label}{state.summaries?.[item.key] ? '' : ' ·  baru'}</PulseTag>)}</div>
    </header>
    {summary ? <>
      {stale && <p className="ais-stale" role="status">{formatCount(posts - summary.scope.posts)} posting baru belum masuk ringkasan ini. Angka di kartu lain sudah mencakupnya.</p>}
      <div className="ais-body" data-format={format}>{summary.sections.map((section, index) => <section key={index} data-kind={section.kind || 'text'}><h3>{section.title}</h3>
        <SummaryInfographic kind={section.kind} facts={summary.facts} />
        {section.paragraphs.map((text, i) => <p key={i}><Cited text={text} codes={codes} prefix={prefix} /></p>)}
        {section.bullets.length > 0 && (section.kind === 'timeline' ? <Timeline bullets={section.bullets} render={text => <Cited text={text} codes={codes} prefix={prefix} />} /> : section.kind === 'watch' ? <ol className="sig-watch">{section.bullets.map((text, i) => <li key={i}><Cited text={text} codes={codes} prefix={prefix} /></li>)}</ol> : <ul>{section.bullets.map((text, i) => <li key={i}><Cited text={text} codes={codes} prefix={prefix} /></li>)}</ul>)}
      </section>)}</div>
      {summary.sources.length > 0 && <details className="ais-sources"><summary>{formatCount(summary.sources.length)} bukti yang dirujuk</summary><ol>{summary.sources.map(source => <li key={source.code} id={`${prefix}-${source.code}`}><span className="pc-source-code">{source.code}</span><div><span className="pu-account-line"><AccountAvatar size="xs" author={source.author} platform={source.platform} /><strong>{source.author || 'Nama tidak tersedia'}</strong>{source.comment && <PulseTag size="sm">Komentar</PulseTag>}</span><p>{source.text || 'Teks tidak tersedia'}</p></div>{safeSourceUrl(source.url) && <a href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer" aria-label={'Buka sumber ' + source.code}><PulseArrow /></a>}</li>)}</ol></details>}
      <footer className="ais-foot"><p>Dibuat {pulseDate(summary.created_at)} dari {formatCount(summary.scope.posts)} posting dan {formatCount(summary.scope.comments)} komentar.{stale ? ` Sekarang ada ${formatCount(posts)} posting.` : ''} Dirangkai AI; periksa bukti sebelum dipakai.</p><PulseButton size="sm" variant={stale ? 'reverse' : 'secondary'} busy={busy === format} busyLabel="Menyusun…" onClick={() => make(format)}><RefreshCw />Perbarui</PulseButton></footer>
    </> : <div className="ais-empty">
      <p>{formatHelp[format]} Dibuat dari {formatCount(posts)} posting tersimpan beserta komentarnya, lengkap dengan bukti yang bisa dibuka.</p>
      {thin && <p className="ais-thin">Baru {formatCount(posts)} posting terkumpul. Summary lebih bisa diandalkan setelah pengumpulan berjalan lebih lama.</p>}
      <PulseButton variant="reverse" disabled={!state.available || !posts} busy={busy === format} busyLabel="Menyusun summary…" onClick={() => make(format)}><Sparkles />Buat summary AI</PulseButton>
      {!state.available && <small>{state.error ? 'Status layanan tidak dapat diperiksa. Muat ulang halaman.' : 'Fitur ini belum diaktifkan di instalasi Anda.'}</small>}
      {busy && <PulseLoader inline label="Membaca posting dan komentar. Biasanya kurang dari satu menit." />}
    </div>}
    {error && <p className="ais-error" role="alert">{error}</p>}
  </section>;
}

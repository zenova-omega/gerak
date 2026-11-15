import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Copy } from 'lucide-react';
import api from '../lib/api';
import { PulseButton } from '../components/ui/PulseUI';
import { PulseTag } from '../components/ui/PulseTag';
import { PulseArrow } from '../components/ui/PulseArrow';
import { formatCount, pulseDate, safeSourceUrl } from '../lib/pulseData';
import SummaryInfographic, { Timeline, Overview, conclusion } from './SummaryInfographics';
import { PulseLoader } from '../components/ui/PulseLoader';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { cardFormats, cardScope, openingFormat } from './summaryModel';
import * as store from './summaryStore';

const formatHelp = { brief: 'Enam jawaban singkat: awal, viral, topik, isi, sentimen, alasan.', timeline: 'Urutan kejadian per tanggal, lalu titik viral dan suasananya.', executive: 'Satu paragraf untuk pimpinan dan tiga hal yang perlu dipantau.' };

/** Text with evidence codes ([P1], [A2], [N1], [K3]) turned into links to the source list of this card. */
function Cited({ text, codes, prefix, titles = {} }) {
  return text.split(/(\[[PANKIT]\d{1,2}\])/).map((part, index) => {
    const code = part.match(/^\[([PANKIT]\d{1,2})\]$/)?.[1];
    return code && codes.has(code) ? <a key={index} className="pc-cite" href={`#${prefix}-${code}`} title={titles[code]}>{code}</a> : code ? null : part;
  });
}

/** The project in a few lines, written on request from stored posts and comments. Nothing is generated
 * until the analyst asks, so a half-crawled project is never summarised by accident. It always reads the whole
 * project, whatever the project bar's period and platforms (the owner, 15 Nov 2026): a summary is never narrowed or
 * replaced by a filter. What was read last is kept outside the card (summaryStore), so the summary stays on screen
 * while Ikhtisar reloads for another filter, and one still being written arrives when it is done. */
export default function AiSummaryCard({ topicId }) {
  const [state, setState] = useState(() => store.stored(topicId));
  const [format, setFormat] = useState(() => (state ? openingFormat(state) : 'brief'));
  const [busy, setBusy] = useState(() => cardFormats.find(item => store.writing(topicId, item.key))?.key || '');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!topicId) return;
    let active = true;
    const known = Boolean(store.stored(topicId));
    api.get('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/summary')
      .then(data => {
        // An answer written while the request was out is newer than what the server sent before it.
        const mine = store.stored(topicId)?.summaries || {};
        const merged = store.keep(topicId, { ...data, summaries: { ...data.summaries, ...Object.fromEntries(Object.entries(mine).filter(([key, made]) => !data.summaries?.[key] || made.created_at > data.summaries[key].created_at)) } });
        if (active) { setState(merged); if (!known) setFormat(openingFormat(merged)); }
      })
      .catch(() => { if (active && !store.stored(topicId)) setState({ available: false, error: true, summaries: {} }); });
    // A summary still being written when the card was drawn again: show it when it arrives.
    const pending = busy && store.writing(topicId, busy);
    if (pending) pending.then(() => { if (active) setState(store.stored(topicId)); }, () => {}).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps -- once per project; `busy` is only read for a request already running
  async function make(key) {
    if (busy) return;
    setBusy(key); setError('');
    try {
      // No period and no platforms: the server reads the whole project for the card's formats in any case.
      await store.write(topicId, key, () => api.post('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/summary', { format: key }));
      setState(store.stored(topicId));
    } catch (err) {
      setError(err.status === 503 ? 'Summary AI belum tersedia di instalasi ini.' : err.status === 409 ? 'Belum ada posting dalam cakupan ini untuk diringkas.' : err.status ? 'Summary belum berhasil disusun. Coba lagi.' : 'Tidak dapat terhubung ke server PULSE.');
    } finally { setBusy(''); }
  }
  if (!topicId || !state) return null;
  const formats = state.formats?.length ? state.formats : cardFormats;
  const summary = state.summaries?.[format];
  const posts = state.posts_now || 0;          // every stored post of the project, as the summary reads them
  const thin = posts < (state.min_posts || 30);
  const read = summary ? cardScope(summary.scope, posts) : null;
  const stale = Boolean(read?.newer);
  const codes = new Set((summary?.sources || []).map(source => source.code));
  const prefix = 'ais-' + format;
  const titles = Object.fromEntries((summary?.sources || []).map(source => [source.code, `${source.author || 'Sumber'}: ${(source.text || '').slice(0, 120)}`]));
  function copy() {
    const lines = [conclusion(summary.facts), ...summary.sections.flatMap(section => [section.title.toUpperCase(), ...section.paragraphs, ...section.bullets.map(text => '- ' + text)])].filter(Boolean).map(line => line.replace(/\s*\[[PANKIT]\d{1,2}\]/g, ''));
    navigator.clipboard?.writeText(lines.join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }
  return <section className="ais-card" aria-label="Summary AI" aria-busy={Boolean(busy)}>
    <header className="ais-head">
      <span className="ais-mark" aria-hidden="true"><Sparkles size={20} strokeWidth={1.75} /></span>
      <div><span className="ais-eyebrow">SUMMARY AI</span><h2>{summary ? 'Isu ini dalam beberapa baris' : 'Ringkas isu ini dengan AI'}</h2></div>
      <div className="pu-tag-group ais-formats" role="group" aria-label="Bentuk summary">{formats.map(item => <PulseTag key={item.key} size="lg" tone="accent" pressed={format === item.key} onClick={() => setFormat(item.key)}>{item.label}{state.summaries?.[item.key] ? '' : ' ·  baru'}</PulseTag>)}</div>
    </header>
    {summary ? <>
      {(stale || !summary.facts || !read.whole) && <p className="ais-stale" role="status"><span>{!read.whole ? `Ringkasan ini masih memakai cakupan lama: ${read.text.replace(/^Hanya/, 'hanya')}. Perbarui agar membaca seluruh periode project.` : <>{stale ? `Ringkasan ini baru membaca ${formatCount(summary.scope.posts)} dari ${formatCount(posts)} posting (${Math.round(summary.scope.posts / posts * 100)}%). ` : ''}{!summary.facts ? 'Dibuat sebelum grafik tersedia. ' : ''}Perbarui agar mencakup data terbaru.</>}</span><PulseButton size="sm" variant="reverse" busy={busy === format} busyLabel="Menyusun…" onClick={() => make(format)}><RefreshCw />Perbarui sekarang</PulseButton></p>}
      <Overview facts={summary.facts} />
      <div className="ais-body" data-format={format}>{summary.sections.map((section, index) => <section key={index} data-kind={section.kind || 'text'}><h3>{section.title}</h3>
        <SummaryInfographic kind={section.kind} facts={summary.facts} />
        {(section.kind === 'sentiment' && summary.facts?.sentiment?.analysed ? [] : section.paragraphs).map((text, i) => <p key={i}><Cited text={text} codes={codes} prefix={prefix} titles={titles} /></p>)}
        {section.bullets.length > 0 && (section.kind === 'timeline' ? <Timeline bullets={section.bullets} render={text => <Cited text={text} codes={codes} prefix={prefix} titles={titles} />} /> : section.kind === 'watch' ? <ol className="sig-watch">{section.bullets.map((text, i) => <li key={i}><Cited text={text} codes={codes} prefix={prefix} titles={titles} /></li>)}</ol> : <ul>{section.bullets.map((text, i) => <li key={i}><Cited text={text} codes={codes} prefix={prefix} titles={titles} /></li>)}</ul>)}
      </section>)}</div>
      {summary.sources.length > 0 && <details className="ais-sources" open><summary>{formatCount(summary.sources.length)} bukti yang dirujuk</summary><ol>{summary.sources.map(source => <li key={source.code} id={`${prefix}-${source.code}`}><span className="pc-source-code">{source.code}</span><div><span className="pu-account-line"><AccountAvatar size="xs" author={source.author} platform={source.platform} /><strong>{source.author || 'Nama tidak tersedia'}</strong>{source.comment && <PulseTag size="sm">Komentar</PulseTag>}</span><p>{source.text || 'Teks tidak tersedia'}</p></div>{safeSourceUrl(source.url) && <a href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer" aria-label={'Buka sumber ' + source.code}><PulseArrow /></a>}</li>)}</ol></details>}
      <footer className="ais-foot"><p>Dibuat {pulseDate(summary.created_at)}. Cakupan: {read.text.replace(/^Hanya/, 'hanya')}; {formatCount(summary.scope.posts)} posting dan {formatCount(summary.scope.comments)} komentar.{stale ? ` Sekarang ada ${formatCount(posts)} posting.` : ''} Tidak berubah saat periode atau platform di bilah project diganti. Dirangkai AI; periksa bukti sebelum dipakai.</p>{summary.sections.length > 0 && <PulseButton size="sm" variant="secondary" onClick={copy}><Copy />{copied ? 'Tersalin' : 'Salin untuk laporan'}</PulseButton>}<PulseButton size="sm" variant={stale ? 'reverse' : 'secondary'} busy={busy === format} busyLabel="Menyusun…" onClick={() => make(format)}><RefreshCw />Perbarui</PulseButton></footer>
    </> : <div className="ais-empty">
      <p>{formatHelp[format]} Dibuat dari seluruh {formatCount(posts)} posting tersimpan di project ini beserta komentarnya, apa pun periode dan platform yang dipilih, lengkap dengan bukti yang bisa dibuka.</p>
      {thin && <p className="ais-thin">Baru {formatCount(posts)} posting terkumpul. Summary lebih bisa diandalkan setelah pengumpulan berjalan lebih lama.</p>}
      <PulseButton variant="reverse" disabled={!state.available || !posts} busy={busy === format} busyLabel="Menyusun summary…" onClick={() => make(format)}><Sparkles />Buat summary AI</PulseButton>
      {!state.available && <small>{state.error ? 'Status layanan tidak dapat diperiksa. Muat ulang halaman.' : 'Fitur ini belum diaktifkan di instalasi Anda.'}</small>}
      {busy && <PulseLoader inline label="Membaca posting dan komentar. Biasanya kurang dari satu menit." />}
    </div>}
    {error && <p className="ais-error" role="alert">{error}</p>}
  </section>;
}

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, SendHorizontal, RotateCcw } from 'lucide-react';
import api from '../lib/api';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { PulseTag, PlatformTag } from '../components/ui/PulseTag';
import { PulsePanelEmpty } from '../components/ui/PulseAnalytics';
import { PulseArrow } from '../components/ui/PulseArrow';
import { formatCount, pulseDate, safeSourceUrl } from '../lib/pulseData';
import useProjectPeriod from './useProjectPeriod';
import useProjectPlatforms from './useProjectPlatforms';

const generalQuestions = [
  'Apa isu utama dalam 7 hari terakhir?',
  'Posting mana yang paling cepat naik, dan kapan?',
  'Platform mana yang paling ramai membahas ini?',
  'Bagaimana sentimen dalam 7 hari terakhir?',
];
const postQuestions = [
  'Kapan posting ini pertama kali viral?',
  'Seberapa besar interaksi posting ini dibanding posting lain?',
  'Kelompok percakapan mana yang memuat posting ini?',
];

/** Answer text with evidence codes ([P1]) turned into links to the matching source row. */
function Answer({ text, sources, turn }) {
  const codes = new Set(sources.map(source => source.code));
  return <div className="pc-answer-text">{text.split(/\n{2,}/).map((block, index) => <p key={index}>{block.split(/(\[[PI]\d{1,2}\])/).map((part, i) => {
    const code = part.match(/^\[(P\d{1,2})\]$/)?.[1];
    return code && codes.has(code) ? <a key={i} className="pc-cite" href={`#pc-${turn}-${code}`}>{code}</a> : part;
  })}</p>)}</div>;
}

function Sources({ sources, turn }) {
  if (!sources.length) return null;
  return <ol className="pc-sources" aria-label="Posting yang dirujuk">{sources.map(source => <li key={source.code} id={`pc-${turn}-${source.code}`}>
    <span className="pc-source-code">{source.code}</span>
    <div className="pc-source-body">
      <strong>{source.author || 'Nama sumber tidak tersedia'}</strong>
      <p>{source.text || 'Teks tidak tersedia'}</p>
      <span className="pc-source-meta"><PlatformTag size="sm" platform={source.platform} />{source.published_at ? pulseDate(source.published_at) : 'Tanggal tidak tersedia'}{source.interactions != null && <> · {formatCount(source.interactions)} interaksi</>}</span>
    </div>
    {safeSourceUrl(source.url) && <a className="pc-source-link" href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer" aria-label={`Buka posting ${source.author || source.code}`}><PulseArrow /></a>}
  </li>)}</ol>;
}

export default function ProjectChat() {
  const [params] = useSearchParams();
  const topicId = params.get('topic') || '', postId = params.get('post') || '';
  const [period] = useProjectPeriod(topicId);
  const [platforms] = useProjectPlatforms(topicId);
  const [status, setStatus] = useState(null);
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null);
  useEffect(() => {
    let active = true;
    api.get('/admin/pulse/chat/status').then(data => { if (active) setStatus(data); }).catch(() => { if (active) setStatus({ configured: false, error: true }); });
    return () => { active = false; };
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [turns.length, busy]);
  // Let the assistant read this project's data while the analyst is still typing the first question.
  const platformKey = platforms === null ? 'all' : platforms.join(',');
  useEffect(() => {
    if (!topicId || !status?.configured) return;
    const body = { topic_id: topicId };
    if (period.from) body.from = period.from;
    if (period.to) body.to = period.to;
    if (platformKey !== 'all') body.platforms = platformKey.split(',').filter(Boolean);
    if (postId) body.post_id = postId;
    api.post('/admin/pulse/chat/prepare', body).catch(() => {});
  }, [topicId, postId, period.from, period.to, platformKey, status?.configured]);

  async function ask(question) {
    const text = question.trim();
    if (!text || busy || !topicId) return;
    const history = turns.flatMap(turn => [{ role: 'user', content: turn.question }, { role: 'assistant', content: turn.answer }]).slice(-12);
    setBusy(true); setError(''); setDraft('');
    try {
      const body = { topic_id: topicId, question: text, history };
      if (period.from) body.from = period.from;
      if (period.to) body.to = period.to;
      if (platforms !== null) body.platforms = platforms;
      if (postId) body.post_id = postId;
      const data = await api.post('/admin/pulse/chat', body);
      setTurns(list => [...list, { question: text, ...data }]);
    } catch (err) {
      setDraft(text);
      setError(err.status === 503 ? 'Tanya AI belum tersedia di instalasi ini.' : err.status === 502 ? 'Jawaban tidak berhasil disusun. Coba kirim lagi.' : err.status ? (err.message || 'Pertanyaan tidak dapat diproses.') : 'Tidak dapat terhubung ke server PULSE.');
    } finally { setBusy(false); }
  }

  if (!topicId) return <section className="pc-chat"><PulsePanelEmpty title="Pilih project terlebih dahulu">Tanya AI menjawab dari posting tersimpan satu project. Pilih project di bagian atas halaman.</PulsePanelEmpty></section>;
  const ready = status?.configured;
  const scopeText = `${period.from || period.to ? `${period.from || 'awal data'} – ${period.to || 'akhir data'}` : 'seluruh periode'} · ${platforms === null ? 'semua platform' : `${platforms.length} platform`}`;
  const overview = new URLSearchParams(params); overview.delete('post');
  return <section className="pc-chat" aria-label="Tanya AI tentang project">
    <header className="pc-head">
      <div><h2><Sparkles size={20} aria-hidden="true" />Tanya AI</h2><p>Jawaban disusun dari posting, riwayat metrik, dan kelompok percakapan yang tersimpan di project ini. Cakupan: {scopeText}.</p></div>
      <div className="pc-head-meta">{turns.length > 0 && <PulseButton variant="quiet" onClick={() => { setTurns([]); setError(''); }}><RotateCcw size={16} />Percakapan baru</PulseButton>}</div>
    </header>
    {postId && <PulseNotice>Pertanyaan difokuskan pada satu posting pilihan. <Link to={'/pulse/chat?' + overview}>Tanya tentang seluruh project</Link></PulseNotice>}
    {status && !ready && <PulsePanelEmpty title="Tanya AI belum tersedia">{status.error ? 'Status layanan tidak dapat diperiksa. Muat ulang halaman.' : 'Fitur ini belum diaktifkan di instalasi Anda. Hubungi administrator organisasi.'}</PulsePanelEmpty>}
    <div className="pc-thread" aria-live="polite">
      {!turns.length && ready && <div className="pc-starters"><p>Coba salah satu pertanyaan ini</p><div className="pu-tag-group">{(postId ? postQuestions : generalQuestions).map(question => <PulseTag key={question} size="lg" variant="outline" onClick={() => ask(question)}>{question}</PulseTag>)}</div></div>}
      {turns.map((turn, index) => <article className="pc-turn" key={index}>
        <p className="pc-question"><span className="pu-sr">Pertanyaan: </span>{turn.question}</p>
        <div className="pc-answer">
          <Answer text={turn.answer} sources={turn.sources || []} turn={index} />
          <Sources sources={turn.sources || []} turn={index} />
          <p className="pc-answer-meta">Dari {formatCount(turn.scope?.posts)} posting tersimpan{turn.scope?.truncated ? ' (dibatasi 3.000 posting terbaru)' : ''} · {pulseDate(turn.answered_at)}</p>
        </div>
      </article>)}
      {busy && <p className="pc-pending" role="status">Menyusun jawaban dari data tersimpan…</p>}
      <span ref={end} />
    </div>
    <form className="pc-composer" onSubmit={event => { event.preventDefault(); ask(draft); }}>
      <label htmlFor="pc-question">Pertanyaan Anda</label>
      <div className="pc-composer-row">
        <textarea id="pc-question" rows={2} maxLength={600} value={draft} disabled={!ready || busy} placeholder={postId ? 'Contoh: kapan posting ini pertama kali viral?' : 'Contoh: apa isu utama dalam 7 hari terakhir?'}
          onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask(draft); } }} aria-describedby="pc-note" />
        <PulseButton type="submit" variant="primary" disabled={!ready || draft.trim().length < 2} busy={busy} busyLabel="Menjawab…"><SendHorizontal size={16} />Kirim</PulseButton>
      </div>
      {error && <p className="pc-error" role="alert">{error}</p>}
      <p id="pc-note" className="pc-note">Enter untuk mengirim, Shift+Enter untuk baris baru. Jawaban dirangkai AI dari data tersimpan; periksa posting yang dirujuk sebelum dipakai. Waktu lonjakan adalah waktu pengamatan crawler, bukan waktu pasti kejadian. Percakapan ini tidak disimpan.</p>
    </form>
  </section>;
}

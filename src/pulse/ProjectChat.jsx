import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { SendHorizontal, Plus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { PulseTag } from '../components/ui/PulseTag';
import { PulsePanelEmpty } from '../components/ui/PulseAnalytics';
import { PulseArrow } from '../components/ui/PulseArrow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/shadcn/dialog';
import { formatCount, pulseDate, pulseDay } from '../lib/pulseData';
import { askBody, conversationName, deleteName, historyFailed, historyLoaded, historyLoading, historyNote, rowMeta, threadView, turnFrom, withAnswered, withoutConversation } from '../lib/pulseChatHistory';
import useProjectPeriod from './useProjectPeriod';
import { pageMeta } from './pageMeta';
import { PulsePageHead } from '../components/ui/PulsePatterns';
import { PulseLoader } from '../components/ui/PulseLoader';
import useProjectPlatforms from './useProjectPlatforms';
import ChatAnswer from './ChatAnswer';
import './ds/chat-history.css';

const generalQuestions = [
  'Apa isu utama dalam cakupan ini?',
  'Posting mana yang paling cepat naik, dan kapan?',
  'Platform mana yang paling ramai membahas ini?',
  'Bagaimana sentimen dalam cakupan ini?',
];
const postQuestions = [
  'Kapan posting ini pertama kali viral?',
  'Seberapa besar interaksi posting ini dibanding posting lain?',
  'Kelompok percakapan mana yang memuat posting ini?',
];
const conversationPath = id => '/admin/pulse/chat/conversations/' + encodeURIComponent(id);
const noThread = { id: '', turns: [], full: false };

/** The stored conversations of this project, for the person signed in: pick one, start a new one, delete one.
 * `open` is the conversation the address names. Deleting asks first, in the app's dialog, and reports back through `onRemoved`. */
function ChatHistory({ history, open, linkTo, onNew, onRetry, onRemoved, shell }) {
  const titleId = useId();
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const opener = useRef(null), newButton = useRef(null);
  const note = historyNote(history);

  async function remove() {
    if (!target || deleting) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(conversationPath(target.id));
    } catch (error) {
      // Already gone (deleted from another tab) is the outcome that was asked for.
      if (error.status !== 404) { setDeleteError('Percakapan belum berhasil dihapus. Coba lagi.'); setDeleting(false); return; }
    }
    onRemoved(target.id);
    setDeleting(false); setTarget(null);
  }

  return <Card className="pch-panel" role="region" aria-labelledby={titleId}>
    <CardHeader className="pch-head">
      <div className="pch-heading">
        <CardTitle id={titleId} className="pch-title">Riwayat percakapan</CardTitle>
        <CardDescription className="pch-about">Tersimpan untuk akun Anda di project ini.</CardDescription>
      </div>
      <PulseButton ref={newButton} onClick={onNew}><Plus aria-hidden="true" />Percakapan baru</PulseButton>
    </CardHeader>
    <CardContent className="pch-body">
      {history.state === 'loading' && !history.rows.length && <div className="pch-skeleton" role="status" aria-busy="true"><span className="pu-sr">Memuat riwayat percakapan…</span>
        {[62, 78, 54].map(width => <div key={width} aria-hidden="true"><i style={{ width: `${width}%` }} /><i style={{ width: '44%' }} /></div>)}</div>}
      {history.state === 'error' && <div className="pch-state" role="status"><p>Riwayat tidak dapat dimuat. Anda tetap dapat bertanya.</p><PulseButton size="sm" onClick={onRetry}>Coba lagi</PulseButton></div>}
      {history.state === 'ready' && !history.rows.length && <div className="pch-state"><p>Belum ada percakapan tersimpan untuk project ini.</p></div>}
      {history.rows.length > 0 && <ul className="pch-list">{history.rows.map(row => <li key={row.id}>
        <Link className="pch-item" to={linkTo(row.id)} aria-current={row.id === open ? 'true' : undefined}>
          <span className="pch-item-title">{conversationName(row)}</span>
          <span className="pch-item-meta">{rowMeta(row)}</span>
        </Link>
        <PulseButton className="pch-remove" variant="quiet" size="sm" iconOnly aria-label={deleteName(row)} onClick={event => { opener.current = event.currentTarget; setDeleteError(''); setTarget(row); }}><Trash2 aria-hidden="true" /></PulseButton>
      </li>)}</ul>}
      {note && <p className="pch-cut">{note}</p>}
    </CardContent>
    <Dialog open={Boolean(target)} onOpenChange={next => { if (!next && !deleting) setTarget(null); }}>
      {target && <DialogContent container={shell} className="pch-dialog" onCloseAutoFocus={event => {
        // The row may be gone by now: focus goes back to its delete control, or to a control that still exists.
        event.preventDefault();
        (opener.current?.isConnected ? opener.current : newButton.current)?.focus();
      }}>
        <DialogHeader className="pch-dialog-head">
          <DialogTitle>Hapus percakapan ini?</DialogTitle>
          <DialogDescription className="pch-dialog-text"><strong>{conversationName(target)}</strong> dihapus dari riwayat akun Anda beserta semua jawabannya dan tidak bisa dikembalikan.</DialogDescription>
        </DialogHeader>
        {deleteError && <p className="pch-dialog-error" role="alert">{deleteError}</p>}
        <DialogFooter>
          <PulseButton variant="quiet" disabled={deleting} onClick={() => setTarget(null)}>Batal</PulseButton>
          <PulseButton variant="reverse" busy={deleting} busyLabel="Menghapus…" onClick={remove}>Hapus percakapan</PulseButton>
        </DialogFooter>
      </DialogContent>}
    </Dialog>
  </Card>;
}

/** One project's Tanya AI. The address names the open conversation (`?c=`); an address without it is a new conversation. */
function Chat({ topicId }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const postId = params.get('post') || '', named = params.get('c') || '';
  const [period] = useProjectPeriod(topicId);
  const [platforms] = useProjectPlatforms(topicId);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState(historyLoading);
  const [historyTry, setHistoryTry] = useState(0);
  const [thread, setThread] = useState(noThread);          // the conversation held in memory; id '' until it is stored
  const [failure, setFailure] = useState(null);            // { id, kind: 'missing' | 'failed' } of the last one that would not open
  const [adopted, setAdopted] = useState(null);            // { key, id }: this history entry is on `id` until the address says so
  const [pending, setPending] = useState(null);            // { in }: a question is with the AI, asked in that conversation
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [spoken, setSpoken] = useState(false);             // read new answers aloud, never a whole stored conversation
  const [shell, setShell] = useState(null);
  const end = useRef(null), last = useRef(null), mark = useRef(null), input = useRef(null), wantFocus = useRef(false), now = useRef({ open: '', key: '' });
  const page = useCallback(node => setShell(node?.closest('.pulse-standalone') || null), []);

  const open = adopted && adopted.key === location.key ? adopted.id : named;
  const view = threadView({ open, thread, failure });
  const waitingHere = Boolean(pending) && pending.in === open;

  useEffect(() => {
    let active = true;
    api.get('/admin/pulse/chat/status').then(data => { if (active) setStatus(data); }).catch(() => { if (active) setStatus({ configured: false, error: true }); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    api.get('/admin/pulse/chat/conversations', { topic_id: topicId }).then(data => { if (active) setHistory(historyLoaded(data)); }).catch(() => { if (active) setHistory(current => ({ ...historyFailed, rows: current.rows, total: current.total })); });
    return () => { active = false; };
  }, [topicId, historyTry]);
  // Open the conversation the address names, unless it is the one in memory or already known not to open.
  useEffect(() => {
    if (!open || open === thread.id || failure?.id === open) return undefined;
    let active = true;
    api.get(conversationPath(open), { topic_id: topicId })
      .then(data => { if (active) { setSpoken(false); setFailure(null); setThread({ id: open, turns: Array.isArray(data.turns) ? data.turns : [], full: Boolean(data.full) }); } })
      .catch(err => { if (active) setFailure({ id: open, kind: err.status === 404 ? 'missing' : 'failed' }); });
    return () => { active = false; };
  }, [open, thread.id, failure, topicId]);
  useEffect(() => {
    now.current = { open, key: location.key };
    if (wantFocus.current && input.current && !input.current.disabled) { wantFocus.current = false; input.current.focus(); }
  });
  // Follow the conversation: the line that says it is opening or could not be opened, the wait for an answer, or its newest
  // question with the answer. The whole last turn, so it is also in view when the reader comes from the history below it.
  useEffect(() => {
    const target = view.state !== 'ready' ? mark.current : waitingHere ? end.current : last.current;
    target?.scrollIntoView({ block: 'nearest' });
  }, [view.state, view.turns.length, waitingHere]);
  // Let the assistant read this project's data while the analyst is still typing the first question.
  const platformKey = platforms === null ? 'all' : platforms.join(',');
  useEffect(() => {
    if (!status?.configured) return;
    const body = { topic_id: topicId };
    if (period.from) body.from = period.from;
    if (period.to) body.to = period.to;
    if (platformKey !== 'all') body.platforms = platformKey.split(',').filter(Boolean);
    if (postId) body.post_id = postId;
    api.post('/admin/pulse/chat/prepare', body).catch(() => {});
  }, [topicId, postId, period.from, period.to, platformKey, status?.configured]);

  function address(change, options) {
    setParams(current => { const next = new URLSearchParams(current); change(next); return next; }, options);
  }
  function linkTo(id) {
    const next = new URLSearchParams(params);
    next.set('c', id);
    return { search: '?' + next };
  }
  /** An empty conversation. The draft stays: a question that was refused can be sent again from here. */
  function startNew({ replace = false } = {}) {
    setError('');
    if (!thread.id) setThread(noThread);
    if (named) address(next => next.delete('c'), { replace });
    wantFocus.current = true;
  }
  function removed(id) {
    setHistory(current => withoutConversation(current, id));
    if (thread.id === id) setThread(noThread);
    if (open !== id) return;
    // The address still names it for a moment: this entry is a new conversation from now on.
    setAdopted({ key: location.key, id: '' });
    address(next => next.delete('c'), { replace: true });
  }

  async function ask(question) {
    const text = question.trim();
    if (!text || pending || view.state === 'opening' || view.full) return;
    const askedIn = open;
    setPending({ in: askedIn }); setError(''); setDraft(''); setSpoken(true);
    try {
      // A conversation that is not on screen (it would not open) is not continued: the question starts a new one.
      const data = await api.post('/admin/pulse/chat', askBody({ topicId, question: text, turns: view.turns, conversationId: view.state === 'ready' ? open : '', period, platforms, postId }));
      setHistory(current => withAnswered(current, data.conversation));
      // The reader moved to another conversation while waiting: the answer is kept in its own, and its row says so.
      if (now.current.open !== askedIn) return;
      const id = data.conversation_id || '';
      setThread(current => ({ id: id || askedIn, turns: [...(current.id === askedIn ? current.turns : []), turnFrom(text, data)], full: Boolean(data.conversation?.full) }));
      if (id && id !== askedIn) {
        setAdopted({ key: now.current.key, id });
        address(next => next.set('c', id), { replace: true });
      }
    } catch (err) {
      setDraft(text);
      setError(err.status === 503 ? 'Tanya AI belum tersedia di instalasi ini.' : err.status === 502 ? 'Jawaban tidak berhasil disusun. Coba kirim lagi.' : err.status ? (err.message || 'Pertanyaan tidak dapat diproses.') : 'Tidak dapat terhubung ke server PULSE.');
    } finally { setPending(null); }
  }

  const ready = status?.configured;
  const scopeText = `${period.from || period.to ? `${pulseDay(period.from) || 'awal data'} – ${pulseDay(period.to) || 'akhir data'}` : 'seluruh periode'} · ${platforms === null ? 'semua platform' : `${platforms.length} platform`}`;
  const overview = new URLSearchParams(params); overview.delete('post');
  const closed = !ready || Boolean(pending) || view.state === 'opening' || view.full;
  return <section ref={page} className="pc-chat pch-page" aria-label="Tanya AI tentang project">
    <PulsePageHead icon={pageMeta.chat.icon} title={pageMeta.chat.title} tagline={<>{pageMeta.chat.tagline} · {scopeText}</>} guide={pageMeta.chat.guide} />
    {postId && <PulseNotice>Pertanyaan difokuskan pada satu posting pilihan. <Link to={'/pulse/chat?' + overview}>Tanya tentang seluruh project</Link></PulseNotice>}
    {status && !ready && <PulsePanelEmpty title="Tanya AI belum tersedia">{status.error ? 'Status layanan tidak dapat diperiksa. Muat ulang halaman.' : 'Fitur ini belum diaktifkan di instalasi Anda. Hubungi administrator organisasi.'}</PulsePanelEmpty>}
    <div className="pch-layout">
      <div className="pch-main">
        {view.state === 'missing' && <div ref={mark}><PulseNotice tone="warning" role="alert"><span>Percakapan ini tidak ditemukan. Mungkin sudah dihapus.</span><PulseButton size="sm" onClick={() => startNew({ replace: true })}>Mulai percakapan baru</PulseButton></PulseNotice></div>}
        {view.state === 'failed' && <div ref={mark}><PulseNotice tone="warning" role="alert"><span>Percakapan ini tidak dapat dibuka. Periksa koneksi lalu coba lagi.</span><PulseButton size="sm" onClick={() => setFailure(null)}>Coba lagi</PulseButton></PulseNotice></div>}
        <div className="pc-thread" aria-live={spoken ? 'polite' : 'off'}>
          {view.state === 'opening' && <div className="pc-pending" ref={mark}><PulseLoader inline label="Membuka percakapan…" /></div>}
          {view.state === 'ready' && !view.turns.length && !waitingHere && ready && <div className="pc-starters"><p>Coba salah satu pertanyaan ini</p><div className="pu-tag-group">{(postId ? postQuestions : generalQuestions).map(question => <PulseTag key={question} size="lg" variant="outline" onClick={() => ask(question)}>{question}</PulseTag>)}</div></div>}
          {view.turns.map((turn, index) => <article className="pc-turn" key={index} ref={index === view.turns.length - 1 ? last : undefined}>
            <p className="pc-question"><span className="pu-sr">Pertanyaan: </span>{turn.question}</p>
            <div className="pc-answer">
              <ChatAnswer turn={turn} index={index} />
              <p className="pc-answer-meta">Dari {formatCount(turn.scope?.posts)} posting tersimpan{turn.scope?.truncated ? ' (dibatasi 3.000 posting terbaru)' : ''} · {pulseDate(turn.answered_at)}</p>
              {turn.unsaved && <p className="pc-answer-meta pch-unsaved">Jawaban ini tidak tersimpan di riwayat.</p>}
            </div>
          </article>)}
          {waitingHere && <div className="pc-pending"><PulseLoader inline label="Menyusun jawaban dari data tersimpan…" /></div>}
          <span ref={end} />
        </div>
        {view.full && <PulseNotice role="status"><span>Percakapan ini sudah penuh. Mulai percakapan baru untuk bertanya lagi.</span><PulseButton size="sm" onClick={() => startNew()}>Percakapan baru</PulseButton></PulseNotice>}
        <form className="pc-composer" onSubmit={event => { event.preventDefault(); ask(draft); }}>
          <label htmlFor="pc-question">Pertanyaan Anda</label>
          <div className="pc-composer-row">
            <textarea ref={input} id="pc-question" rows={2} maxLength={600} value={draft} disabled={closed} placeholder={postId ? 'Contoh: kapan posting ini pertama kali viral?' : 'Contoh: apa isu utama dalam cakupan ini?'}
              onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask(draft); } }} aria-describedby="pc-note" />
            <PulseButton type="submit" variant="primary" disabled={closed || draft.trim().length < 2} busy={Boolean(pending)} busyLabel="Menjawab…"><SendHorizontal size={16} />Kirim</PulseButton>
          </div>
          {error && <p className="pc-error" role="alert">{error}</p>}
          <p id="pc-note" className="pc-note">Enter untuk mengirim, Shift+Enter untuk baris baru. Jawaban dirangkai AI dari data tersimpan; periksa posting yang dirujuk sebelum dipakai. Waktu lonjakan adalah waktu pengamatan crawler, bukan waktu pasti kejadian. Percakapan tersimpan untuk akun Anda dan dapat dihapus dari riwayat.</p>
        </form>
      </div>
      <ChatHistory history={history} open={open} linkTo={linkTo} shell={shell} onNew={() => startNew()} onRemoved={removed}
        onRetry={() => { setHistory(current => ({ ...current, state: 'loading' })); setHistoryTry(count => count + 1); }} />
    </div>
  </section>;
}

export default function ProjectChat() {
  const [params] = useSearchParams();
  const topicId = params.get('topic') || '';
  if (!topicId) return <section className="pc-chat"><PulsePanelEmpty title="Pilih project terlebih dahulu">Tanya AI menjawab dari posting tersimpan satu project. Pilih project di bagian atas halaman.</PulsePanelEmpty></section>;
  // A project change starts over: no conversation, list or draft of the other project stays in memory.
  return <Chat key={topicId} topicId={topicId} />;
}

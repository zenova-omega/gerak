// Laporan: a paged report with a live preview. The preview is the document: "Unduh PDF" sends the very pages on
// screen to the server's PDF renderer, and "Cetak" prints them. Nothing has to be frozen first.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Download, LoaderCircle, Printer } from 'lucide-react';
import api from '../lib/api';
import { buildReport, reportArchive } from '../lib/pulseReport';
import { recounted } from '../lib/pulseArchive';
import { pulseDate } from '../lib/pulseData';
import { aiStatus, reportData, reportPages, reportSettings, settingsPayload, storedSummary } from '../lib/pulseReportPages';
import * as summaryStore from './summaryStore';
import { PulseButton } from '../components/ui/PulseUI';
import useResponseAnalysis from './useResponseAnalysis';
import usePreviousPosts from './usePreviousPosts';
import useTrendSpikes from './useTrendSpikes';
import { overviewEvidence, previousPeriod } from '../lib/pulseOverview';
import { projectKpis } from '../lib/pulseKpis';
import ReportArchive from './ReportArchive';
import ReportPages from './ReportPages';
import ReportBuilder from './ReportBuilder';
import ProjectPeriod from './ProjectPeriod';
import { rangeText } from './projectPeriodPresets';
import { downloadReportPdf, reportFileName } from './reportPdf';
import './project-report.css';
import './report-brand.css';
import './ds/report-pages.css';

const settingsPath = '/admin/pulse/reports/settings';
const summaryPath = topicId => '/admin/pulse/topics/' + encodeURIComponent(topicId) + '/summary';
const nothingSaved = reportSettings(null);
/** An A4 sheet is 210mm wide; at 96 CSS pixels to the inch that is this many pixels. */
const sheetWidth = 210 * 96 / 25.4;

/** The saved sections and brand of one project. A failed read is "nothing saved yet". Every change shows at once
 * and is saved a moment after the last one; saves go out one after another so an older one never lands last. */
function useReportSettings(topicId) {
  const [state, setState] = useState({ topicId: null });
  const [save, setSave] = useState({ revision: 0, status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const unsent = useRef(null), queue = useRef(Promise.resolve());
  const current = state.topicId === topicId ? state : { topicId, ...nothingSaved, loaded: !topicId, revision: 0 };
  const { sections, brand, ai, revision } = current;

  useEffect(() => {
    // A change to the previous project that was still waiting goes out before this one is read.
    const waiting = unsent.current;
    if (waiting) { unsent.current = null; queue.current = queue.current.then(() => api.put(waiting.path, waiting.body)).catch(() => {}); }
    if (!topicId) return;
    let active = true;
    const done = saved => { if (active) setState({ topicId, ...reportSettings(saved), loaded: true, revision: 0 }); };
    api.get(settingsPath, { topic_id: topicId }).then(done, () => done(null));
    return () => { active = false; };
  }, [topicId]);

  useEffect(() => {
    if (!topicId || !revision) return;
    const path = `${settingsPath}?topic_id=${encodeURIComponent(topicId)}`, body = settingsPayload({ sections, brand, ai });
    unsent.current = { path, body };
    const timer = setTimeout(() => {
      unsent.current = null;
      setSave({ revision, status: 'saving' });
      queue.current = queue.current.then(() => api.put(path, body)).then(() => setSave({ revision, status: 'saved' }), () => setSave({ revision, status: 'error' }));
    }, 900);
    return () => clearTimeout(timer);
  }, [topicId, revision, attempt, sections, brand, ai]);

  // Leaving the page within that moment still saves the last change.
  useEffect(() => () => {
    const waiting = unsent.current;
    if (waiting) api.put(waiting.path, waiting.body).catch(() => {});
  }, []);

  const change = patch => setState(previous => {
    const base = previous.topicId === topicId ? previous : { topicId, ...nothingSaved, loaded: true, revision: 0 };
    return { ...base, ...patch(base), revision: base.revision + 1 };
  });
  return {
    sections, brand, ai,
    status: !current.loaded ? 'loading' : !revision ? 'idle' : save.revision !== revision ? 'pending' : save.status,
    setSections: next => change(() => ({ sections: next })),
    setBrand: patch => change(base => ({ brand: { ...base.brand, ...patch } })),
    setSummaryChoice: summary => change(() => ({ ai: { summary } })),
    retry: () => setAttempt(value => value + 1),
  };
}

/** The written texts stored for the project (GET …/summary: the summary card's formats and AI Insights), and a way to
 * keep one that was just written. Reading never asks for a new text; null while they load. */
function useStoredTexts(topicId) {
  const [state, setState] = useState({ topicId: null, payload: null });
  useEffect(() => {
    if (!topicId) return;
    let active = true;
    api.get(summaryPath(topicId))
      .then(payload => { if (active) setState({ topicId, payload }); })
      .catch(() => { if (active) setState({ topicId, payload: { failed: true, summaries: {} } }); });
    return () => { active = false; };
  }, [topicId]);
  const keep = useCallback((id, format, made) => setState(previous => (previous.topicId === id
    ? { topicId: id, payload: { ...previous.payload, summaries: { ...(previous.payload?.summaries || {}), [format]: made } } } : previous)), []);
  return [state.topicId === topicId ? state.payload : null, keep];
}

/** How much smaller than life the sheets are painted so that one fits the width of the preview column. */
function usePreviewScale() {
  const frame = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    if (!frame.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, Math.max(0.2, Math.floor(entry.contentRect.width / sheetWidth * 1000) / 1000))));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  return [frame, scale];
}

/** What an opened archive is, above its pages. It is rebuilt with the calculation rules in force today, so one line
 * says so when it was filed under older ones, or before rule versions were recorded. */
export function ArchivedContext({ archive, onBack }) {
  return <p className="pr-archived-context" data-screen-only="" role="status">
    <span>Arsip <strong>{archive.title}</strong>, disimpan {pulseDate(archive.created_at)}.{recounted(archive.snapshot) && <span className="pr-archived-rules"> Dihitung ulang dengan aturan terbaru.</span>}</span>
    <PulseButton size="sm" onClick={onBack}>Kembali ke data terkini</PulseButton>
  </p>;
}

export default function ProjectReport(props) {
  const topicId = props.topic?.id;
  const responseState = useResponseAnalysis(topicId);
  const settings = useReportSettings(topicId);
  const [texts, keepText] = useStoredTexts(topicId);
  // A change of project, period or platforms starts over from live data: an opened archive belongs to its own scope.
  const scopeKey = JSON.stringify([topicId, props.period?.from, props.period?.to, props.selectedPlatforms == null ? null : [...props.selectedPlatforms].sort()]);
  return <ReportWorkspace key={scopeKey} {...props} responseState={responseState} settings={settings} texts={texts} keepText={keepText} />;
}

function ReportWorkspace({ data, topic, period, selectedPlatforms = null, responseState, settings, texts, keepText }) {
  const [opened, setOpened] = useState(null);
  const [pdf, setPdf] = useState({ status: 'idle', text: '' });
  const [downloadError, setDownloadError] = useState('');
  const root = useRef(null);
  const [frame, scale] = usePreviewScale();
  const live = useMemo(() => buildReport(data, topic, period, undefined, selectedPlatforms, responseState), [data, topic, period, selectedPlatforms, responseState]);
  const report = opened?.report || live;
  const facts = useMemo(() => reportData(report), [report]);
  // The six figures of Ikhtisar, counted by the same function. The period before is loaded the way a page loads a period;
  // an opened archive keeps none, and its figures say so.
  const before = previousPeriod(report.period);
  const previous = usePreviousPosts(topic.id, before?.from || '', before?.to || '', !opened && Boolean(before));
  const kpis = useMemo(() => projectKpis(
    overviewEvidence(report.posts, { platforms: report.selectedPlatforms, previousPosts: opened ? null : previous.posts }),
    { period: report.period, comparisonError: previous.status === 'error', archived: Boolean(opened) },
  ), [report, opened, previous.posts, previous.status]);
  // The spikes of the series the trend page draws, asked of the server like the trend chart on Ikhtisar asks (spike_v1).
  const spikes = useTrendSpikes(facts.trend.rows);
  const pages = useMemo(() => reportPages(settings.sections, { topPosts: report.topPosts }), [settings.sections, report]);
  // The written texts: the stored summary the settings choose, and AI Insights. An archive is printed without them, since
  // a stored text may be newer than the archive. Only a button in the builder asks for a new one.
  const [aiBusy, setAiBusy] = useState(''), [aiError, setAiError] = useState('');
  const aiChoice = settings.ai?.summary ?? null;
  const ai = aiStatus(texts, { choice: aiChoice, report, archived: Boolean(opened) });
  const summary = opened ? null : storedSummary(texts, aiChoice);
  const insights = opened ? null : texts?.summaries?.insights || null;
  async function writeText(kind) {
    if (aiBusy || !topic?.id) return;
    const format = kind === 'summary' ? ai.summary.format : 'insights';
    if (!format) return;
    setAiBusy(kind); setAiError('');
    try {
      let made;
      if (kind === 'summary') made = await summaryStore.write(topic.id, format, () => api.post(summaryPath(topic.id), { format }));
      else {
        // AI Insights for the report's own period and platforms, as the AI Insights page asks for the project bar's.
        const body = { format };
        if (report.period?.from) body.from = report.period.from;
        if (report.period?.to) body.to = report.period.to;
        if (report.selectedPlatforms !== null) body.platforms = report.selectedPlatforms;
        made = await api.post(summaryPath(topic.id), body);
      }
      keepText(topic.id, format, made);
    } catch (failure) {
      setAiError(failure?.status === 503 ? 'AI belum tersedia di instalasi ini.'
        : failure?.status === 409 ? 'Belum ada posting pada cakupan ini untuk ditulis.'
        : failure?.status ? 'Teks belum berhasil ditulis. Coba lagi.' : 'Tidak dapat terhubung ke server PULSE.');
    } finally { setAiBusy(''); }
  }
  const analysisReady = Boolean(responseState.loaded) && !responseState.error;
  const busy = pdf.status === 'busy';
  // The dates the pages on screen cover: the archive's own when one is open, else the project's period.
  const chosen = report.period?.from || report.period?.to, covered = chosen ? rangeText({ from: report.period.from || '', to: report.period.to || '' }) : 'seluruh periode tersimpan';

  async function downloadPdf() {
    if (busy || !root.current) return;
    setPdf({ status: 'busy', text: 'Menyiapkan PDF…' });
    try {
      const made = await downloadReportPdf(root.current, reportFileName(report.topic.label, undefined, report.period), `Laporan ${report.topic.label}`);
      setPdf({ status: 'done', text: `PDF tersimpan sebagai ${made.filename}${made.pages ? `, ${made.pages} halaman` : ''}.` });
    } catch (error) {
      if (error?.status === 503) {
        setPdf({ status: 'print', text: 'PDF server belum tersedia; dialog cetak dibuka.' });
        setTimeout(() => window.print(), 150);   // after the line above is on screen: the dialog blocks the page
      } else setPdf({ status: 'error', text: 'PDF belum berhasil dibuat. Coba lagi atau tekan Cetak.' });
    }
  }
  function downloadJson() {
    let url;
    try {
      url = URL.createObjectURL(new Blob([reportArchive(report)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `pulse-report-${report.generatedAt.replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setDownloadError('');
    } catch { setDownloadError('Unduhan belum berhasil.'); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  return <div className="pr-workspace">
    {/* Only while the report is open: its sheets fill the paper, so the paper has no margin of its own. */}
    <style>{'@page{size:A4;margin:0}'}</style>
    <div className="pr-bar" data-screen-only="" role="group" aria-label="Tindakan laporan">
      <p className="pr-bar-text" role="status" data-state={pdf.status}>{pdf.text || (pages.length ? <>{pages.length} halaman A4 · <strong>{covered}</strong></> : 'Tidak ada halaman.')}</p>
      <div className="pr-actions">
        {/* Stays focusable while it works, so the keyboard is not dropped; a second press does nothing. */}
        <PulseButton variant="primary" aria-disabled={busy || undefined} disabled={!pages.length} onClick={downloadPdf}>{busy
          ? <><LoaderCircle className="pu-spinner" aria-hidden="true" />Menyiapkan PDF…</>
          : <><Download aria-hidden="true" />Unduh PDF</>}</PulseButton>
        <PulseButton disabled={!pages.length || busy} onClick={() => window.print()}><Printer aria-hidden="true" />Cetak</PulseButton>
      </div>
    </div>
    {/* The same period as every other page of the project: changing it here changes it there, and the pages below
        are rebuilt for it at once. */}
    <div className="ps-scope pr-period" data-screen-only=""><ProjectPeriod key={topic.id} topicId={topic.id} /></div>
    <details className="pr-more" data-screen-only="">
      <summary>Arsip dan data mentah</summary>
      <div className="pr-more-body">
        <div className="pr-raw"><PulseButton onClick={downloadJson}>Unduh JSON</PulseButton></div>
        {downloadError && <p className="pr-error" role="alert">{downloadError}</p>}
        <ReportArchive topicId={topic.id} report={opened?.report || (analysisReady ? live : null)} onOpen={(value, archive) => { setOpened({ report: value, archive }); setPdf({ status: 'idle', text: '' }); }} />
      </div>
    </details>
    {opened && <ArchivedContext archive={opened.archive} onBack={() => setOpened(null)} />}
    <div className="pr-layout">
      <ReportBuilder sections={settings.sections} brand={settings.brand} pages={pages} status={settings.status} onSections={settings.setSections} onBrand={settings.setBrand} onRetry={settings.retry}
        ai={{ choice: aiChoice, status: ai, busy: aiBusy, error: aiError, onChoice: settings.setSummaryChoice, onWrite: writeText }} />
      <section className="pr-preview" ref={frame} style={{ '--rp-scale': scale }} aria-label="Pratinjau laporan">
        {pages.length
          // An archive is printed with sentences worked out from its own figures: a stored summary may be newer than it.
          ? <ReportPages rootRef={root} report={report} pages={pages} data={facts} kpis={kpis} spikes={spikes} summary={summary} insights={insights} archived={Boolean(opened)} brand={settings.brand} />
          : <p className="pr-none" data-screen-only="">Semua bagian dimatikan.</p>}
      </section>
    </div>
  </div>;
}

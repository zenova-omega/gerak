// Laporan: a paged report with a live preview. The preview is the document: "Unduh PDF" sends the very pages on
// screen to the server's PDF renderer, and "Cetak" prints them. Nothing has to be frozen first.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Download, LoaderCircle, Printer } from 'lucide-react';
import api from '../lib/api';
import { buildReport, reportArchive } from '../lib/pulseReport';
import { pulseDate } from '../lib/pulseData';
import { reportData, reportPages, reportSettings, settingsPayload, storedSummary } from '../lib/pulseReportPages';
import { PulseButton } from '../components/ui/PulseUI';
import useResponseAnalysis from './useResponseAnalysis';
import ReportArchive from './ReportArchive';
import ReportPages from './ReportPages';
import ReportBuilder from './ReportBuilder';
import { downloadReportPdf, reportFileName } from './reportPdf';
import './project-report.css';
import './report-brand.css';
import './ds/report-pages.css';

const settingsPath = '/admin/pulse/reports/settings';
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
  const { sections, brand, revision } = current;

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
    const path = `${settingsPath}?topic_id=${encodeURIComponent(topicId)}`, body = settingsPayload({ sections, brand });
    unsent.current = { path, body };
    const timer = setTimeout(() => {
      unsent.current = null;
      setSave({ revision, status: 'saving' });
      queue.current = queue.current.then(() => api.put(path, body)).then(() => setSave({ revision, status: 'saved' }), () => setSave({ revision, status: 'error' }));
    }, 900);
    return () => clearTimeout(timer);
  }, [topicId, revision, attempt, sections, brand]);

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
    sections, brand,
    status: !current.loaded ? 'loading' : !revision ? 'idle' : save.revision !== revision ? 'pending' : save.status,
    setSections: next => change(() => ({ sections: next })),
    setBrand: patch => change(base => ({ brand: { ...base.brand, ...patch } })),
    retry: () => setAttempt(value => value + 1),
  };
}

/** The written summary already stored for the project, if any. The report only reads it; it never asks for a new one. */
function useStoredSummary(topicId) {
  const [state, setState] = useState({ topicId: null, summary: null });
  useEffect(() => {
    if (!topicId) return;
    let active = true;
    api.get('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/summary')
      .then(payload => { if (active) setState({ topicId, summary: storedSummary(payload) }); })
      .catch(() => { if (active) setState({ topicId, summary: null }); });
    return () => { active = false; };
  }, [topicId]);
  return state.topicId === topicId ? state.summary : null;
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

export default function ProjectReport(props) {
  const topicId = props.topic?.id;
  const responseState = useResponseAnalysis(topicId);
  const settings = useReportSettings(topicId);
  const summary = useStoredSummary(topicId);
  // A change of project, period or platforms starts over from live data: an opened archive belongs to its own scope.
  const scopeKey = JSON.stringify([topicId, props.period?.from, props.period?.to, props.selectedPlatforms == null ? null : [...props.selectedPlatforms].sort()]);
  return <ReportWorkspace key={scopeKey} {...props} responseState={responseState} settings={settings} summary={summary} />;
}

function ReportWorkspace({ data, topic, period, selectedPlatforms = null, responseState, settings, summary }) {
  const [opened, setOpened] = useState(null);
  const [pdf, setPdf] = useState({ status: 'idle', text: '' });
  const [downloadError, setDownloadError] = useState('');
  const root = useRef(null);
  const [frame, scale] = usePreviewScale();
  const live = useMemo(() => buildReport(data, topic, period, undefined, selectedPlatforms, responseState), [data, topic, period, selectedPlatforms, responseState]);
  const report = opened?.report || live;
  const facts = useMemo(() => reportData(report), [report]);
  const pages = useMemo(() => reportPages(settings.sections, { topPosts: report.topPosts }), [settings.sections, report]);
  const analysisReady = Boolean(responseState.loaded) && !responseState.error;
  const busy = pdf.status === 'busy';

  async function downloadPdf() {
    if (busy || !root.current) return;
    setPdf({ status: 'busy', text: 'Menyiapkan PDF…' });
    try {
      const made = await downloadReportPdf(root.current, reportFileName(report.topic.label), `Laporan ${report.topic.label}`);
      setPdf({ status: 'done', text: `PDF tersimpan sebagai ${made.filename}${made.pages ? `, ${made.pages} halaman` : ''}.` });
    } catch (error) {
      if (error?.status === 503) {
        setPdf({ status: 'print', text: 'Server ini belum dapat membuat PDF, jadi dialog cetak browser dibuka. Pilih “Simpan sebagai PDF” di sana.' });
        setTimeout(() => window.print(), 150);   // after the line above is on screen: the dialog blocks the page
      } else setPdf({ status: 'error', text: 'PDF belum berhasil dibuat. Coba lagi, atau tekan Cetak lalu pilih “Simpan sebagai PDF”.' });
    }
  }
  function downloadJson() {
    let url;
    try {
      url = URL.createObjectURL(new Blob([reportArchive(report)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `pulse-report-${report.generatedAt.replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setDownloadError('');
    } catch { setDownloadError('Unduhan belum berhasil. Coba unduh JSON kembali.'); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  return <div className="pr-workspace">
    {/* Only while the report is open: its sheets fill the paper, so the paper has no margin of its own. */}
    <style>{'@page{size:A4;margin:0}'}</style>
    <div className="pr-bar" data-screen-only="" role="group" aria-label="Tindakan laporan">
      <p className="pr-bar-text" role="status" data-state={pdf.status}>{pdf.text || (pages.length ? `${pages.length} halaman A4. Berkas PDF sama dengan pratinjau di bawah.` : 'Semua bagian dimatikan, jadi belum ada halaman untuk diunduh.')}</p>
      <div className="pr-actions">
        {/* Stays focusable while it works, so the keyboard is not dropped; a second press does nothing. */}
        <PulseButton variant="primary" aria-disabled={busy || undefined} disabled={!pages.length} onClick={downloadPdf}>{busy
          ? <><LoaderCircle className="pu-spinner" aria-hidden="true" />Menyiapkan PDF…</>
          : <><Download aria-hidden="true" />Unduh PDF</>}</PulseButton>
        <PulseButton disabled={!pages.length || busy} onClick={() => window.print()}><Printer aria-hidden="true" />Cetak</PulseButton>
      </div>
    </div>
    <details className="pr-more" data-screen-only="">
      <summary>Arsip dan data mentah</summary>
      <div className="pr-more-body">
        <div className="pr-raw"><p>Angka di balik laporan ini sebagai berkas JSON, untuk diolah di tempat lain.</p><PulseButton onClick={downloadJson}>Unduh JSON</PulseButton></div>
        {downloadError && <p className="pr-error" role="alert">{downloadError}</p>}
        <ReportArchive topicId={topic.id} report={opened?.report || (analysisReady ? live : null)} onOpen={(value, archive) => { setOpened({ report: value, archive }); setPdf({ status: 'idle', text: '' }); }} />
      </div>
    </details>
    {opened && <p className="pr-archived-context" data-screen-only="" role="status">
      <span>Menampilkan arsip <strong>{opened.archive.title}</strong>, disimpan {pulseDate(opened.archive.created_at)}. Angka, periode, dan platform mengikuti arsip itu, bukan data terkini.</span>
      <PulseButton size="sm" onClick={() => setOpened(null)}>Kembali ke data terkini</PulseButton>
    </p>}
    <div className="pr-layout">
      <ReportBuilder sections={settings.sections} brand={settings.brand} pages={pages} status={settings.status} onSections={settings.setSections} onBrand={settings.setBrand} onRetry={settings.retry} />
      <section className="pr-preview" ref={frame} style={{ '--rp-scale': scale }} aria-label="Pratinjau laporan">
        {pages.length
          // An archive is printed with sentences worked out from its own figures: a stored summary may be newer than it.
          ? <ReportPages rootRef={root} report={report} pages={pages} data={facts} summary={opened ? null : summary} brand={settings.brand} />
          : <p className="pr-none" data-screen-only="">Semua bagian dimatikan. Nyalakan setidaknya satu bagian di “Susunan laporan” untuk membuat laporan.</p>}
      </section>
    </div>
  </div>;
}

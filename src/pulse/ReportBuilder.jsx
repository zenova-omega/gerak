// The panel beside the report preview: which pages are printed, in what order, and under whose name.
// Screen only. Every change shows in the preview at once; saving is the caller's job.
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImageUp, RotateCcw, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { PulseButton } from '../components/ui/PulseUI';
import { aiStatus, defaultAccent, descriptionMax, logoProblem, logoTypes, moveSection, organisationMax, sectionPageLabel, sectionTitle, summaryFormats, switchSection } from '../lib/pulseReportPages';
import { pulseDate } from '../lib/pulseData';
import { rangeText } from './projectPeriodPresets';
import { cardScope } from './summaryModel';

const saveText = {
  loading: 'Memuat…',
  pending: 'Menyimpan…',
  saving: 'Menyimpan…',
  saved: 'Tersimpan.',
  error: 'Belum tersimpan di server.',
};

/** @param {{sections: {key: string, on: boolean}[], brand: {logo: string|null, accent: string|null, organisation: string, description: string},
 *   pages: object[], status: 'loading'|'idle'|'pending'|'saving'|'saved'|'error', onSections: (next: object[]) => void,
 *   onBrand: (patch: object) => void, onRetry: () => void, ai?: AiProps|null}} props
 * @typedef {{choice: string|null, status: ReturnType<typeof aiStatus>, busy: ''|'summary'|'insights', error: string,
 *   onChoice: (choice: string|null) => void, onWrite: (kind: 'summary'|'insights') => void}} AiProps */
export default function ReportBuilder({ sections, brand, pages, status, onSections, onBrand, onRetry, ai = null }) {
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [moved, setMoved] = useState(null);
  const list = useRef(null), file = useRef(null);
  const locked = status === 'loading';

  // A section that moved takes its buttons with it: keep the keyboard on the one that was pressed, or on its
  // partner when the section reached the top or the bottom and that button switched off.
  useEffect(() => {
    if (!moved) return;
    const row = list.current?.querySelector(`[data-section="${moved.key}"]`);
    (row?.querySelector(`[data-move="${moved.step}"]:not(:disabled)`) || row?.querySelector('[data-move]:not(:disabled)'))?.focus();
  }, [moved]);

  function move(key, step) {
    const next = moveSection(sections, key, step);
    if (next === sections) return;
    onSections(next);
    setMoved({ key, step, text: `${sectionTitle(key)} sekarang di urutan ${next.findIndex(item => item.key === key) + 1} dari ${next.length}.` });
  }
  function pickLogo(event) {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    const problem = logoProblem(chosen);
    if (problem) { setLogoError(problem); return; }
    const reader = new FileReader();
    reader.onload = () => { setLogoError(''); onBrand({ logo: String(reader.result) }); };
    reader.onerror = () => setLogoError('Berkas logo tidak terbaca. Coba berkas lain.');
    reader.readAsDataURL(chosen);
  }

  const printed = sections.filter(section => section.on).length;
  return <aside className="rb" data-screen-only="" data-open={open ? '' : undefined} aria-label="Susunan dan merek laporan">
    <header className="rb-head">
      <div><h2>Susunan laporan</h2><p>{pages.length ? `${printed} bagian dicetak, ${pages.length} halaman` : 'Tidak ada bagian yang dicetak'}</p></div>
      <PulseButton className="rb-toggle" size="sm" aria-expanded={open} aria-controls="rb-body" onClick={() => setOpen(value => !value)}><SlidersHorizontal aria-hidden="true" />{open ? 'Tutup' : 'Atur'}</PulseButton>
    </header>
    <div className="rb-body" id="rb-body">
      <section aria-labelledby="rb-pages-title">
        <h3 id="rb-pages-title">Halaman</h3>
        <ol className="rb-sections" ref={list}>{sections.map((section, index) => {
          const title = sectionTitle(section.key);
          return <li key={section.key} data-section={section.key} data-off={section.on ? undefined : ''}>
            <label className="rb-switch">
              <input type="checkbox" role="switch" className="pu-switch-input" checked={section.on} disabled={locked} onChange={event => onSections(switchSection(sections, section.key, event.target.checked))} />
              <span><span className="rb-name">{title}</span><span className="rb-where">{sectionPageLabel(pages, section.key) || 'tidak dicetak'}</span></span>
            </label>
            <span className="rb-moves">
              <PulseButton variant="quiet" size="sm" iconOnly data-move="-1" aria-label={`Naikkan ${title}`} title="Naik" disabled={locked || index === 0} onClick={() => move(section.key, -1)}><ArrowUp aria-hidden="true" /></PulseButton>
              <PulseButton variant="quiet" size="sm" iconOnly data-move="1" aria-label={`Turunkan ${title}`} title="Turun" disabled={locked || index === sections.length - 1} onClick={() => move(section.key, 1)}><ArrowDown aria-hidden="true" /></PulseButton>
            </span>
          </li>;
        })}</ol>
        <p className="pu-sr" role="status">{moved?.text}</p>
      </section>

      {ai && <AiChoices ai={ai} sections={sections} pages={pages} locked={locked} onSections={onSections} />}

      <section aria-labelledby="rb-brand-title">
        <h3 id="rb-brand-title">Merek</h3>
        <div className="rb-field">
          <span className="rb-label" id="rb-logo-label">Logo</span>
          <div className="rb-logo">
            <span className="rb-logo-view">{brand.logo ? <img src={brand.logo} alt="Logo yang dipakai sekarang" /> : <span>Belum ada logo. Laporan memakai tanda PULSE.</span>}</span>
            <span className="rb-logo-actions">
              <PulseButton size="sm" disabled={locked} onClick={() => file.current?.click()}><ImageUp aria-hidden="true" />{brand.logo ? 'Ganti logo' : 'Unggah logo'}</PulseButton>
              {brand.logo && <PulseButton variant="quiet" size="sm" disabled={locked} onClick={() => { setLogoError(''); onBrand({ logo: null }); }}><Trash2 aria-hidden="true" />Hapus</PulseButton>}
            </span>
            <input ref={file} type="file" hidden tabIndex={-1} aria-hidden="true" accept={logoTypes.join(',')} onChange={pickLogo} />
          </div>
          {logoError && <p className="rb-error" role="alert">{logoError}</p>}
        </div>
        <div className="rb-field">
          <label className="rb-label" htmlFor="rb-accent">Warna aksen</label>
          <div className="rb-accent">
            <input id="rb-accent" type="color" disabled={locked} value={brand.accent || defaultAccent}
              onChange={event => { const value = event.target.value.toLowerCase(); onBrand({ accent: value === defaultAccent ? null : value }); }} />
            <code>{(brand.accent || defaultAccent).toUpperCase()}</code>
            <PulseButton variant="quiet" size="sm" disabled={locked || !brand.accent} onClick={() => onBrand({ accent: null })}><RotateCcw aria-hidden="true" />Warna PULSE</PulseButton>
          </div>
        </div>
        <div className="rb-field">
          <label className="rb-label" htmlFor="rb-organisation">Nama organisasi</label>
          <input id="rb-organisation" type="text" disabled={locked} value={brand.organisation} maxLength={organisationMax} autoComplete="organization" onChange={event => onBrand({ organisation: event.target.value })} />
        </div>
        <div className="rb-field">
          <label className="rb-label" htmlFor="rb-description">Deskripsi singkat</label>
          <textarea id="rb-description" rows={4} disabled={locked} value={brand.description} maxLength={descriptionMax} aria-describedby="rb-description-hint" onChange={event => onBrand({ description: event.target.value })} />
          <p className="rb-hint rb-hint-split" id="rb-description-hint"><span></span><span>{brand.description.length} / {descriptionMax}</span></p>
        </div>
      </section>

      <p className="rb-save" role="status" data-state={status}>
        {saveText[status] || ''}
        {status === 'error' && <PulseButton size="sm" onClick={onRetry}>Simpan lagi</PulseButton>}
      </p>
    </div>
  </aside>;
}

const formatLabel = Object.fromEntries(summaryFormats.map(format => [format.key, format.label]));
/** What the stored written summary is, in one line. */
function summaryLine(status) {
  const { summary } = status;
  if (!status.loaded) return 'Memuat teks AI tersimpan…';
  if (status.failed) return 'Teks AI tersimpan belum dapat dimuat.';
  if (status.archived) return 'Arsip dicetak tanpa teks AI.';
  if (!summary.format) return 'Halaman memakai kalimat yang disusun dari angka.';
  if (summary.stored) return `Ditulis ${pulseDate(summary.stored.createdAt)} · ${cardScope(summary.stored.scope).text}`;
  if (!status.available) return 'AI belum aktif di instalasi ini.';
  return `Belum ada ringkasan ${formatLabel[summary.format]}. Sampai ditulis, halaman memakai kalimat dari angka.`;
}
/** What the stored AI Insights are, in one line. */
function insightsLine(status) {
  const { insights } = status;
  if (!status.loaded) return 'Memuat teks AI tersimpan…';
  if (status.failed) return 'Teks AI tersimpan belum dapat dimuat.';
  if (status.archived) return 'Arsip dicetak tanpa teks AI.';
  if (!insights.stored) return status.available ? 'Belum ada AI Insights.' : 'AI belum aktif di instalasi ini.';
  const when = `Ditulis ${pulseDate(insights.stored.createdAt)}`, scope = insights.stored.scope;
  return insights.differs ? `${when} untuk ${rangeText({ from: scope.from || '', to: scope.to || '' }).replace(/^[A-Z]/, letter => letter.toLowerCase())}${scope.platforms?.length ? ', sebagian platform' : ''}; dicetak dengan catatan cakupan.` : `${when} untuk periode laporan ini.`;
}

/** The written texts the report can carry: which stored summary the summary page prints, and the AI Insights page.
 * Opening the report never writes; a button offers to write only what is missing, or AI Insights for another period. */
function AiChoices({ ai, sections, pages, locked, onSections }) {
  const { status, choice, busy } = ai;
  const shown = choice ?? status.summary.format ?? 'off';
  const insights = sections.find(section => section.key === 'insights');
  return <section aria-labelledby="rb-ai-title" className="rb-ai">
    <h3 id="rb-ai-title">Isi AI</h3>
    <fieldset className="rb-field">
      <legend className="rb-label">Ringkasan AI di halaman Ringkasan eksekutif</legend>
      <div className="rb-choices">{[['off', 'Mati'], ...summaryFormats.map(format => [format.key, format.label])].map(([value, label]) => <label key={value} className="rb-choice">
        <input type="radio" name="rb-ai-summary" value={value} checked={shown === value} disabled={locked} onChange={() => ai.onChoice(value)} /><span>{label}</span>
      </label>)}</div>
      <p className="rb-hint" role="status">{summaryLine(status)}</p>
      {status.summary.canWrite && <PulseButton size="sm" busy={busy === 'summary'} busyLabel="Menulis ringkasan…" disabled={Boolean(busy)} onClick={() => ai.onWrite('summary')}><Sparkles aria-hidden="true" />Tulis ringkasan {formatLabel[status.summary.format]}</PulseButton>}
    </fieldset>
    {insights && <div className="rb-field">
      <label className="rb-switch">
        <input type="checkbox" role="switch" className="pu-switch-input" checked={insights.on} disabled={locked} onChange={event => onSections(switchSection(sections, 'insights', event.target.checked))} />
        <span><span className="rb-name">AI Insights</span><span className="rb-where">{sectionPageLabel(pages, 'insights') || 'tidak dicetak'}</span></span>
      </label>
      <p className="rb-hint" role="status">{insightsLine(status)}</p>
      {status.insights.canWrite && <PulseButton size="sm" busy={busy === 'insights'} busyLabel="Menulis insight…" disabled={Boolean(busy)} onClick={() => ai.onWrite('insights')}><Sparkles aria-hidden="true" />Tulis untuk periode laporan</PulseButton>}
    </div>}
    {ai.error && <p className="rb-error" role="alert">{ai.error}</p>}
    <p className="rb-hint">Membuka laporan tidak menulis apa pun. Menulis butuh ±1 menit dan memakai kredit AI.</p>
  </section>;
}

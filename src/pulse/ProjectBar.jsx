import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FolderOpen, SlidersHorizontal, Plus, Search, ArrowRight, CalendarDays, Layers, ChevronDown } from 'lucide-react';
import { useTopics } from '../hooks/usePulse';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { buildProjectQuery, explainProjectQuery, projectSearch, parseProjectQuery } from './projectQuery';
import KeywordChips from './KeywordChips';
import SmartKeywords from './SmartKeywords';
import { mergeTerms, appendToQuery } from './keywordTerms';
import './listening-workbench.css';
import './project-bar.css';
import SeedPostPreview from './SeedPostPreview';
import ProjectPeriod from './ProjectPeriod';
import useProjectPeriod from './useProjectPeriod';
import { periodLabel } from './projectPeriodPresets';
import { platformLabel } from '../components/admin/pulse/PlatformIcon';
import useProjectPlatforms from './useProjectPlatforms';
import { PulseTag, PlatformTag } from '../components/ui/PulseTag';
import InfoTip from './InfoTip';
import {projectPlatformOptions} from '../lib/pulseProjectFilters';

export function ProjectEditor({ topic, resource, onCreated, readOnly }) {
  const [label, setLabel] = useState(topic?.label || '');
  const [query, setQuery] = useState(topic?.query || '');
  const initial = parseProjectQuery(topic?.query || '');
  const [main, setMain] = useState(initial?.main || '');
  const [variations, setVariations] = useState('');
  const [required, setRequired] = useState(initial?.required || '');
  const [excluded, setExcluded] = useState(initial?.excluded || '');
  const [advanced,setAdvanced] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [projectMode, setProjectMode] = useState(topic?.seed_post ? 'post' : 'issue');
  const [seedUrl, setSeedUrl] = useState(topic?.seed_post?.url || '');
  const [previewUrl, setPreviewUrl] = useState(topic?.seed_post?.url || '');
  const [sources, setSources] = useState(topic?.sources || ['rss']);
  let builtQuery='',builderError='';
  try { builtQuery=buildProjectQuery(main,required,excluded,variations); } catch(error) { builderError=error.message; }
  const effectiveQuery=advanced?query:builtQuery;
  const currentFields = advanced ? parseProjectQuery(query) : null;
  function openBuilder() {
    if (!advanced || !currentFields) return;
    // Decode the current draft, never the query from when the editor first opened.
    setMain(currentFields.main);
    setRequired(currentFields.required);
    setExcluded(currentFields.excluded);
    setVariations('');
    setAdvanced(false);
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || readOnly) return;
    setBusy(true); setNotice(null);
    try {
      if (!advanced && builderError) throw new Error(builderError);
      const payload = { label: label.trim(), query: effectiveQuery, sources, seed_post: projectMode === 'post' ? { url: seedUrl.trim() } : null };
      if (!payload.label || !payload.query.trim()) throw new Error('Nama project dan query wajib diisi.');
      if (!sources.length) throw new Error('Pilih minimal satu sumber.');
      if (projectMode === 'post' && !seedUrl.trim()) throw new Error('Masukkan URL posting acuan.');
      if (topic) await resource.updateTopic(topic.id, payload);
      else { const created = await resource.createTopic(payload); onCreated(created.id); }
      setNotice({ text: 'Pengaturan project tersimpan.' });
    } catch (error) { setNotice({ error: true, text: error.status ? 'Project gagal disimpan. Periksa izin dan coba lagi.' : error.message }); }
    finally { setBusy(false); }
  }
  return <form className="ps-project-editor" onSubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy || readOnly}><legend>{topic ? 'Keyword & pengaturan project' : 'Project baru'}</legend>
      <label>Mode project<select value={projectMode} onChange={e => setProjectMode(e.target.value)}><option value="issue">Pantau isu</option><option value="post">Telusuri posting</option></select></label>
      {projectMode === 'post' && <>
        <label>URL posting acuan<input type="url" required maxLength={2048} value={seedUrl} onChange={e=>{setSeedUrl(e.target.value);setPreviewUrl('');}} placeholder="https://x.com/akun/status/…" /></label>
        <p>Satu posting sebagai acuan. Gunakan URL lengkap, bukan link profil atau shortlink. Pencarian memakai keyword di bawah; ini belum merupakan pelacak seluruh repost.</p>
        <PulseButton disabled={!seedUrl.trim()} onClick={()=>setPreviewUrl(seedUrl.trim())}>Periksa posting tersimpan</PulseButton>
        {previewUrl && <SeedPostPreview url={previewUrl} onUseCaption={value=>{setQuery(value);setAdvanced(true);}}/>}
      </>}
      <label>Nama project<input value={label} onChange={e => setLabel(e.target.value)} maxLength={100} required /></label>
      <div className="ps-keyword-mode"><PulseButton aria-pressed={!advanced} disabled={advanced && !currentFields} onClick={openBuilder}>Keyword builder</PulseButton><PulseButton aria-pressed={advanced} disabled={!advanced && Boolean(builderError)} onClick={()=>{if(!advanced) {setQuery(builtQuery);setAdvanced(true);}}}>Boolean lanjutan</PulseButton></div>
      {advanced && !currentFields && <p>Edit query ini dengan Boolean lanjutan.</p>}
      {!advanced ? <section className="ps-keyword-builder" aria-label="Susun keyword"><p>Pisahkan kata atau frasa dengan koma.</p>
        <div className="ps-keyword-fields">
          <KeywordChips label="Istilah utama" value={main} onChange={setMain} placeholder="transportasi publik" help="Wajib diisi. OR: cukup salah satu istilah utama atau variasinya cocok."/>
          <KeywordChips label="Variasi istilah" value={variations} onChange={setVariations} placeholder="angkutan umum, transportasi umum" help="Tambahkan singkatan, ejaan lain, atau sinonim."/>
          <KeywordChips label="Konteks wajib" value={required} onChange={setRequired} placeholder="Jakarta" help="Opsional. AND: semua kata atau frasa di sini wajib muncul, bukan salah satunya."/>
          <KeywordChips label="Istilah yang dikecualikan" value={excluded} onChange={setExcluded} placeholder="iklan, lowongan" help="Opsional. NOT: abaikan posting yang mengandung salah satu istilah ini."/>
        </div>
        <SmartKeywords fields={{main,variations,required,excluded}} topicId={topic?.id} onAdd={added=>{setVariations(value=>mergeTerms(value,added.variation));setRequired(value=>mergeTerms(value,added.context));setExcluded(value=>mergeTerms(value,added.exclude));}}/>
        <div className="ps-query-preview" aria-live="polite" aria-atomic="true"><strong>Ringkasan pencarian</strong>{builtQuery ? <><p>{explainProjectQuery(main,required,excluded,variations)}</p><details><summary>Lihat query</summary><code>{builtQuery}</code></details></> : <p>{builderError}</p>}</div>
      </section> : <><label>Query yang dipantau<textarea value={query} onChange={e => setQuery(e.target.value)} rows={3} maxLength={500} required aria-describedby="ps-query-help" /></label>
        <SmartKeywords fields={{main:query.replace(/["()]/g,' ').replace(/\b(AND|OR|NOT)\b/g,',')}} topicId={topic?.id} onAdd={added=>setQuery(current=>appendToQuery(current,added))}/></>}
      <p id="ps-query-help">Keyword menentukan percakapan yang akan dikumpulkan.</p>
      <fieldset className="ps-source-options"><legend>Sumber pencarian</legend>{[['rss','Berita'],['xpoz','X'],['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube']].map(([value,title])=><label key={value}><input type="checkbox" checked={sources.includes(value)} onChange={e=>setSources(e.target.checked?[...sources,value]:sources.filter(s=>s!==value))}/>{title}</label>)}</fieldset>
      {effectiveQuery.length > 250 && <PulseNotice tone="warning">Query ini melebihi batas Xpoz. Pendekkan sebelum mengambil Instagram atau TikTok.</PulseNotice>}
      <PulseButton type="submit" variant="primary" disabled={!advanced && Boolean(builderError)} busy={busy} busyLabel="Menyimpan…">{topic ? 'Simpan perubahan' : 'Buat project'}</PulseButton>
    </fieldset>
    {readOnly && <p>Hanya pemilik atau admin yang dapat mengubah project.</p>}
    {notice && <PulseNotice role={notice.error ? 'alert' : 'status'} tone={notice.error ? 'warning' : 'neutral'}>{notice.text}</PulseNotice>}
  </form>;
}

export default function ProjectBar({ readOnly = false }) {
  const resource = useTopics();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const id = params.get('topic') || '';
  const [platforms,setPlatforms]=useProjectPlatforms(id);
  const topic = resource.topics.find(t => t.id === id);
  function select(next) { setMode(''); const search=new URLSearchParams(projectSearch(params,next));for(const key of ['platforms','platform','author','sentiment','day'])search.delete(key);setParams(search); }
  const platformChoices=[...new Set([...projectPlatformOptions,...(platforms||[])])];
  // From "Semua", one click narrows to that platform. Clearing the last one, or picking every one, returns to "Semua".
  function togglePlatform(platform){ const current=platforms||[]; const next=current.includes(platform)?current.filter(p=>p!==platform):[...current,platform]; setPlatforms(!next.length||platformChoices.every(p=>next.includes(p))?null:next); }
  const [period] = useProjectPeriod(id);
  const [scopeOpen, setScopeOpen] = useState(false);
  const filtered = Boolean(period.from || period.to) || platforms !== null;
  const platformSummary = platforms === null ? 'Semua platform' : platforms.length <= 2 ? platforms.map(platform => platform === 'unknown' ? 'Lainnya' : platformLabel(platform)).join(', ') || 'Tanpa platform' : `${platforms.length} platform`;
  const available = resource.topics.filter(t => t.label.toLocaleLowerCase('id').includes(projectFilter.toLocaleLowerCase('id')));
  return <section className="ps-project-bar" aria-label="Project aktif" data-selected={Boolean(topic)}>
    <div className="ps-project-toolbar">
      <label className="ps-project-pick"><span className="pu-sr">Project aktif</span><FolderOpen size={18} aria-hidden="true" /><select value={id} onChange={e => select(e.target.value)} disabled={resource.loading}>
        <option value="">Pilih project</option>{id && !topic && <option value={id}>{resource.loading ? 'Memuat project…' : 'Project tidak tersedia'}</option>}{resource.topics.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select></label>
      {topic && <button type="button" className="ps-scope-toggle" aria-expanded={scopeOpen} aria-controls="ps-scope" data-filtered={filtered ? '' : undefined} onClick={() => setScopeOpen(value => !value)}>
        <span className="pu-sr">Cakupan: </span><span><CalendarDays size={16} aria-hidden="true" />{periodLabel(period)}</span><span><Layers size={16} aria-hidden="true" />{platformSummary}</span>
        <span className="ps-scope-toggle-action">{scopeOpen ? 'Tutup' : 'Ubah'}<ChevronDown size={16} aria-hidden="true" /></span>
      </button>}
      <div className="ps-project-actions">{topic && <PulseButton aria-expanded={mode === 'edit'} onClick={() => setMode(mode === 'edit' ? '' : 'edit')}><SlidersHorizontal size={16} />Keyword</PulseButton>}{!topic && <Link className="ps-project-search-link" to={'/pulse/search' + (params.get('q') ? '?' + new URLSearchParams({q:params.get('q')}) : '')}><Search size={16} aria-hidden="true"/>Pencarian cepat</Link>}{!readOnly && <PulseButton aria-expanded={mode === 'new'} onClick={() => setMode(mode === 'new' ? '' : 'new')}><Plus size={16} />Project baru</PulseButton>}</div>
    </div>
    {resource.error ? <PulseNotice role="alert" tone="warning">Daftar project gagal dimuat. <PulseButton onClick={resource.refetch}>Coba lagi</PulseButton></PulseNotice> : topic ? null : <div className="ps-project-start">
      <p className="ps-project-help">Pilih project atau mulai dengan keyword baru melalui Pencarian cepat.</p>
      {resource.loading ? <p role="status">Memuat daftar project…</p> : <>
        {resource.topics.length > 5 && <label className="ps-project-find">Cari project<input type="search" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)} placeholder="Nama project…"/></label>}
        <div className="ps-project-shortcuts" aria-label="Pilih project tersimpan">{available.map(t=><button type="button" key={t.id} onClick={()=>select(t.id)}><FolderOpen size={18} aria-hidden="true"/><span><strong>{t.label}</strong><small>{t.seed_post ? 'Telusuri posting' : 'Pantau topik'} · data tersimpan</small></span><ArrowRight size={16} aria-hidden="true"/></button>)}</div>
        {!available.length && <p role="status">{resource.topics.length ? 'Tidak ada project dengan nama tersebut.' : 'Belum ada project. Mulai dengan pencarian atau buat project untuk monitoring berulang.'}</p>}
      </>}
    </div>}
    {topic?.seed_post && mode !== 'edit' && <details className="ps-seed-context"><summary>Posting acuan & batas penelusuran</summary><SeedPostPreview key={topic.id+topic.seed_post.url} url={topic.seed_post.url}/><p>Dashboard menampilkan hasil keyword project. Konten terkait atau terbit setelah acuan bukan bukti repost maupun sebab-akibat. Peta belum berpusat otomatis pada posting acuan.</p></details>}
    {topic && scopeOpen && <div className="ps-scope" id="ps-scope"><ProjectPeriod key={id} topicId={id}/>
      <section className="ps-scope-group ps-project-platforms" aria-label="Platform project"><span className="ps-scope-label">Platform <InfoTip label="Tentang filter platform">Berlaku di seluruh dashboard dan laporan. Pilih satu atau beberapa platform; hasil digabung dari platform yang dipilih.</InfoTip></span>
        <div className="pu-tag-group" role="group" aria-label="Pilih platform"><PulseTag size="lg" tone="accent" pressed={platforms===null} onClick={()=>setPlatforms(null)}>Semua</PulseTag>{platformChoices.map(platform=><PlatformTag key={platform} size="lg" platform={platform} pressed={platforms!==null&&platforms.includes(platform)} onClick={()=>togglePlatform(platform)}>{platform==='unknown'?'Lainnya':undefined}</PlatformTag>)}</div>
      </section>
      <p className="ps-scope-query"><span>{topic.seed_post ? 'Telusuri posting · 1 acuan' : 'Pantau isu'}</span><code title={topic.query}>{topic.query}</code></p>
    </div>}
    {mode && (mode === 'new' || topic) && <ProjectEditor key={mode + ':' + id} topic={mode === 'edit' ? topic : null} resource={resource} readOnly={readOnly} onCreated={select} />}
  </section>;
}

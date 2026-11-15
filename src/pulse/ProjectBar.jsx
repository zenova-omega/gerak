import { useEffect, useMemo, useState } from 'react';
import { Link, useInRouterContext, useNavigate, useSearchParams } from 'react-router-dom';
import { FolderOpen, SlidersHorizontal, Plus, Search, ArrowRight, CalendarDays, Layers, ChevronDown } from 'lucide-react';
import { useTopics } from '../hooks/usePulse';
import api from '../lib/api';
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
import {coverage} from '../lib/pulseReadings';
import CoverageBadge from './CoverageBadge';
import useProjectSelection from './useProjectSelection';

export function ProjectEditor({ topic, resource, onCreated, onDeleted, readOnly }) {
  const [label, setLabel] = useState(topic?.label || '');
  const [query, setQuery] = useState(topic?.query || '');
  const initial = parseProjectQuery(topic?.query || '');
  const [main, setMain] = useState(initial?.main || '');
  const [variations, setVariations] = useState('');
  const [accounts, setAccounts] = useState('');
  const [required, setRequired] = useState(initial?.required || '');
  const [excluded, setExcluded] = useState(initial?.excluded || '');
  const [advanced,setAdvanced] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [projectMode, setProjectMode] = useState(topic?.seed_post ? 'post' : 'issue');
  const [seedUrl, setSeedUrl] = useState(topic?.seed_post?.url || '');
  const [previewUrl, setPreviewUrl] = useState(topic?.seed_post?.url || '');
  const [sources, setSources] = useState(topic?.sources || ['rss']);
  const routed = useInRouterContext();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  async function removeProject() {
    if (deleting || deleteText.trim() !== (topic.label || '').trim()) return;
    setDeleting(true);
    try { await resource.deleteTopic(topic.id); onDeleted?.(); }
    catch (error) { setNotice({ error: true, text: error.status === 409 ? 'Pengumpulan project ini sedang berjalan. Coba hapus lagi sebentar.' : 'Project belum berhasil dihapus. Periksa izin dan coba lagi.' }); setDeleting(false); }
  }
  const [lookback, setLookback] = useState(7);
  const [savedLookback, setSavedLookback] = useState(null);
  const [lookbackRun, setLookbackRun] = useState(null);
  useEffect(() => {
    if (!topic?.id) return;
    let active = true;
    api.get('/admin/pulse/topics/' + encodeURIComponent(topic.id) + '/lookback').then(data => { if (active) { setLookback(data.days); setSavedLookback(data.last_run ? data.days : null); setLookbackRun(data); } }).catch(() => {});
    return () => { active = false; };
  }, [topic?.id]);
  let builtQuery='',builderError='';
  try { builtQuery=buildProjectQuery(main,required,excluded,variations,accounts); } catch(error) { builderError=error.message; }
  const effectiveQuery=advanced?query:builtQuery;
  const currentFields = advanced ? parseProjectQuery(query) : null;
  function openBuilder() {
    if (!advanced || !currentFields) return;
    // Decode the current draft, never the query from when the editor first opened.
    setMain(currentFields.main);
    setRequired(currentFields.required);
    setExcluded(currentFields.excluded);
    setVariations('');
    setAccounts('');
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
      let savedId = topic?.id;
      if (topic) await resource.updateTopic(topic.id, payload);
      else { const created = await resource.createTopic(payload); savedId = created.id; onCreated(created.id); }
      // Pull the chosen range once: for a new project, and whenever the range or the query changed.
      const pull = !topic || savedLookback !== lookback || topic.query !== payload.query || String(topic.sources) !== String(payload.sources);
      // A new project also gets each source's schedule switched on, so collection goes on after the first pull.
      if (pull) { try { const path = '/admin/pulse/topics/' + encodeURIComponent(savedId); const state = topic ? await api.put(path + '/lookback', { days: lookback }) : await api.post(path + '/start', { days: lookback }); setSavedLookback(lookback); setLookbackRun(state); } catch { /* the project is saved; the pull can be repeated from here */ } }
      setNotice({ text: pull ? `Pengaturan tersimpan. Semua posting ${lookback} hari terakhir sedang ditarik dari tiap sumber; angka akan bertambah dalam beberapa menit.` : 'Pengaturan project tersimpan.' });
    } catch (error) { setNotice({ error: true, text: error.status ? 'Project gagal disimpan. Periksa izin dan coba lagi.' : error.message }); }
    finally { setBusy(false); }
  }
  return <form className="ps-project-editor" onSubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy || readOnly}><legend>{topic ? 'Pengaturan project' : 'Project baru'}</legend>
      <section className="ps-set" aria-labelledby="ps-set-identity"><h3 id="ps-set-identity">Identitas</h3><p>Nama yang tampil di pemilih project dan di laporan.</p>
      <label>Nama project<input value={label} onChange={e => setLabel(e.target.value)} maxLength={100} required /></label>
      <label>Mode project<select value={projectMode} onChange={e => setProjectMode(e.target.value)}><option value="issue">Pantau isu</option><option value="post">Telusuri posting</option></select></label>
      {projectMode === 'post' && <>
        <label>URL posting acuan<input type="url" required maxLength={2048} value={seedUrl} onChange={e=>{setSeedUrl(e.target.value);setPreviewUrl('');}} placeholder="https://x.com/akun/status/…" /></label>
        <p>Satu posting sebagai acuan. Gunakan URL lengkap, bukan link profil atau shortlink. Pencarian memakai keyword di bawah; ini belum merupakan pelacak seluruh repost.</p>
        <PulseButton disabled={!seedUrl.trim()} onClick={()=>setPreviewUrl(seedUrl.trim())}>Periksa posting tersimpan</PulseButton>
        {previewUrl && <SeedPostPreview url={previewUrl} onUseCaption={value=>{setQuery(value);setAdvanced(true);}}/>}
      </>}
      </section>
      <section className="ps-set" aria-labelledby="ps-set-keyword"><h3 id="ps-set-keyword">Keyword</h3><p>Menentukan percakapan yang dikumpulkan. Mengubahnya tidak menghapus posting yang sudah tersimpan.</p>
      <div className="ps-keyword-mode"><PulseButton aria-pressed={!advanced} disabled={advanced && !currentFields} onClick={openBuilder}>Keyword builder</PulseButton><PulseButton aria-pressed={advanced} disabled={!advanced && Boolean(builderError)} onClick={()=>{if(!advanced) {setQuery(builtQuery);setAdvanced(true);}}}>Boolean lanjutan</PulseButton></div>
      {advanced && !currentFields && <p>Edit query ini dengan Boolean lanjutan.</p>}
      {!advanced ? <section className="ps-keyword-builder" aria-label="Susun keyword"><p>Pisahkan kata atau frasa dengan koma.</p>
        <div className="ps-keyword-fields">
          <KeywordChips label="Istilah utama" value={main} onChange={setMain} placeholder="transportasi publik" help="Wajib diisi. OR: cukup salah satu istilah utama atau variasinya cocok."/>
          <KeywordChips label="Variasi istilah" value={variations} onChange={setVariations} placeholder="angkutan umum, transportasi umum" help="Tambahkan singkatan, ejaan lain, atau sinonim."/>
          <KeywordChips label="Akun personal publik (opsional)" value={accounts} onChange={setAccounts} placeholder="@namatokoh, https://x.com/namatokoh" help="Akun tokoh, partai, atau lembaga yang ingin dipantau sebutannya, termasuk serangan. Hanya akun publik; warga biasa tidak ditambahkan."/>
          <KeywordChips label="Konteks wajib" value={required} onChange={setRequired} placeholder="Jakarta" help="Opsional. AND: semua kata atau frasa di sini wajib muncul, bukan salah satunya."/>
          <KeywordChips label="Istilah yang dikecualikan" value={excluded} onChange={setExcluded} placeholder="iklan, lowongan" help="Opsional. NOT: abaikan posting yang mengandung salah satu istilah ini."/>
        </div>
        <SmartKeywords fields={{main,variations,required,excluded}} topicId={topic?.id} onAdd={added=>{setVariations(value=>mergeTerms(value,added.variation));setRequired(value=>mergeTerms(value,added.context));setExcluded(value=>mergeTerms(value,added.exclude));}}/>
        <div className="ps-query-preview" aria-live="polite" aria-atomic="true"><strong>Ringkasan pencarian</strong>{builtQuery ? <><p>{explainProjectQuery(main,required,excluded,variations,accounts)}</p><details><summary>Lihat query</summary><code>{builtQuery}</code></details></> : <p>{builderError}</p>}</div>
      </section> : <><label>Query yang dipantau<textarea value={query} onChange={e => setQuery(e.target.value)} rows={3} maxLength={500} required aria-describedby="ps-query-help" /></label>
        <SmartKeywords fields={{main:query.replace(/["()]/g,' ').replace(/\b(AND|OR|NOT)\b/g,',')}} topicId={topic?.id} onAdd={added=>setQuery(current=>appendToQuery(current,added))}/></>}
      </section>
      <section className="ps-set" aria-labelledby="ps-set-sources"><h3 id="ps-set-sources">Sumber dan rentang</h3><p>Dari mana posting diambil dan seberapa jauh ke belakang.</p>
      <fieldset className="ps-source-options"><legend>Sumber pencarian</legend>{[['rss','Berita'],['social','X'],['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube']].map(([value,title])=><label key={value}><input type="checkbox" checked={sources.includes(value)} onChange={e=>setSources(e.target.checked?[...sources,value]:sources.filter(s=>s!==value))}/>{title}</label>)}</fieldset>
      {effectiveQuery.length > 250 && <PulseNotice tone="warning">Query ini lebih dari 250 karakter. Pendekkan agar X, Instagram, dan TikTok bisa diambil.</PulseNotice>}
      <label className="ps-lookback">Tarik posting berapa hari ke belakang<select value={lookback} onChange={e => setLookback(Number(e.target.value))}><option value={7}>7 hari terakhir</option><option value={14}>14 hari terakhir</option><option value={30}>30 hari terakhir (maksimal)</option></select><small>{lookbackRun?.running ? 'Penarikan sedang berjalan.' : lookbackRun?.last_run ? `Terakhir ditarik ${lookbackRun.last_run.days} hari: ${lookbackRun.last_run.results.reduce((sum, row) => sum + row.ingested, 0)} posting baru.` : 'Dijalankan sekali saat disimpan, untuk tiap sumber yang dicentang. Setelah itu jadwal hanya mengambil posting terbaru.'}</small></label>
      </section>
      {topic && routed && <section className="ps-set" aria-labelledby="ps-set-collect"><h3 id="ps-set-collect">Pengumpulan</h3><p>Jadwal per sumber, batas harian, dan komentar otomatis diatur di Monitor dan berlaku untuk project ini.</p><div className="ps-set-links"><Link to={'/pulse/monitor?' + new URLSearchParams({ topic: topic.id })}>Atur jadwal dan batas <ArrowRight size={14} aria-hidden="true" /></Link><Link to={'/pulse/sources?' + new URLSearchParams({ topic: topic.id })}>Lihat sumber dan cakupan <ArrowRight size={14} aria-hidden="true" /></Link></div></section>}
      <div className="ps-set-save"><PulseButton type="submit" variant="primary" disabled={!advanced && Boolean(builderError)} busy={busy} busyLabel="Menyimpan…">{topic ? 'Simpan perubahan' : 'Buat project'}</PulseButton></div>
    </fieldset>
    {topic && !readOnly && <section className="ps-set ps-set-danger" aria-labelledby="ps-set-danger"><h3 id="ps-set-danger">Hapus project</h3><p>Menghapus project ini beserta semua posting, komentar, analisis, alert, dan jadwalnya. Tidak bisa dibatalkan. Laporan PDF yang sudah diunduh tidak terpengaruh.</p>
      {!confirmDelete ? <PulseButton onClick={() => { setConfirmDelete(true); setDeleteText(''); }}>Hapus project ini…</PulseButton> : <div className="ps-set-confirm" role="group" aria-label="Konfirmasi hapus project"><label>Ketik nama project untuk memastikan: <strong>{topic.label}</strong><input value={deleteText} onChange={event => setDeleteText(event.target.value)} autoComplete="off" autoFocus aria-describedby="ps-delete-note" /></label><p id="ps-delete-note">Semua data project ini hilang permanen setelah tombol di bawah ditekan.</p><div><PulseButton variant="reverse" disabled={deleteText.trim() !== (topic.label || '').trim()} busy={deleting} busyLabel="Menghapus…" onClick={removeProject}>Hapus permanen</PulseButton><PulseButton variant="quiet" disabled={deleting} onClick={() => setConfirmDelete(false)}>Batal</PulseButton></div></div>}
    </section>}
    {readOnly && <p>Hanya pemilik atau admin yang dapat mengubah project.</p>}
    {notice && <PulseNotice role={notice.error ? 'alert' : 'status'} tone={notice.error ? 'warning' : 'neutral'}>{notice.text}</PulseNotice>}
  </form>;
}

export default function ProjectBar({ readOnly = false }) {
  const resource = useTopics();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const id = params.get('topic') || '';
  const [platforms,setPlatforms]=useProjectPlatforms(id);
  const topic = resource.topics.find(t => t.id === id);
  function select(next) { setMode(''); const search=new URLSearchParams(projectSearch(params,next));for(const key of ['platforms','platform','author','account','sentiment','province','day','day_to','find','post','acc_platforms','acc_find','c'])search.delete(key);setParams(search); }
  const platformChoices=[...new Set([...projectPlatformOptions,...(platforms||[])])];
  // From "Semua", one click narrows to that platform. Clearing the last one, or picking every one, returns to "Semua".
  function togglePlatform(platform){ const current=platforms||[]; const next=current.includes(platform)?current.filter(p=>p!==platform):[...current,platform]; setPlatforms(!next.length||platformChoices.every(p=>next.includes(p))?null:next); }
  const [period] = useProjectPeriod(id);
  const [scopeOpen, setScopeOpen] = useState(false);
  // coverage_v1 of this bar's selection, from the posts the page below has loaded. The bar fetches nothing for it:
  // while no page has loaded the posts, there is no badge. The badge is a strip under the controls, whose row is
  // full; the strip's room is always there, so nothing moves when the figure arrives.
  const selection = useProjectSelection(topic ? id : '');
  const coverageReading = useMemo(() => (selection.posts ? coverage(selection.posts) : null), [selection.posts]);
  const filtered = Boolean(period.from || period.to) || platforms !== null;
  const platformSummary = platforms === null ? 'Semua platform' : platforms.length <= 2 ? platforms.map(platform => platform === 'unknown' ? 'Lainnya' : platformLabel(platform)).join(', ') || 'Tanpa platform' : `${platforms.length} platform`;
  function findInProject(event) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get('find').trim();
    const next = new URLSearchParams({ topic: id });
    if (text) next.set('find', text);
    navigate('/pulse/posts?' + next);
  }
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
      {topic && <form className="pu-search ps-global-search" role="search" aria-label="Cari posting atau akun di project ini" onSubmit={findInProject}>
        <Search aria-hidden="true" /><input type="search" name="find" key={id + ':' + (params.get('find') || '')} defaultValue={params.get('find') || ''} maxLength={120} placeholder="Cari posting atau akun…" aria-label="Cari posting atau akun di project ini" />
      </form>}
      <div className="ps-project-actions">{topic && <PulseButton aria-expanded={mode === 'edit'} onClick={() => setMode(mode === 'edit' ? '' : 'edit')}><SlidersHorizontal size={16} />Pengaturan</PulseButton>}{!topic && <Link className="ps-project-search-link" to={'/pulse/search' + (params.get('q') ? '?' + new URLSearchParams({q:params.get('q')}) : '')}><Search size={16} aria-hidden="true"/>Pencarian cepat</Link>}{!readOnly && <PulseButton aria-expanded={mode === 'new'} onClick={() => setMode(mode === 'new' ? '' : 'new')}><Plus size={16} />Project baru</PulseButton>}</div>
    </div>
    {topic && <div className="pcv-band"><CoverageBadge reading={coverageReading} to={'/pulse/sources?' + new URLSearchParams({ topic: id })} /></div>}
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
    {mode && (mode === 'new' || topic) && <ProjectEditor key={mode + ':' + id} topic={mode === 'edit' ? topic : null} resource={resource} readOnly={readOnly} onCreated={select} onDeleted={() => { setMode(''); select(''); window.dispatchEvent(new Event('pulse-projects-changed')); }} />}
  </section>;
}

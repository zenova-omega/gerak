import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Sparkles } from 'lucide-react';
import api from '../lib/api';
import { useTopics } from '../hooks/usePulse';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/shadcn/card';
import { Badge } from '../components/ui/shadcn/badge';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { PulsePageHead, PulseSkeleton } from '../components/ui/PulsePatterns';
import { PulsePanelEmpty } from '../components/ui/PulseAnalytics';
import { PulseLoader } from '../components/ui/PulseLoader';
import { PulseTag } from '../components/ui/PulseTag';
import { PulseArrow } from '../components/ui/PulseArrow';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { platformLabel } from '../components/admin/pulse/PlatformIcon';
import { formatCount, pulseDate, safeSourceUrl } from '../lib/pulseData';
import { rangeText } from './projectPeriodPresets';
import useProjectPeriod from './useProjectPeriod';
import useProjectPlatforms from './useProjectPlatforms';
import { pageMeta } from './pageMeta';
import { insightView, periodBadge, scopeDiffers } from './summaryModel';
import './ds/ai-insights.css';

const summaryPath = topicId => '/admin/pulse/topics/' + encodeURIComponent(topicId) + '/summary';
const WAITING = 'Membaca posting dan komentar, lalu menulis insight. Biasanya sekitar satu menit, paling lama tiga menit.';

const platformText = platforms => (platforms?.length ? new Intl.ListFormat('id', { style: 'long', type: 'conjunction' }).format([...platforms].sort().map(platformLabel)) : 'semua platform');
const sentenceCase = text => text.charAt(0).toUpperCase() + text.slice(1);
/** A scope inside a sentence: "3 Nov 2026 – 9 Nov 2026, semua platform". */
const scopeText = scope => `${rangeText({ from: scope.from || '', to: scope.to || '' }).replace(/^[A-Z]/, letter => letter.toLowerCase())}, ${platformText(scope.platforms)}`;

/** What a numbered reference points at, for people who do not see the page: "Bukti 2: posting akun X di Instagram". */
function evidenceName(number, source) {
  const who = source?.author ? `akun ${source.author}` : 'tanpa nama akun';
  const where = platformLabel(source?.platform);
  return source?.comment ? `Bukti ${number}: komentar ${who} pada posting di ${where}` : `Bukti ${number}: posting ${who} di ${where}`;
}

/** A numbered reference. It opens the cited post at its source; a comment opens the post it sits under.
 * Without a safe address it goes to the row in the evidence list instead.
 * The word joiner in front keeps the mark on the line of the sentence it supports. */
function Reference({ number, source }) {
  const url = safeSourceUrl(source?.url), name = evidenceName(number, source);
  return <>{'\u2060'}{url
    ? <a className="pc-cite ain-ref" href={url} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}>{number}</a>
    : <a className="pc-cite ain-ref" href={`#ain-bukti-${number}`} aria-label={name} title={name}>{number}</a>}</>;
}

function Evidence({ rows }) {
  if (!rows.length) return null;
  return <section className="ain-evidence">
    <h3>Bukti yang dirujuk</h3>
    <ol>{rows.map(({ number, source }) => <li id={`ain-bukti-${number}`} key={number}>
      <span className="pc-source-code">{number}</span>
      <div className="ain-source">
        <span className="pu-account-line"><AccountAvatar size="sm" author={source.author} platform={source.platform} photo={source.photo} /><strong>{source.author || 'Nama tidak tersedia'}</strong>{source.comment && <PulseTag size="sm">Komentar</PulseTag>}</span>
        <p>{source.text || 'Teks tidak tersedia'}</p>
        <span className="ain-source-meta">{platformLabel(source.platform)}{source.published_at && <> · {pulseDate(source.published_at)}</>}{typeof source.interactions === 'number' && <> · {formatCount(source.interactions)} {source.comment ? 'suka' : 'interaksi'}</>}</span>
      </div>
      {safeSourceUrl(source.url) && <a href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer" aria-label={`Buka bukti ${number} di sumbernya`}><PulseArrow /></a>}
    </li>)}</ol>
  </section>;
}

/** The period an insight covers: project, dates, the kind of period, platforms. */
function PeriodCard({ projectName, scope }) {
  return <Card className="ain-card ain-period" role="group" aria-label="Periode insight">
    <CardHeader>
      <span className="ain-eyebrow">Periode insight</span>
      <CardTitle className="ain-project">{projectName || 'Project ini'}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="ain-when"><span className="ain-range">{rangeText({ from: scope.from || '', to: scope.to || '' })}</span><Badge variant="secondary" className="ain-badge">{periodBadge(scope.from, scope.to)}</Badge></div>
      <span className="ain-platforms">{sentenceCase(platformText(scope.platforms))}</span>
    </CardContent>
  </Card>;
}

/** The page for one loaded state. It holds no requests and no timers, so every state can be rendered and checked on its own.
 * @param {{topicId: string, projectName?: string, period?: {from?: string, to?: string}, platforms?: string[]|null,
 *   state: null | {failed: true, missing?: boolean} | {available: boolean, posts_now: number, min_posts: number, summaries: {insights?: object}},
 *   busy?: boolean, error?: string, onMake?: () => void, onRetry?: () => void, chart?: import('react').ReactNode}} props */
export function InsightsView({ topicId, projectName = '', period = {}, platforms = null, state, busy = false, error = '', onMake, onRetry, chart = null }) {
  const meta = pageMeta.insights;
  const head = <PulsePageHead icon={meta.icon} title={meta.title} tagline={meta.tagline} guide={meta.guide} />;
  if (!topicId) return <section className="ain-page">{head}<PulsePanelEmpty title="Pilih project terlebih dahulu">AI Insights ditulis dari posting tersimpan satu project. Pilih project di bagian atas halaman.</PulsePanelEmpty></section>;
  if (!state) return <section className="ain-page" aria-busy="true">{head}<PulseSkeleton label="Memuat insight tersimpan…" stats={0} panels={1} rows={3} /></section>;
  if (state.failed) return <section className="ain-page">{head}{state.missing
    ? <PulsePanelEmpty title="Project tidak tersedia">Pilih project lain melalui picker di atas.</PulsePanelEmpty>
    : <PulsePanelEmpty title="Insight tersimpan tidak dapat dimuat" action={<PulseButton onClick={onRetry}>Coba lagi</PulseButton>}>Periksa koneksi ke server PULSE, lalu coba lagi.</PulsePanelEmpty>}</section>;

  const summary = state.summaries?.insights || null;
  const posts = state.posts_now || 0, floor = state.min_posts || 30;
  const view = insightView(summary);
  const scope = summary?.scope || {};
  const differs = Boolean(summary) && scopeDiffers(scope, period, platforms);
  const chosen = { from: period.from || '', to: period.to || '', platforms };
  // Whole-project insights can be compared with the project as it is now; a narrowed scope cannot, so it stays silent.
  const newer = summary && !differs && !scope.from && !scope.to && !scope.platforms && !scope.truncated ? posts - (scope.posts || 0) : 0;
  const blocked = !state.available ? 'AI Insights belum diaktifkan di instalasi ini. Hubungi administrator organisasi.' : !posts ? 'Belum ada posting tersimpan untuk project ini.' : '';
  const action = label => <PulseButton variant={summary && !differs ? 'secondary' : 'primary'} disabled={Boolean(blocked)} busy={busy} busyLabel="Menulis insight…" onClick={onMake}>{summary ? <RefreshCw /> : <Sparkles />}{label}</PulseButton>;

  return <section className="ain-page" aria-busy={busy || undefined}>
    {head}
    <div className="ain-notices">
      {blocked && summary && <PulseNotice>{blocked} Insight yang sudah tersimpan tetap bisa dibaca.</PulseNotice>}
      {posts > 0 && posts < floor && <PulseNotice tone="warning">Baru {formatCount(posts)} posting terkumpul. Insight lebih bisa diandalkan setelah pengumpulan berjalan lebih lama.</PulseNotice>}
      {busy && summary && <div className="ain-writing"><PulseLoader inline label={WAITING + ' Insight sebelumnya tetap tampil sampai yang baru selesai.'} /></div>}
      {error && <p className="ain-error" role="alert">{error}</p>}
    </div>
    <div className="ain-layout">
      <PeriodCard projectName={projectName} scope={summary ? scope : chosen} />
      {summary ? <Card className="ain-card ain-main">
        <CardHeader className="ain-head">
          {differs && <div className="ain-caution ain-differs" role="status"><p>Insight ini ditulis untuk {scopeText(scope)}. Bilah project sekarang memilih {scopeText(chosen)}.</p></div>}
          {newer > 0 && <div className="ain-caution" role="status"><p>{formatCount(newer)} posting baru belum masuk insight ini.</p></div>}
          <CardTitle className="ain-headline">{view.headline || 'Insight project ini'}</CardTitle>
          <div className="ain-meta">
            <p>Ditulis {pulseDate(summary.created_at)} dari {formatCount(scope.posts)} posting{scope.truncated ? ' terbaru' : ''} dan {formatCount(scope.comments)} komentar.{scope.truncated ? ' Posting yang lebih lama tidak dibaca.' : ''}</p>
            {action('Perbarui insight')}
          </div>
        </CardHeader>
        <CardContent>
          {view.insights.length > 0
            ? <ol className="ain-list">{view.insights.map((item, index) => <li className="ain-insight" key={index}><p>
              {item.lead.map((part, i) => (part.number ? <Reference key={i} number={part.number} source={view.evidence[part.number - 1].source} /> : <strong key={i}>{part.text}</strong>))}
              {item.body.length > 0 && ' '}
              {item.body.map((part, i) => (part.number ? <Reference key={i} number={part.number} source={view.evidence[part.number - 1].source} /> : part.text))}
            </p></li>)}</ol>
            : <p className="ain-reason">Insight tersimpan tidak berisi butir yang bisa ditampilkan. Tekan Perbarui insight untuk menulis ulang.</p>}
          <Evidence rows={view.evidence} />
        </CardContent>
        <CardFooter><p className="ain-note">Dirangkai AI dari posting dan komentar tersimpan. Periksa bukti sebelum dipakai.</p></CardFooter>
      </Card> : <Card className="ain-card ain-main">
        <CardHeader>
          <CardTitle className="ain-empty-title">Belum ada insight untuk project ini</CardTitle>
          <CardDescription className="ain-empty-text">AI menulis satu judul dan tiga sampai lima insight dari posting dan komentar tersimpan, untuk periode dan platform yang dipilih di bilah project. Tiap insight membawa bukti yang bisa dibuka. Insight hanya ditulis saat diminta, lalu disimpan sampai Anda memperbaruinya.</CardDescription>
        </CardHeader>
        <CardContent className="ain-empty-action">
          {action('Buat insight')}
          {blocked && <p className="ain-reason">{blocked}</p>}
          {busy && <PulseLoader inline label={WAITING} />}
        </CardContent>
      </Card>}
      <div className="ain-chart">{chart}</div>
    </div>
  </section>;
}

function ProjectInsights({ topicId, chart }) {
  const [period] = useProjectPeriod(topicId);
  const [platforms] = useProjectPlatforms(topicId);
  const topics = useTopics();
  const [state, setState] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Reading shows what was stored. Only the button asks for a new insight.
  useEffect(() => {
    if (!topicId) return undefined;
    let active = true;
    api.get(summaryPath(topicId))
      .then(data => { if (active) setState(data); })
      .catch(failure => { if (active) setState({ failed: true, missing: failure.status === 404 }); });
    return () => { active = false; };
  }, [topicId, attempt]);
  async function make() {
    if (busy || !topicId) return;
    const kept = state?.summaries?.insights ? ' Insight sebelumnya tetap ditampilkan.' : '';
    setBusy(true); setError('');
    try {
      const body = { format: 'insights' };
      if (period.from) body.from = period.from;
      if (period.to) body.to = period.to;
      if (platforms !== null) body.platforms = platforms;
      const made = await api.post(summaryPath(topicId), body);
      setState(current => ({ ...current, summaries: { ...(current?.summaries || {}), insights: made } }));
    } catch (failure) {
      setError(failure.status === 503 ? 'AI Insights belum tersedia di instalasi ini.'
        : failure.status === 409 ? 'Belum ada posting pada periode dan platform ini. Ubah pilihan di bilah project, lalu coba lagi.'
        : failure.status === 404 ? 'Project tidak ditemukan.'
        : failure.status ? `Insight belum berhasil ditulis.${kept} Coba lagi.`
        : `Tidak dapat terhubung ke server PULSE.${kept}`);
    } finally { setBusy(false); }
  }
  return <InsightsView topicId={topicId} projectName={topics.topics.find(topic => topic.id === topicId)?.label || ''} period={period} platforms={platforms}
    state={state} busy={busy} error={error} onMake={make} onRetry={() => { setState(null); setAttempt(value => value + 1); }} chart={chart} />;
}

/** AI Insights for the project, period and platforms chosen in the project bar (`/pulse/insights`).
 * The latest insight of a project is stored, so opening the page never asks the AI to write; only the button does.
 * @param {{chart?: import('react').ReactNode}} props `chart` fills the `.ain-chart` slot under the period card; nothing is drawn while it is null. */
export default function AiInsights({ chart = null }) {
  const [params] = useSearchParams();
  const topicId = params.get('topic') || '';
  // A key per project: stored state, a pending request and an error never carry over to another project.
  return <ProjectInsights key={topicId} topicId={topicId} chart={chart} />;
}

import React, { useState } from 'react';
import { Layers, ThumbsUp, ThumbsDown, Minus, Clock, Calendar, Flame, Eye, History } from 'lucide-react';
import { useIssues } from '../../../hooks/usePulse';
import { PlatformIcon } from './PlatformIcon';
import TopicManager from './TopicManager';
import IssueCard from './IssueCard';

const PLATFORMS = [
  { key: 'all', label: 'Semua' },
  { key: 'news', label: 'Berita' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'x', label: 'X' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'web', label: 'Web' },
];

const SENTIMENTS = [
  { key: 'all', label: 'Semua', Icon: Layers },
  { key: 'pos', label: 'Positif', Icon: ThumbsUp },
  { key: 'neg', label: 'Negatif', Icon: ThumbsDown },
  { key: 'netral', label: 'Netral', Icon: Minus },
];

function matchesSentiment(issue, filter) {
  if (filter === 'all') return true;
  const s = issue.sentiment;
  if (s === null || s === undefined) return false;
  if (filter === 'pos') return s > 0.2;
  if (filter === 'neg') return s < -0.2;
  return s >= -0.2 && s <= 0.2; // netral
}

function matchesPlatform(issue, platform) {
  if (platform === 'all') return true;
  if (Array.isArray(issue.platforms)) return issue.platforms.includes(platform);
  if (issue.source_items) return issue.source_items.some((s) => s.platform === platform);
  return true;
}

const SORTS = [
  { key: 'score', label: 'Skor', Icon: Flame },
  { key: 'reach', label: 'Reach', Icon: Eye },
  { key: 'recent', label: 'Terbaru', Icon: History },
];

const RANGES = [
  { key: 'all', label: 'Semua' },
  { key: '1', label: 'Hari ini' },
  { key: '3', label: '3 hari' },
  { key: '7', label: '7 hari' },
  { key: '30', label: '30 hari' },
  { key: 'custom', label: 'Kustom' },
];

function withinRange(iso, preset, from, to) {
  if (preset === 'all') return true;
  const t = new Date(iso || 0).getTime();
  if (Number.isNaN(t)) return false;
  if (preset === 'custom') {
    const lo = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const hi = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    return t >= lo && t <= hi;
  }
  return t >= Date.now() - Number(preset) * 86400000;
}

function sortIssues(list, sortBy) {
  const arr = [...list];
  if (sortBy === 'reach') return arr.sort((a, b) => (b.reach_total || 0) - (a.reach_total || 0));
  if (sortBy === 'recent') {
    return arr.sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0));
  }
  return arr.sort((a, b) => (b.score || 0) - (a.score || 0));
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? 'bg-[#1B4332] text-white' : 'bg-white text-[#6B6555] hover:bg-[#EDEBE3]'
      }`}
    >
      {children}
    </button>
  );
}

export default function PulseDashboard() {
  const [topicId, setTopicId] = useState(null);
  const [platform, setPlatform] = useState('all');
  const [sentiment, setSentiment] = useState('all');
  const [dateMode, setDateMode] = useState('relative'); // 'relative' | 'absolute'
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'reach' | 'recent'
  const [range, setRange] = useState('all'); // 'all' | '1' | '3' | '7' | '30' | 'custom'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { issues, loading } = useIssues({ topicId });

  const filtered = sortIssues(
    issues.filter(
      (i) =>
        matchesSentiment(i, sentiment) &&
        matchesPlatform(i, platform) &&
        withinRange(i.last_seen_at, range, from, to)
    ),
    sortBy
  );

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-black text-[#1B4332]">Pulse — Top Isu Hari Ini</h1>
        <p className="text-sm text-[#6B6555]">Pantau apa yang sedang dibicarakan dari sumber publik.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <TopicManager onSelectTopic={setTopicId} selectedTopicId={topicId} />

        <section className="space-y-3">
          {/* Filter bar */}
          <div className="space-y-2 rounded-2xl bg-white/60 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Platform</span>
              {PLATFORMS.map((p) => (
                <Chip key={p.key} active={platform === p.key} onClick={() => setPlatform(p.key)}>
                  {p.key === 'all' ? <Layers size={12} /> : <PlatformIcon platform={p.key} size={12} className={platform === p.key ? 'text-white' : ''} />}
                  {p.label}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Sentimen</span>
              {SENTIMENTS.map(({ key, label, Icon }) => (
                <Chip key={key} active={sentiment === key} onClick={() => setSentiment(key)}>
                  <Icon size={12} />
                  {label}
                </Chip>
              ))}
              {/* Date format toggle */}
              <button
                onClick={() => setDateMode((m) => (m === 'relative' ? 'absolute' : 'relative'))}
                title={dateMode === 'relative' ? 'Tampilkan tanggal lengkap' : 'Tampilkan waktu relatif'}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6B6555] transition hover:bg-[#EDEBE3]"
              >
                {dateMode === 'relative' ? <Clock size={12} /> : <Calendar size={12} />}
                {dateMode === 'relative' ? 'Relatif' : 'Tanggal'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Urutkan</span>
              {SORTS.map(({ key, label, Icon }) => (
                <Chip key={key} active={sortBy === key} onClick={() => setSortBy(key)}>
                  <Icon size={12} />
                  {label}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Rentang</span>
              {RANGES.map((r) => (
                <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>
                  {r.key === 'custom' ? <Calendar size={12} /> : null}
                  {r.label}
                </Chip>
              ))}
              {range === 'custom' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-xs text-[#6B6555]">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="bg-transparent text-xs outline-none"
                    aria-label="Dari tanggal"
                  />
                  <span className="text-[#9A9486]">–</span>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="bg-transparent text-xs outline-none"
                    aria-label="Sampai tanggal"
                  />
                </span>
              )}
            </div>
          </div>

          {loading && <div className="text-sm text-[#6B6555]">Memuat isu…</div>}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#6B6555] shadow-sm">
              {issues.length === 0
                ? 'Belum ada isu. Tambahkan watch topic lalu klik ↻ untuk crawl.'
                : 'Tidak ada isu yang cocok dengan filter ini.'}
            </div>
          )}
          {filtered.map((issue) => (
            <IssueCard key={issue.id} issue={issue} platformFilter={platform} dateMode={dateMode} />
          ))}
        </section>
      </div>
    </div>
  );
}

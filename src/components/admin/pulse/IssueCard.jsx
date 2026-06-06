import React, { useState } from 'react';
import { fetchIssueDetail } from '../../../hooks/usePulse';

function sentimentBadge(s) {
  if (s === null || s === undefined) return { label: 'n/a', cls: 'bg-gray-100 text-gray-500' };
  if (s > 0.2) return { label: 'positif', cls: 'bg-green-100 text-green-700' };
  if (s < -0.2) return { label: 'negatif', cls: 'bg-red-100 text-red-700' };
  return { label: 'netral', cls: 'bg-yellow-100 text-yellow-700' };
}

// Per-platform chip styling for the source list.
const PLATFORM = {
  news:      { label: 'Berita',    cls: 'bg-slate-100 text-slate-700' },
  instagram: { label: 'Instagram', cls: 'bg-pink-100 text-pink-700' },
  tiktok:    { label: 'TikTok',    cls: 'bg-gray-900 text-white' },
  x:         { label: 'X',         cls: 'bg-gray-900 text-white' },
  youtube:   { label: 'YouTube',   cls: 'bg-red-100 text-red-700' },
  facebook:  { label: 'Facebook',  cls: 'bg-blue-100 text-blue-700' },
  web:       { label: 'Web',       cls: 'bg-amber-100 text-amber-700' },
};

function platformMeta(p) {
  return PLATFORM[p] || { label: p || 'lainnya', cls: 'bg-gray-100 text-gray-600' };
}

function domain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}j`;
  return `${Math.round(hrs / 24)}h`;
}

export default function IssueCard({ issue }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      setLoading(true);
      try {
        setDetail(await fetchIssueDetail(issue.id));
      } catch {
        setDetail({ source_items: [] });
      } finally {
        setLoading(false);
      }
    }
  };

  const badge = sentimentBadge(issue.sentiment);
  const sources = detail?.source_items || [];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <button onClick={toggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <div className="font-semibold text-[#2B2B2B]">{issue.title || '(tanpa judul)'}</div>
          {issue.summary && <div className="mt-1 text-xs text-[#6B6555]">{issue.summary}</div>}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#6B6555]">
            <span>{issue.item_count} post</span>
            <span>·</span>
            <span>skor {Number(issue.score).toFixed(1)}</span>
            <span className={`rounded-full px-2 py-0.5 ${badge.cls}`}>{badge.label}</span>
          </div>
        </div>
        <span className="text-[#6B6555]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-3 border-t border-[#EDEBE3] pt-3">
          {loading && <div className="text-xs text-[#6B6555]">Memuat sumber…</div>}

          {!loading && detail && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">
                  Sumber ({sources.length})
                </span>
              </div>

              <ul className="space-y-1.5">
                {sources.map((s) => {
                  const meta = platformMeta(s.platform);
                  const dom = domain(s.url);
                  const ago = timeAgo(s.published_at);
                  return (
                    <li key={s.id}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-2 rounded-lg px-2 py-2 transition hover:bg-[#F5F3EE]"
                      >
                        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                          {meta.label}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-[#2B2B2B] group-hover:text-[#1B4332] group-hover:underline">
                            {s.title || s.url}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#9A9486]">
                            <span className="truncate">{s.author || dom || '—'}</span>
                            {dom && s.author && <span>·</span>}
                            {dom && s.author && <span className="truncate">{dom}</span>}
                            {ago && <span>·</span>}
                            {ago && <span className="shrink-0">{ago}</span>}
                          </span>
                        </span>
                        <span className="mt-0.5 shrink-0 text-[#C7C2B6] group-hover:text-[#2D6A4F]">↗</span>
                      </a>
                    </li>
                  );
                })}
                {sources.length === 0 && (
                  <li className="px-2 py-2 text-xs text-[#9A9486]">Belum ada sumber.</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { fetchIssueDetail } from '../../../hooks/usePulse';

function sentimentBadge(s) {
  if (s === null || s === undefined) return { label: 'n/a', cls: 'bg-gray-100 text-gray-500' };
  if (s > 0.2) return { label: 'positif', cls: 'bg-green-100 text-green-700' };
  if (s < -0.2) return { label: 'negatif', cls: 'bg-red-100 text-red-700' };
  return { label: 'netral', cls: 'bg-yellow-100 text-yellow-700' };
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
          {detail && (
            <ul className="space-y-2">
              {(detail.source_items || []).map((s) => (
                <li key={s.id} className="text-xs">
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-[#2D6A4F] hover:underline">
                    {s.title || s.url}
                  </a>
                  <span className="ml-2 text-[#9A9486]">{s.platform} · {s.author || '—'}</span>
                </li>
              ))}
              {detail.source_items && detail.source_items.length === 0 && (
                <li className="text-xs text-[#9A9486]">Belum ada sumber.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

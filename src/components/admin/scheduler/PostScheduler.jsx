import React, { useState } from 'react';
import { Send, Trash2, CalendarClock } from 'lucide-react';
import { usePosts, useAccounts } from '../../../hooks/useScheduler';
import { PlatformIcon, PLATFORM_LABEL } from '../pulse/PlatformIcon';

const PLATFORMS = ['instagram', 'tiktok', 'x', 'youtube', 'facebook', 'web'];

function StatusChip({ status }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        Terbit
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        Gagal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      Terjadwal
    </span>
  );
}

function PlatformToggle({ platform, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(platform)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        selected
          ? 'bg-[#1B4332] text-white'
          : 'bg-white border border-gray-200 text-[#6B6555] hover:bg-[#EDEBE3]'
      }`}
    >
      <PlatformIcon
        platform={platform}
        size={14}
        className={selected ? 'text-white' : undefined}
      />
      {PLATFORM_LABEL[platform] || platform}
    </button>
  );
}

export default function PostScheduler() {
  const { posts, loading, createPost, deletePost, publishPost } = usePosts();
  useAccounts(); // preload accounts context

  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function togglePlatform(p) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!caption.trim() || selectedPlatforms.length === 0) return;
    setSubmitting(true);
    try {
      await createPost({
        caption: caption.trim(),
        platforms: selectedPlatforms,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setCaption('');
      setSelectedPlatforms([]);
      setScheduledAt('');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = caption.trim().length > 0 && selectedPlatforms.length > 0 && !submitting;

  return (
    <div className="space-y-5">
      {/* Create card */}
      <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#1B4332]">Buat Posting Baru</h2>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Tulis caption posting di sini…"
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2.5 text-sm text-[#2B2B2B] placeholder-[#9A9486] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition"
        />

        {/* Platform multi-select */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Platform</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <PlatformToggle
                key={p}
                platform={p}
                selected={selectedPlatforms.includes(p)}
                onToggle={togglePlatform}
              />
            ))}
          </div>
        </div>

        {/* Schedule time */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">
            Waktu Tayang <span className="font-normal normal-case">(opsional)</span>
          </p>
          <div className="flex items-center gap-2">
            <CalendarClock size={15} className="text-[#9A9486] shrink-0" />
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={13} />
          {submitting ? 'Menjadwalkan…' : 'Jadwalkan'}
        </button>
      </form>

      {/* Posts list */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#1B4332]">Daftar Posting</h2>

        {loading && (
          <div className="text-sm text-[#6B6555]">Memuat posting…</div>
        )}

        {!loading && posts.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#6B6555] shadow-sm">
            Belum ada posting. Buat posting pertama di atas.
          </div>
        )}

        {posts.map((post) => (
          <div key={post.id} className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
            {/* Caption */}
            <p className="text-sm text-[#2B2B2B] line-clamp-2 leading-snug">{post.caption}</p>

            {/* Platforms + status row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                {post.platforms.map((p) => (
                  <PlatformIcon key={p} platform={p} size={15} />
                ))}
              </div>
              <StatusChip status={post.status} />
              {post.scheduled_at && (
                <span className="flex items-center gap-1 text-xs text-[#9A9486]">
                  <CalendarClock size={12} />
                  {new Date(post.scheduled_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
              {post.status === 'scheduled' && (
                <button
                  onClick={() => publishPost(post.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1B4332] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#2D6A4F]"
                >
                  <Send size={12} />
                  Publish sekarang
                </button>
              )}
              <button
                onClick={() => deletePost(post.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={12} />
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

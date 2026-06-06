import React, { useState } from 'react';
import {
  ExternalLink,
  Users,
  Trash2,
  PlusCircle,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { useRallies, suggestTalkingPoints } from '../../../hooks/useRally';
import { useAccounts } from '../../../hooks/useScheduler';
import { PlatformIcon } from '../pulse/PlatformIcon';

/* ─── Create form ─────────────────────────────────────────────── */
function CreateRallyForm({ onCreate }) {
  const { accounts } = useAccounts();
  const [title, setTitle] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [talkingPoints, setTalkingPoints] = useState('');
  const [targetIds, setTargetIds] = useState([]); // selected account ids; empty = semua
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const canSubmit = title.trim() !== '' && postUrl.trim() !== '';

  const toggleTarget = (id) =>
    setTargetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const targetLabel =
    targetIds.length === 0
      ? 'Semua outlet'
      : accounts.filter((a) => targetIds.includes(a.id)).map((a) => a.label).join(', ');

  async function suggest() {
    if (!title.trim()) return;
    setSuggesting(true);
    try {
      setTalkingPoints(await suggestTalkingPoints(title.trim()));
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), post_url: postUrl.trim(), talking_points: talkingPoints.trim(), target: targetLabel });
      setTitle('');
      setPostUrl('');
      setTalkingPoints('');
      setTargetIds([]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-2xl bg-white shadow-sm p-5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#1B4332]">Create Actions</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Judul */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[#6B6555]">Judul</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Dukung post hari jadi brand"
            className="w-full rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
          />
        </div>

        {/* URL Post */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[#6B6555]">
            URL Post <span className="font-normal text-[#9A9486]">(post resmi brand-mu)</span>
          </label>
          <input
            type="url"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://instagram.com/p/..."
            className="w-full rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
          />
        </div>

        {/* Poin Arahan + AI suggest (positif) */}
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#6B6555]">
              Poin Arahan <span className="font-normal text-[#9A9486]">(opsional, positif)</span>
            </label>
            <button
              type="button"
              onClick={suggest}
              disabled={!title.trim() || suggesting}
              className="inline-flex items-center gap-1 rounded-full bg-[#1B4332]/8 px-2.5 py-1 text-[11px] font-semibold text-[#2D6A4F] transition hover:bg-[#1B4332]/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles size={12} /> {suggesting ? 'Membuat…' : 'Saran poin (AI)'}
            </button>
          </div>
          <textarea
            value={talkingPoints}
            onChange={(e) => setTalkingPoints(e.target.value)}
            rows={3}
            placeholder="Contoh: Sebutkan kegiatan yang paling kamu sukai…"
            className="w-full resize-none rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
          />
          <p className="mt-1 text-[11px] text-[#9A9486]">Saran positif. Tiap outlet menulis ulang dengan kalimatnya sendiri (sukarela).</p>
        </div>

        {/* Target: pilih dari akun di Scheduler */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-[#6B6555]">
            Target <span className="font-normal text-[#9A9486]">(pilih akun, kosong = semua outlet)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {accounts.map((a) => {
              const on = targetIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleTarget(a.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${on ? 'bg-[#1B4332] text-white' : 'bg-[#F5F3EE] text-[#6B6555] hover:bg-[#EDEBE3]'}`}
                >
                  <PlatformIcon platform={a.platform} size={12} className={on ? 'text-white' : ''} />
                  {a.label}
                </button>
              );
            })}
            {accounts.length === 0 && (
              <span className="text-[11px] text-[#9A9486]">Belum ada akun. Tambah di Scheduler → Akun.</span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-[#9A9486]">{targetLabel}</p>
        </div>

        {/* Submit */}
        <div className="sm:col-span-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusCircle size={14} />
            {saving ? 'Menyimpan…' : 'Create Action'}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ─── Rally card ──────────────────────────────────────────────── */
function RallyCard({ rally, onDelete }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        {/* Left: info */}
        <div className="min-w-0 flex-1">
          {/* Title + target chip */}
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#1B4332] leading-tight">{rally.title}</span>
            <span className="rounded-full bg-[#1B4332]/8 px-3 py-1 text-xs font-medium text-[#2D6A4F]">
              {rally.target}
            </span>
          </div>

          {/* Post URL */}
          <a
            href={rally.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 inline-flex items-center gap-1 text-xs text-[#D4A843] hover:underline font-medium truncate max-w-full"
          >
            <ExternalLink size={11} className="shrink-0" />
            <span className="truncate">{rally.post_url}</span>
          </a>

          {/* Talking points */}
          {rally.talking_points && (
            <p className="mb-2 text-xs text-[#6B6555] leading-relaxed line-clamp-2">{rally.talking_points}</p>
          )}

          {/* Progress */}
          <div className="flex items-center gap-1.5 text-xs text-[#9A9486]">
            <Users size={13} className="text-[#2D6A4F]" />
            <span>{rally.ack_count ?? 0} merespons</span>
          </div>
        </div>

        {/* Right: delete */}
        <button
          onClick={() => {
            if (window.confirm(`Hapus ajakan "${rally.title}"?`)) onDelete(rally.id);
          }}
          title="Hapus ajakan"
          className="shrink-0 rounded-full p-1.5 text-[#9A9486] transition hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
      <Megaphone size={40} className="mx-auto mb-3 text-[#9A9486]" />
      <p className="mb-1 text-sm font-semibold text-[#1B4332]">Belum ada ajakan aktif</p>
      <p className="text-xs text-[#6B6555]">Buat ajakan di atas agar outlet bisa ikut meramaikan post resmi.</p>
    </div>
  );
}

/* ─── Main module ─────────────────────────────────────────────── */
export default function RallyModule() {
  const { rallies, loading, createRally, deleteRally } = useRallies();

  return (
    <div>
      {/* Header */}
      <header className="mb-5">
        <h1 className="text-xl font-black text-[#1B4332]">Rally · Engagement</h1>
      </header>

      {/* Create form */}
      <CreateRallyForm onCreate={createRally} />

      {/* List */}
      {loading ? (
        <div className="text-sm text-[#6B6555]">Memuat ajakan…</div>
      ) : rallies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {rallies.map((rally) => (
            <RallyCard key={rally.id} rally={rally} onDelete={deleteRally} />
          ))}
        </div>
      )}
    </div>
  );
}

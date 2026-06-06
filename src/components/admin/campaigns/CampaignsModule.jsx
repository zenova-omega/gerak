import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  Sparkles,
  Send,
  Megaphone,
  ChevronRight,
  PlusCircle,
  Trash2,
  Save,
  Flag,
} from 'lucide-react';
import { useCampaigns } from '../../../hooks/useCampaigns';

/* ─── Pipeline stage config ──────────────────────────────────────── */
const STAGES = [
  { key: 'listen',     label: 'Listen',     module: 'Pulse',     to: '/command-center/pulse',     icon: Radio },
  { key: 'create',     label: 'Create',     module: 'Studio',    to: '/command-center/studio',    icon: Sparkles },
  { key: 'distribute', label: 'Distribute', module: 'Scheduler', to: '/command-center/scheduler', icon: Send },
  { key: 'engage',     label: 'Engage',     module: 'Rally',     to: '/command-center/rally',     icon: Megaphone },
];

/* ─── Status chip ────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const map = {
    draft:  'bg-gray-100 text-gray-600',
    active: 'bg-[#1B4332]/10 text-[#2D6A4F]',
    done:   'bg-amber-100 text-amber-700',
  };
  const labels = { draft: 'Draft', active: 'Aktif', done: 'Selesai' };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[status] || map.draft}`}>
      {labels[status] || status}
    </span>
  );
}

/* ─── Create campaign inline form ────────────────────────────────── */
function CreateForm({ onCreate }) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), objective: objective.trim() });
      setName('');
      setObjective('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-2xl border border-dashed border-[#2D6A4F]/30 bg-[#F5F3EE] p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#2D6A4F]">Kampanye baru</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nama kampanye…"
        className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2B2B2B] placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
      />
      <input
        type="text"
        value={objective}
        onChange={(e) => setObjective(e.target.value)}
        placeholder="Tujuan kampanye… (opsional)"
        className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2B2B2B] placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
      />
      <button
        type="submit"
        disabled={!name.trim() || saving}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#1B4332] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlusCircle size={13} />
        {saving ? 'Membuat…' : 'Buat'}
      </button>
    </form>
  );
}

/* ─── Pipeline board ─────────────────────────────────────────────── */
function PipelineBoard({ pipeline, onChange }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        return (
          <React.Fragment key={stage.key}>
            <div className="flex min-w-[160px] flex-1 flex-col rounded-2xl bg-white p-4 shadow-sm">
              {/* Stage header */}
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1B4332]/8">
                  <Icon size={14} className="text-[#2D6A4F]" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#1B4332]">{stage.label}</p>
                  <Link
                    to={stage.to}
                    className="text-[10px] font-semibold text-[#D4A843] hover:underline"
                  >
                    Buka {stage.module} →
                  </Link>
                </div>
              </div>

              {/* Note textarea */}
              <textarea
                value={pipeline[stage.key] || ''}
                onChange={(e) => onChange(stage.key, e.target.value)}
                rows={3}
                placeholder={`Catatan ${stage.label}…`}
                className="mt-auto w-full resize-none rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-xs text-[#2B2B2B] placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
              />
            </div>

            {/* Connector arrow between stages */}
            {idx < STAGES.length - 1 && (
              <div className="flex shrink-0 items-center self-center text-[#2D6A4F]/30">
                <ChevronRight size={20} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Campaign detail panel ──────────────────────────────────────── */
function CampaignDetail({ campaign, onUpdate, onDelete }) {
  const [status, setStatus]     = useState(campaign.status);
  const [objective, setObj]     = useState(campaign.objective || '');
  const [pipeline, setPipeline] = useState({ ...campaign.pipeline });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset local state when selected campaign changes
  useEffect(() => {
    setStatus(campaign.status);
    setObj(campaign.objective || '');
    setPipeline({ ...campaign.pipeline });
  }, [campaign.id]);

  function handlePipelineChange(key, value) {
    setPipeline((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(campaign.id, { status, objective, pipeline });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Hapus kampanye "${campaign.name}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(campaign.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* Campaign name + status row */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#1B4332]">{campaign.name}</h2>
          {objective && <p className="mt-0.5 text-sm text-[#6B6555]">{objective}</p>}
        </div>
        <StatusChip status={status} />
      </div>

      {/* Edit panel */}
      <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#1B4332]">Detail</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Objective */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#6B6555]">Tujuan</label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObj(e.target.value)}
              placeholder="Tujuan kampanye…"
              className="w-full rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6B6555]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
            >
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="done">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pipeline board */}
      <div className="mb-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#1B4332]">
          Pipeline · Listen → Create → Distribute → Engage
        </p>
        <PipelineBoard pipeline={pipeline} onChange={handlePipelineChange} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1B4332] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={13} />
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={13} />
          {deleting ? 'Menghapus…' : 'Hapus'}
        </button>
      </div>
    </div>
  );
}

/* ─── Empty selection state ──────────────────────────────────────── */
function EmptySelection() {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl bg-white p-12 text-center shadow-sm">
      <Flag size={40} className="mx-auto mb-3 text-[#9A9486]" />
      <p className="mb-1 text-sm font-semibold text-[#1B4332]">Pilih kampanye</p>
      <p className="text-xs text-[#6B6555]">Klik kampanye di kiri atau buat yang baru untuk mulai.</p>
    </div>
  );
}

/* ─── Main module ────────────────────────────────────────────────── */
export default function CampaignsModule() {
  const { campaigns, loading, createCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  const [selectedId, setSelectedId] = useState(null);

  // Auto-select first campaign when list loads
  useEffect(() => {
    if (!selectedId && campaigns.length > 0) {
      setSelectedId(campaigns[0].id);
    }
  }, [campaigns]);

  const selected = campaigns.find((c) => c.id === selectedId) || null;

  async function handleDelete(id) {
    await deleteCampaign(id);
    setSelectedId(null);
  }

  return (
    <div>
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-black text-[#1B4332]">Campaigns · Orkestrasi</h1>
        <p className="text-sm text-[#6B6555]">
          Satukan listening, konten, distribusi, dan engagement dalam satu kampanye.
        </p>
      </header>

      <div className="flex gap-5">
        {/* Left: campaign list */}
        <div className="w-64 shrink-0">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#6B6555]">Kampanye</p>

          {loading ? (
            <div className="text-sm text-[#6B6555]">Memuat…</div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-2xl p-3 text-left transition ${
                    c.id === selectedId
                      ? 'bg-[#1B4332] text-white shadow-sm'
                      : 'bg-white text-[#2B2B2B] shadow-sm hover:bg-[#EDEBE3]'
                  }`}
                >
                  <p className={`text-sm font-semibold leading-tight ${c.id === selectedId ? 'text-white' : 'text-[#1B4332]'}`}>
                    {c.name}
                  </p>
                  <div className="mt-1">
                    <StatusChip status={c.status} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Create form */}
          <CreateForm onCreate={createCampaign} />
        </div>

        {/* Right: detail panel */}
        <div className="min-w-0 flex-1">
          {selected ? (
            <CampaignDetail
              key={selected.id}
              campaign={selected}
              onUpdate={updateCampaign}
              onDelete={handleDelete}
            />
          ) : (
            <EmptySelection />
          )}
        </div>
      </div>
    </div>
  );
}

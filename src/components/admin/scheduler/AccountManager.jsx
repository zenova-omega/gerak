import React, { useState } from 'react';
import { X, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useAccounts } from '../../../hooks/useScheduler';
import { PlatformIcon, PLATFORM_LABEL } from '../pulse/PlatformIcon';

const PLATFORM_OPTIONS = ['instagram', 'tiktok', 'x', 'youtube', 'facebook', 'web'];

export default function AccountManager() {
  const { accounts, loading, addAccount, removeAccount } = useAccounts();

  const [label, setLabel] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = label.trim().length > 0 && handle.trim().length > 0 && !submitting;

  async function handleAdd(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addAccount({ label: label.trim(), platform, handle: handle.trim() });
      setLabel('');
      setHandle('');
      setPlatform('instagram');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Account list */}
      <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-[#1B4332]">Akun Terhubung</h2>

        {loading && (
          <div className="text-sm text-[#6B6555]">Memuat akun…</div>
        )}

        {!loading && accounts.length === 0 && (
          <p className="text-sm text-[#9A9486]">Belum ada akun terhubung.</p>
        )}

        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#F5F3EE] px-4 py-3"
            >
              <PlatformIcon platform={account.platform} size={16} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#2B2B2B] truncate">{account.label}</div>
                <div className="text-xs text-[#9A9486] truncate">{account.handle}</div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700 shrink-0">
                <CheckCircle2 size={11} />
                Terhubung
              </span>
              <button
                onClick={() => removeAccount(account.id)}
                className="ml-1 rounded-full p-1 text-[#9A9486] transition hover:bg-red-50 hover:text-red-500"
                aria-label={`Hapus akun ${account.label}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Add account form */}
      <form onSubmit={handleAdd} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#1B4332]">Hubungkan Akun Baru</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="cth. Brand Pusat"
              className="w-full rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder-[#9A9486] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition"
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p] || p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">
              Handle / Username
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="cth. @brand.resmi"
              className="w-full rounded-xl border border-gray-200 bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder-[#9A9486] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusCircle size={13} />
            {submitting ? 'Menghubungkan…' : 'Hubungkan'}
          </button>
          <p className="text-[11px] text-[#9A9486]">
            Demo: hubungkan akun resmi via OAuth pada integrasi nyata.
          </p>
        </div>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Minus, Sparkles, Copy, BookmarkPlus } from 'lucide-react';
import { useCaptions, useDrafts } from '../../../hooks/useStudio';

const TONES = [
  { key: 'positif', label: 'Positif', Icon: ThumbsUp },
  { key: 'negatif', label: 'Negatif', Icon: ThumbsDown },
  { key: 'netral', label: 'Netral', Icon: Minus },
  { key: 'custom', label: 'Custom', Icon: Sparkles },
];

const COUNTS = [2, 4, 6];

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

export default function CaptionStudio() {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('positif');
  const [custom, setCustom] = useState('');
  const [n, setN] = useState(4);
  const [copied, setCopied] = useState(null);
  const [saved, setSaved] = useState(new Set());

  const { variants, loading, generate } = useCaptions();
  const { saveDraft } = useDrafts();

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    await generate({ prompt, tone, n, custom: tone === 'custom' ? custom : undefined });
  }

  async function handleCopy(text, idx) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback for environments without clipboard API
    }
    setCopied(idx);
    setTimeout(() => setCopied(null), 1800);
  }

  async function handleSave(variant, idx) {
    await saveDraft({ kind: 'caption', prompt, tone, payload: { variant } });
    setSaved((prev) => new Set([...prev, idx]));
    setTimeout(() => setSaved((prev) => { const s = new Set(prev); s.delete(idx); return s; }), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="mb-1.5 block text-xs font-semibold text-[#1B4332]">Topik / Brief</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Topik atau brief, mis. 'Bakti sosial TNI AD di Jakarta'"
          className="w-full resize-none rounded-xl border border-[#E8E4DA] bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder-[#9A9486] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]"
        />
      </div>

      {/* Tone & count controls */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Tone</span>
          {TONES.map(({ key, label, Icon }) => (
            <Chip key={key} active={tone === key} onClick={() => setTone(key)}>
              <Icon size={12} />
              {label}
            </Chip>
          ))}
        </div>

        {tone === 'custom' && (
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Instruksi tone kustom, mis. 'persuasif dan inspiratif'"
            className="w-full rounded-xl border border-[#E8E4DA] bg-[#F5F3EE] px-3 py-1.5 text-xs text-[#2B2B2B] placeholder-[#9A9486] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]"
          />
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Jumlah</span>
          {COUNTS.map((c) => (
            <Chip key={c} active={n === c} onClick={() => setN(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1B4332] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={15} />
        {loading ? 'Membuat…' : 'Generate'}
      </button>

      {/* Results */}
      {variants.length === 0 && !loading && (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#9A9486] shadow-sm">
          Masukkan topik dan pilih tone, lalu klik Generate untuk membuat caption.
        </div>
      )}

      {variants.length > 0 && (
        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={idx} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm leading-relaxed text-[#2B2B2B]">{v}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(v, idx)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    copied === idx
                      ? 'bg-[#D4A843] text-white'
                      : 'bg-[#F5F3EE] text-[#6B6555] hover:bg-[#EDEBE3]'
                  }`}
                >
                  <Copy size={11} />
                  {copied === idx ? 'Tersalin!' : 'Salin'}
                </button>
                <button
                  onClick={() => handleSave(v, idx)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    saved.has(idx)
                      ? 'bg-[#2D6A4F] text-white'
                      : 'bg-[#F5F3EE] text-[#6B6555] hover:bg-[#EDEBE3]'
                  }`}
                >
                  <BookmarkPlus size={11} />
                  {saved.has(idx) ? 'Tersimpan!' : 'Simpan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

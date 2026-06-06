import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Download, BookmarkPlus } from 'lucide-react';
import { useMeme, useDrafts } from '../../../hooks/useStudio';

const CANVAS_SIZE = 480;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawMeme(canvas, topText, bottomText) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = CANVAS_SIZE;
  const H = CANVAS_SIZE;

  // Diagonal green → gold gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1B4332');
  grad.addColorStop(1, '#D4A843');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Text style — classic meme
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.fillStyle = '#fff';

  const padding = 20;
  const maxWidth = W - padding * 2;
  const lineHeight = 44;

  // Top text
  if (topText) {
    const upper = topText.toUpperCase();
    const lines = wrapText(ctx, upper, maxWidth);
    lines.forEach((line, i) => {
      const y = 50 + i * lineHeight;
      ctx.strokeText(line, W / 2, y);
      ctx.fillText(line, W / 2, y);
    });
  }

  // Bottom text
  if (bottomText) {
    const upper = bottomText.toUpperCase();
    const lines = wrapText(ctx, upper, maxWidth);
    const totalHeight = lines.length * lineHeight;
    const startY = H - totalHeight - padding + lineHeight * 0.5;
    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      ctx.strokeText(line, W / 2, y);
      ctx.fillText(line, W / 2, y);
    });
  }
}

export default function MemeStudio() {
  const [prompt, setPrompt] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [saved, setSaved] = useState(false);

  const canvasRef = useRef(null);
  const { meme, loading, generate } = useMeme();
  const { saveDraft } = useDrafts();

  // Sync editable fields when meme is generated
  useEffect(() => {
    if (meme) {
      setTopText(meme.top_text || '');
      setBottomText(meme.bottom_text || '');
    }
  }, [meme]);

  // Redraw canvas whenever texts change
  useEffect(() => {
    drawMeme(canvasRef.current, topText, bottomText);
  }, [topText, bottomText]);

  // Initial blank canvas draw
  useEffect(() => {
    drawMeme(canvasRef.current, '', '');
  }, []);

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    await generate({ prompt });
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sinar-meme.png';
    a.click();
  }

  async function handleSave() {
    await saveDraft({ kind: 'meme', prompt, payload: { top_text: topText, bottom_text: bottomText } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="mb-1.5 block text-xs font-semibold text-[#1B4332]">Deskripsi Meme</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="mis. 'TNI AD siap menjaga kedaulatan bangsa'"
            className="flex-1 rounded-xl border border-[#E8E4DA] bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder-[#9A9486] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={13} />
            {loading ? 'Membuat…' : 'Generate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
        {/* Text editors */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1B4332]">Top Text</label>
              <input
                type="text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="Teks bagian atas meme"
                className="w-full rounded-xl border border-[#E8E4DA] bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder-[#9A9486] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1B4332]">Bottom Text</label>
              <input
                type="text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="Teks bagian bawah meme"
                className="w-full rounded-xl border border-[#E8E4DA] bg-[#F5F3EE] px-3 py-2 text-sm text-[#2B2B2B] placeholder-[#9A9486] outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A843] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              >
                <Download size={13} />
                Unduh PNG
              </button>
              <button
                onClick={handleSave}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  saved ? 'bg-[#2D6A4F] text-white' : 'bg-[#F5F3EE] text-[#6B6555] hover:bg-[#EDEBE3]'
                }`}
              >
                <BookmarkPlus size={13} />
                {saved ? 'Tersimpan!' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>

        {/* Canvas preview */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Preview</p>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="rounded-2xl shadow-sm"
            style={{ width: 240, height: 240 }}
          />
        </div>
      </div>
    </div>
  );
}

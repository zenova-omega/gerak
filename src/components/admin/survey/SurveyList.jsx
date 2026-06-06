import React from 'react';
import { BarChart2, Edit2, Trash2, Send, PlusCircle } from 'lucide-react';

const STATUS_CHIP = {
  draft:   { label: 'Draft',   cls: 'bg-gray-100 text-gray-500' },
  open:    { label: 'Buka',    cls: 'bg-green-100 text-[#1B4332]' },
  closed:  { label: 'Tutup',   cls: 'bg-amber-100 text-amber-700' },
};

export default function SurveyList({ surveys, onCreate, onOpenResults, onEdit, onPublish, onDelete }) {
  if (surveys.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <BarChart2 size={40} className="mx-auto mb-3 text-[#9A9486]" />
        <p className="mb-1 text-sm font-semibold text-[#1B4332]">Belum ada survey</p>
        <p className="mb-4 text-xs text-[#6B6555]">Buat survey pertama untuk mulai mengumpulkan data dari anggota.</p>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2D6A4F]"
        >
          <PlusCircle size={14} />
          Buat survey pertama
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-[11px] font-bold uppercase tracking-widest text-[#9A9486]">
            <th className="px-4 py-3">Judul</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Responden</th>
            <th className="px-4 py-3 text-right">Pertanyaan</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {surveys.map((sv, i) => {
            const chip = STATUS_CHIP[sv.status] || STATUS_CHIP.draft;
            return (
              <tr
                key={sv.id}
                className={`border-b border-gray-50 transition hover:bg-[#F5F3EE] ${i === surveys.length - 1 ? 'border-b-0' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-[#1B4332] leading-tight">{sv.title}</div>
                  {sv.description && (
                    <div className="mt-0.5 text-[11px] text-[#9A9486] truncate max-w-xs">{sv.description}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${chip.cls}`}>
                    {chip.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#6B6555]">
                  {sv.response_count.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#6B6555]">
                  {sv.questions.length}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {sv.status === 'open' && (
                      <button
                        onClick={() => onOpenResults(sv.id)}
                        title="Lihat hasil"
                        className="inline-flex items-center gap-1 rounded-full bg-[#1B4332] px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#2D6A4F]"
                      >
                        <BarChart2 size={11} />
                        Hasil
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(sv)}
                      title="Edit survey"
                      className="rounded-full p-1.5 text-[#6B6555] transition hover:bg-[#EDEBE3] hover:text-[#1B4332]"
                    >
                      <Edit2 size={14} />
                    </button>
                    {sv.status === 'draft' && (
                      <button
                        onClick={() => onPublish(sv.id)}
                        title="Publikasikan survey"
                        className="inline-flex items-center gap-1 rounded-full border border-[#2D6A4F] px-3 py-1 text-[11px] font-semibold text-[#2D6A4F] transition hover:bg-[#2D6A4F] hover:text-white"
                      >
                        <Send size={11} />
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus survey "${sv.title}"?`)) onDelete(sv.id);
                      }}
                      title="Hapus survey"
                      className="rounded-full p-1.5 text-[#9A9486] transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

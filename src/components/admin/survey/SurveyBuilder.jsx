import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'single',   label: 'Pilihan tunggal' },
  { value: 'multiple', label: 'Pilihan ganda' },
  { value: 'rating',   label: 'Rating' },
  { value: 'yesno',    label: 'Ya / Tidak' },
  { value: 'text',     label: 'Teks bebas' },
];

function emptyQuestion() {
  return { _key: Math.random().toString(36).slice(2), type: 'single', text: '', options: ['', ''], rating_max: 5, required: true };
}

function QuestionEditor({ q, idx, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  function setField(field, val) { onChange({ ...q, [field]: val }); }

  function setOption(i, val) {
    const opts = [...q.options];
    opts[i] = val;
    setField('options', opts);
  }

  function addOption() { setField('options', [...(q.options || []), '']); }

  function removeOption(i) {
    const opts = q.options.filter((_, oi) => oi !== i);
    setField('options', opts);
  }

  const needsOptions = q.type === 'single' || q.type === 'multiple';

  return (
    <div className="rounded-2xl border border-gray-100 bg-[#F5F3EE] p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-col">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            title="Pindah ke atas"
            className="rounded p-0.5 text-[#9A9486] transition hover:bg-[#EDEBE3] hover:text-[#1B4332] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            title="Pindah ke bawah"
            className="rounded p-0.5 text-[#9A9486] transition hover:bg-[#EDEBE3] hover:text-[#1B4332] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#9A9486]">
          Pertanyaan {idx + 1}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[#6B6555]">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => setField('required', e.target.checked)}
              className="h-3 w-3 accent-[#1B4332]"
            />
            Wajib
          </label>
          <button
            onClick={onRemove}
            className="rounded-full p-1 text-[#9A9486] transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Type selector */}
      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Tipe</label>
        <div className="flex flex-wrap gap-1.5">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setField('type', t.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                q.type === t.value
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-white text-[#6B6555] hover:bg-[#EDEBE3]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question text */}
      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Teks pertanyaan</label>
        <input
          type="text"
          value={q.text}
          onChange={(e) => setField('text', e.target.value)}
          placeholder="Tulis pertanyaan di sini…"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2B2B2B] outline-none placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]"
        />
      </div>

      {/* Options — only for single / multiple */}
      {needsOptions && (
        <div className="mb-3">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Pilihan jawaban</label>
          <div className="space-y-1.5">
            {(q.options || []).map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(oi, e.target.value)}
                  placeholder={`Pilihan ${oi + 1}`}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#2B2B2B] outline-none placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]"
                />
                {(q.options || []).length > 2 && (
                  <button
                    onClick={() => removeOption(oi)}
                    className="rounded-full p-1 text-[#9A9486] transition hover:text-red-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addOption}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#2D6A4F] transition hover:text-[#1B4332]"
          >
            <Plus size={13} />
            Tambah pilihan
          </button>
        </div>
      )}

      {/* Rating max */}
      {q.type === 'rating' && (
        <div className="mb-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9A9486]">Skala maksimum</label>
          <select
            value={q.rating_max}
            onChange={(e) => setField('rating_max', Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#2B2B2B] outline-none focus:border-[#2D6A4F]"
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>1 – {n}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function SurveyBuilder({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [questions, setQuestions] = useState(
    initial?.questions?.length
      ? initial.questions.map((q) => ({ ...q, _key: q.id || Math.random().toString(36).slice(2) }))
      : [emptyQuestion()]
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);

  function updateQuestion(idx, q) {
    setQuestions((qs) => qs.map((old, i) => (i === idx ? q : old)));
  }

  function removeQuestion(idx) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  function moveQuestion(idx, direction) {
    setQuestions((qs) => {
      const next = [...qs];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return qs;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function validate() {
    const errs = {};
    if (!title.trim()) errs.title = 'Judul wajib diisi';
    if (questions.length === 0) errs.questions = 'Minimal satu pertanyaan';
    questions.forEach((q, i) => {
      if (!q.text.trim()) {
        errs[`q_${i}`] = `Pertanyaan ${i + 1}: teks belum diisi`;
      } else if ((q.type === 'single' || q.type === 'multiple')) {
        const nonEmpty = (q.options || []).filter((o) => o.trim());
        if (nonEmpty.length < 2) errs[`q_${i}`] = `Pertanyaan ${i + 1}: butuh minimal 2 pilihan yang tidak kosong`;
      } else if (q.type === 'rating' && (q.rating_max == null || q.rating_max < 2)) {
        errs[`q_${i}`] = `Pertanyaan ${i + 1}: skala rating minimal 2`;
      }
    });
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    setSaveError(null);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      questions: questions.map((q, i) => ({
        type: q.type,
        text: q.text.trim(),
        options: (q.type === 'single' || q.type === 'multiple') ? q.options.filter(Boolean) : null,
        rating_max: q.type === 'rating' ? q.rating_max : null,
        required: q.required,
        order: i,
      })),
    };
    try {
      await onSave(payload);
    } catch {
      setSaveError('Gagal menyimpan survey. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Title + description */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-[#9A9486]">Judul survey *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors((e2) => ({ ...e2, title: undefined })); }}
            placeholder="Nama survey…"
            className={`w-full rounded-xl border px-3 py-2 text-sm text-[#2B2B2B] outline-none placeholder:text-[#9A9486] focus:ring-1 focus:ring-[#2D6A4F] ${errors.title ? 'border-red-400' : 'border-gray-200 focus:border-[#2D6A4F]'}`}
          />
          {errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title}</p>}
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-[#9A9486]">Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opsional. Jelaskan tujuan survey ini…"
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#2B2B2B] outline-none placeholder:text-[#9A9486] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q._key}>
            <QuestionEditor
              q={q}
              idx={i}
              onChange={(updated) => updateQuestion(i, updated)}
              onRemove={() => removeQuestion(i)}
              onMoveUp={() => moveQuestion(i, -1)}
              onMoveDown={() => moveQuestion(i, 1)}
              isFirst={i === 0}
              isLast={i === questions.length - 1}
            />
            {errors[`q_${i}`] && (
              <p className="mt-1 text-[11px] text-red-500 pl-2">{errors[`q_${i}`]}</p>
            )}
          </div>
        ))}
        {errors.questions && (
          <p className="text-[11px] text-red-500">{errors.questions}</p>
        )}
      </div>

      {/* Add question */}
      <button
        onClick={addQuestion}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D4A843]/40 py-3 text-sm font-semibold text-[#D4A843] transition hover:border-[#D4A843] hover:bg-[#D4A843]/5"
      >
        <Plus size={16} />
        Tambah pertanyaan
      </button>

      {/* Save error banner */}
      {saveError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-sm font-medium text-red-600">{saveError}</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-1">
        <button
          onClick={onCancel}
          className="rounded-full px-5 py-2 text-sm font-semibold text-[#6B6555] transition hover:bg-[#EDEBE3]"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[#1B4332] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#2D6A4F] disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : 'Simpan survey'}
        </button>
      </div>
    </div>
  );
}

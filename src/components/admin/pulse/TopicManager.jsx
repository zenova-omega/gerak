import React, { useState } from 'react';
import { useTopics } from '../../../hooks/usePulse';

export default function TopicManager({ onSelectTopic, selectedTopicId }) {
  const { topics, createTopic, deleteTopic, crawlNow } = useTopics();
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim() || !query.trim()) return;
    setBusy(true);
    try {
      await createTopic({ label: label.trim(), query: query.trim() });
      setLabel('');
      setQuery('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-[#1B4332]">Watch Topics</h3>

      <form onSubmit={submit} className="mb-4 space-y-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (mis. Franchise X)"
          className="w-full rounded-lg border border-[#E5E1D8] px-3 py-2 text-sm"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kata kunci pencarian"
          className="w-full rounded-lg border border-[#E5E1D8] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#1B4332] py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Menyimpan…' : 'Tambah Topik'}
        </button>
      </form>

      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelectTopic(null)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!selectedTopicId ? 'bg-[#EDEBE3] font-semibold' : 'hover:bg-[#F5F3EE]'}`}
          >
            Semua isu
          </button>
        </li>
        {topics.map((t) => (
          <li key={t.id} className="group flex items-center gap-1">
            <button
              onClick={() => onSelectTopic(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-left text-sm ${selectedTopicId === t.id ? 'bg-[#EDEBE3] font-semibold' : 'hover:bg-[#F5F3EE]'}`}
            >
              {t.label}
            </button>
            <button
              onClick={() => crawlNow(t.id)}
              title="Crawl sekarang"
              className="rounded px-2 py-1 text-xs text-[#2D6A4F] hover:bg-[#F5F3EE]"
            >
              ↻
            </button>
            <button
              onClick={() => deleteTopic(t.id)}
              title="Hapus"
              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

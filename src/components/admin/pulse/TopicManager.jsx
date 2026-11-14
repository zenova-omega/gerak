import React, { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { allegationLabel, pulseError } from '../../../lib/pulseData';

export default function TopicManager({ resource, onSelectTopic, selectedTopicId, disabled, onChanged }) {
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!label.trim() || !query.trim()) return;
    setBusy(true);
    setError('');
    try {
      const topic = await resource.createTopic({ label: label.trim(), query: query.trim(), sources: ['rss'] });
      setLabel('');
      setQuery('');
      onSelectTopic(topic.id);
    } catch (err) { setError(pulseError(err)); }
    finally { setBusy(false); }
  };
  const remove = async (topic) => {
    if (!window.confirm('Hapus topik “' + topic.label + '”? Data terkait dapat ikut dihapus.')) return;
    setBusy(true);
    setError('');
    try {
      await resource.deleteTopic(topic.id);
      if (selectedTopicId === topic.id) onSelectTopic(null);
      await onChanged();
    } catch (err) { setError(pulseError(err)); }
    finally { setBusy(false); }
  };
  return (
    <aside className="pulse-topics">
      <div className="pulse-section-heading"><h2>Topik pantauan</h2><Search size={17} /></div>
      <p>Pilih cakupan analisis Anda.</p>
      <nav aria-label="Topik pantauan">
        <button className={'pulse-topic ' + (!selectedTopicId ? 'is-selected' : '')} aria-pressed={!selectedTopicId} disabled={busy || disabled} onClick={() => onSelectTopic(null)}>
          <span>Semua topik</span><span className="pulse-topic-count">{resource.topics.length}</span>
        </button>
        {resource.topics.map(topic => <div className="pulse-topic-row" key={topic.id}>
          <button className={'pulse-topic ' + (selectedTopicId === topic.id ? 'is-selected' : '')} disabled={busy || disabled} aria-pressed={selectedTopicId === topic.id} onClick={() => onSelectTopic(topic.id)}>
            <span>{allegationLabel(topic.label)}<small>{topic.query}</small></span>
          </button>
          <button className="pulse-icon-button" aria-label={'Hapus topik ' + topic.label} disabled={busy || disabled} onClick={() => remove(topic)}><Trash2 size={14} /></button>
        </div>)}
      </nav>
      {resource.loading && <p role="status">Memuat topik…</p>}
      {!resource.loading && !resource.error && !resource.topics.length && <p>Belum ada topik. Siapkan topik awal atau tambahkan sendiri.</p>}
      <details className="pulse-topic-form">
        <summary><Plus size={15} /> Tambah topik</summary>
        <form onSubmit={submit}>
          <label>Nama topik<input required maxLength={200} value={label} onChange={e => setLabel(e.target.value)} placeholder="Nama topik pantauan" /></label>
          <label>Kata kunci<input required value={query} onChange={e => setQuery(e.target.value)} placeholder="Kata kunci pencarian" /></label>
          <p>Sumber awal: RSS publik. Tidak memulai crawl.</p>
          <button className="pulse-button primary" disabled={busy || disabled}>{busy ? 'Menyimpan…' : 'Simpan topik'}</button>
        </form>
      </details>
      {error && <p className="pulse-inline-error" role="alert">{error}</p>}
      <div className="pulse-sidebar-note"><strong>Data, bukan asumsi.</strong><p>Hanya sumber yang berhasil dikumpulkan. Cakupan ini bukan keseluruhan percakapan publik.</p></div>
    </aside>
  );
}

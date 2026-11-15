import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../lib/api';
import { PulseButton } from '../components/ui/PulseUI';
import { PulseTag } from '../components/ui/PulseTag';
import { formatCount } from '../lib/pulseData';
import { splitKeywordTerms as split } from './keywordTerms';

const kinds = { variation: ['Variasi istilah', 'accent'], context: ['Konteks wajib', 'info'], exclude: ['Pengecualian', 'warning'] };
/** Suggests keywords for the current draft. Nothing is added until the analyst ticks terms and confirms.
 * `fields` is the current draft ({main, variations, required, excluded}); `onAdd` receives the confirmed
 * terms grouped by kind: {variation: [], context: [], exclude: []}. */
export default function SmartKeywords({ fields, topicId, onAdd }) {
  const [state, setState] = useState({ status: 'idle', rows: [], checked: 0 });
  const [picked, setPicked] = useState(() => new Set());
  const seed = split(fields.main || '').join(', ');
  async function load() {
    setState({ status: 'loading', rows: [], checked: 0 }); setPicked(new Set());
    try {
      const body = { seed, existing: [fields.main, fields.variations, fields.required, fields.excluded].flatMap(value => split(value || '')) };
      if (topicId) body.topic_id = topicId;
      const data = await api.post('/admin/pulse/keywords/suggest', body);
      setState({ status: data.suggestions.length ? 'ready' : 'empty', rows: data.suggestions, checked: data.checked_posts });
    } catch (error) {
      setState({ status: 'error', rows: [], checked: 0, message: error.status === 503 ? 'Saran keyword belum tersedia.' : error.status ? 'Saran gagal dibuat.' : 'Tidak dapat terhubung.' });
    }
  }
  function toggle(term) { setPicked(current => { const next = new Set(current); if (next.has(term)) next.delete(term); else next.add(term); return next; }); }
  function confirm() {
    const chosen = state.rows.filter(row => picked.has(row.term));
    onAdd({ variation: chosen.filter(row => row.kind === 'variation').map(row => row.term), context: chosen.filter(row => row.kind === 'context').map(row => row.term), exclude: chosen.filter(row => row.kind === 'exclude').map(row => row.term) });
    setState(current => ({ ...current, status: 'added', rows: current.rows.filter(row => !picked.has(row.term)), added: chosen.length }));
    setPicked(new Set());
  }
  const open = ['ready', 'added'].includes(state.status) && state.rows.length > 0;
  return <section className="psk-smart" aria-label="Saran keyword pintar">
    <div className="psk-head">
      <div><strong><Sparkles size={16} aria-hidden="true" />Smart keyword</strong></div>
      <PulseButton onClick={load} disabled={seed.length < 2} busy={state.status === 'loading'} busyLabel="Mencari…">{state.rows.length || state.status === 'empty' ? 'Minta saran lagi' : 'Sarankan keyword'}</PulseButton>
    </div>
    {seed.length < 2 && <p className="psk-note">Isi istilah utama dulu.</p>}
    <div aria-live="polite">
      {state.status === 'error' && <p className="psk-error" role="alert">{state.message}</p>}
      {state.status === 'empty' && <p className="psk-note">Tidak ada saran baru.</p>}
      {state.status === 'added' && <p className="psk-note" role="status">{state.added} keyword ditambahkan.</p>}
    </div>
    {open && <fieldset className="psk-list"><legend>Pilih keyword</legend>
      <ul>{state.rows.map(row => <li key={row.term}><label>
        <input type="checkbox" checked={picked.has(row.term)} onChange={() => toggle(row.term)} />
        <span className="psk-term"><strong>{row.term}</strong>{row.reason && <small>{row.reason}</small>}</span>
        <PulseTag size="sm" tone={kinds[row.kind][1]}>{kinds[row.kind][0]}</PulseTag>
        <span className="psk-seen">{row.seen_in_posts == null ? 'Belum ada data pembanding' : row.seen_in_posts > 0 ? `${formatCount(row.seen_in_posts)} posting tersimpan` : 'Belum terlihat di data'}</span>
      </label></li>)}</ul>
      <div className="psk-actions">
        <PulseButton variant="primary" disabled={!picked.size} onClick={confirm}>{picked.size ? `Tambahkan ${picked.size} keyword` : 'Pilih keyword dahulu'}</PulseButton>
        <PulseButton variant="quiet" onClick={() => setPicked(new Set(picked.size === state.rows.length ? [] : state.rows.map(row => row.term)))}>{picked.size === state.rows.length ? 'Batalkan semua' : 'Pilih semua'}</PulseButton>
        
      </div>
    </fieldset>}
  </section>;
}

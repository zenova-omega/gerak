import React, { useState } from 'react';
import { Ban } from 'lucide-react';
import api from '../../../lib/api';
import { PulseButton } from '../../ui/PulseUI';

/** Saving one post's review, shared by the card's relevance button and the review under its details. A saved review
 * is announced to the page (`pulse-reviews-changed`); a failed write announces nothing and says why. */
function useReviewSave({ postId, topicId, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(changes) {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await api.put(`/admin/pulse/reviews/${encodeURIComponent(postId)}?topic_id=${encodeURIComponent(topicId)}`, changes);
      onSaved?.(saved);
      setMessage('Review tersimpan');
      window.dispatchEvent(new CustomEvent('pulse-reviews-changed', {detail:{topic_id:topicId, post_id:postId, review:saved}}));
      return saved;
    } catch (err) { setError(err.message || 'Review gagal disimpan. Coba lagi.'); return null; }
    finally { setBusy(false); }
  }
  return { save, busy, error, message };
}

/**
 * The card's relevance button: one symbol in the card's header, so a post can be set aside without opening it
 * (the owner, 16 Nov 2026). Pressed means "Tidak relevan" (the post stays stored); pressing again goes back to what the
 * relevance was before. Its name stays "Tidak relevan" and `aria-pressed` carries the state; the title says what a
 * press does. A failed write leaves the state as it was and is announced.
 */
export function RelevanceToggle({ postId, topicId, review, onSaved, disabled = false, size = 'md' }) {
  const { save, busy, error } = useReviewSave({ postId, topicId, onSaved });
  const [before, setBefore] = useState('unreviewed');
  const relevance = review?.relevance || 'unreviewed', marked = relevance === 'irrelevant';
  async function press() {
    if (marked) { await save({ relevance: before }); return; }
    const saved = await save({ relevance: 'irrelevant' });
    if (saved) setBefore(relevance);
  }
  return <>
    <PulseButton className="pm-relevance" size={size} iconOnly aria-pressed={marked} aria-label="Tidak relevan" data-error={error ? '' : undefined}
      title={marked ? 'Ditandai tidak relevan (tetap tersimpan). Klik untuk mengurungkan.' : 'Tandai tidak relevan. Posting tetap tersimpan.'}
      disabled={busy || disabled || !topicId} onClick={press}><Ban aria-hidden="true"/></PulseButton>
    {error && <span role="alert" className="pu-sr">Relevansi gagal disimpan: {error}</span>}
  </>;
}

export default function ReviewPost({ postId, topicId, review, onSaved, disabled = false }) {
  const { save, busy, error, message } = useReviewSave({ postId, topicId, onSaved });
  const [draft, setDraft] = useState(null);
  const relevance = review?.relevance || 'unreviewed';
  const values = draft || {manual_sentiment: review?.manual_sentiment || '', review_needed: review?.review_needed || false, analyst_note: review?.analyst_note || ''};
  const locked = busy || disabled || !topicId;
  async function submit(changes) {
    const saved = await save(changes);
    if (saved && 'manual_sentiment' in changes) setDraft(null);
  }
  return <section aria-label="Review analis" className="ps-account-preview">
    {/* The quick "Tidak relevan" button lives in the card's header (RelevanceToggle); here the state and the full choice. */}
    <div className="pm-tools-row">
      <span>{({unreviewed:'Relevansi belum ditinjau', relevant:'Relevan', irrelevant:'Tidak relevan · tetap tersimpan'})[relevance]}</span>
    </div>
    {review?.review_needed && <p>Perlu ditinjau lagi</p>}
    <label>Relevansi<select disabled={locked} value={relevance} onChange={e=>submit({relevance:e.target.value})}>
      <option value="unreviewed">Belum ditinjau</option><option value="relevant">Relevan</option><option value="irrelevant">Tidak relevan</option>
    </select></label>
    <details><summary>Review sentimen manual</summary>
      <form onSubmit={e=>{e.preventDefault();submit({manual_sentiment:values.manual_sentiment || null, review_needed:values.review_needed, analyst_note:values.analyst_note || null});}}>
        <fieldset disabled={locked} style={{border:0,padding:0,display:'grid',gap:12}}>
          <label>Label manual<select value={values.manual_sentiment} onChange={e=>setDraft({...values,manual_sentiment:e.target.value})}>
            <option value="">Belum dilabeli</option><option value="positive">Positif</option><option value="neutral">Netral</option><option value="negative">Negatif</option>
          </select></label>
          <label><input type="checkbox" checked={values.review_needed} onChange={e=>setDraft({...values,review_needed:e.target.checked})}/> Perlu ditinjau lagi</label>
          <label>Catatan analis<textarea maxLength={2000} value={values.analyst_note} onChange={e=>setDraft({...values,analyst_note:e.target.value})}/></label>
          <button type="submit" className="pulse-button">Simpan review</button>
        </fieldset>
      </form>
    </details>
    {busy && <p role="status">Menyimpan review…</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

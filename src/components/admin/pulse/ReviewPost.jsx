import React, { useState } from 'react';
import api from '../../../lib/api';

export default function ReviewPost({ postId, topicId, review, onSaved, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [undoRelevance, setUndoRelevance] = useState('unreviewed');
  const [draft, setDraft] = useState(null);
  const relevance = review?.relevance || 'unreviewed';
  const values = draft || {manual_sentiment: review?.manual_sentiment || '', review_needed: review?.review_needed || false, analyst_note: review?.analyst_note || ''};
  const locked = busy || disabled || !topicId;
  async function save(changes) {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await api.put(`/admin/pulse/reviews/${encodeURIComponent(postId)}?topic_id=${encodeURIComponent(topicId)}`, changes);
      if (changes.relevance === 'irrelevant') setUndoRelevance(relevance);
      onSaved?.(saved);
      if ('manual_sentiment' in changes) setDraft(null);
      setMessage('Review tersimpan');
      window.dispatchEvent(new CustomEvent('pulse-reviews-changed', {detail:{topic_id:topicId, post_id:postId, review:saved}}));
    } catch (err) { setError(err.message || 'Review gagal disimpan. Coba lagi.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Review analis" className="ps-account-preview">
    <div className="pm-tools-row">
      <span>{({unreviewed:'Relevansi belum ditinjau', relevant:'Relevan', irrelevant:'Tidak relevan · tetap tersimpan'})[relevance]}</span>
      {relevance === 'irrelevant'
        ? <button type="button" className="pulse-button" disabled={locked} onClick={()=>save({relevance:undoRelevance})}>Urungkan</button>
        : <button type="button" className="pulse-button" disabled={locked} onClick={()=>save({relevance:'irrelevant'})}>Tidak relevan</button>}
    </div>
    {review?.review_needed && <p>Perlu ditinjau lagi</p>}
    <details><summary>Review sentimen manual</summary>
      <p>Label manual terpisah dari AI; tidak melatih ulang model. Perlu ditinjau bukan label bot atau dukungan.</p>
      <label>Relevansi<select disabled={locked} value={relevance} onChange={e=>save({relevance:e.target.value})}>
        <option value="unreviewed">Belum ditinjau</option><option value="relevant">Relevan</option><option value="irrelevant">Tidak relevan</option>
      </select></label>
      <form onSubmit={e=>{e.preventDefault();save({manual_sentiment:values.manual_sentiment || null, review_needed:values.review_needed, analyst_note:values.analyst_note || null});}}>
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

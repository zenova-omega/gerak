import { useEffect, useState } from 'react';
import api from '../lib/api';
import EvidenceDrawer from './EvidenceDrawer';
import { KeywordTag } from '../components/ui/PulseTag';
import { PulseLoader } from '../components/ui/PulseLoader';
import { categoryLabel, figureLine, radarPlatforms, SOCIAL } from '../lib/pulseRadar';
import { IssueAction, SourceRow } from './RadarIssues';

const split = text => String(text || '').split(',').map(part => part.trim()).filter(Boolean);

/** What the drawer shows for one issue. `summary` is the row from the list, on screen at once; `detail` adds the
 * evidence when it has loaded (null until then; `error` when it could not be read). */
export function RadarIssueDetail({ summary, detail = null, error = false, canCreate = false }) {
  const query = summary.query || {};
  return <div className="rdi-detail">
    {summary.reason && <p className="rdi-reason">{summary.reason}</p>}
    <p className="rdi-figures">{figureLine(summary).map(part => <span key={part}>{part}</span>)}</p>
    {error ? <p className="rdi-fresh" role="alert">Bukti tidak dapat dimuat.</p>
      : !detail ? <PulseLoader label="Memuat bukti…" />
      : radarPlatforms.slice(1).map(([id, label]) => {
        const items = (detail.evidence || []).filter(item => item.platform === id);
        return items.length ? <section key={id}><h3>{SOCIAL.includes(id) ? `${label}, posting contoh` : label}</h3><ol className="rdi-sources">{items.map((item, index) => <SourceRow key={index} platform={id} item={item} />)}</ol></section> : null;
      })}
    <section><h3>Keyword yang disarankan</h3>
      <p className="rdi-tags">{split(query.q || summary.title).map(term => <KeywordTag key={term}>{term}</KeywordTag>)}
        {split(query.required).map(term => <KeywordTag key={'r' + term}>wajib: {term}</KeywordTag>)}{split(query.excluded).map(term => <KeywordTag key={'x' + term}>tanpa: {term}</KeywordTag>)}</p>
          </section>
    <div className="rdi-action"><IssueAction issue={summary} canCreate={canCreate} createLabel="Buat project dari isu ini" /></div>
  </div>;
}

/** The evidence of one issue, in the product's drawer. Opening it reads what the last refresh stored; it collects nothing. */
export default function RadarIssueDrawer({ issueKey = '', summary = null, canCreate = false, onClose }) {
  const [loaded, setLoaded] = useState({ key: '', detail: null, error: false });
  useEffect(() => {
    if (!issueKey) return undefined;
    let active = true;
    api.get('/admin/pulse/radar/issues/' + encodeURIComponent(issueKey))
      .then(detail => { if (active) setLoaded({ key: issueKey, detail, error: false }); })
      .catch(() => { if (active) setLoaded({ key: issueKey, detail: null, error: true }); });
    return () => { active = false; };
  }, [issueKey]);
  const mine = loaded.key === issueKey ? loaded : { detail: null, error: false };
  return <EvidenceDrawer open={Boolean(issueKey && summary)} onClose={onClose} title={summary?.title || ''} description={summary ? categoryLabel(summary.category) : ''}>
    {summary && <RadarIssueDetail summary={summary} detail={mine.detail} error={mine.error} canCreate={canCreate} />}
  </EvidenceDrawer>;
}

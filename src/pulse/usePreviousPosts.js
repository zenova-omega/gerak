import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { setZone } from '../lib/pulseMeasures';

/**
 * The posts of the period before the project's chosen one, for a reading that compares the two (`term_shift_v1`).
 * Loaded the way a project page loads a period (the analytics of the topic for those days), once per topic and
 * period, and only when `enabled` (the panel that needs them is open). Platform and sentiment scoping stay with the
 * caller, as they do for the page's own posts.
 * @param {string} topicId
 * @param {string} from first day of the period before ("YYYY-MM-DD"), or '' when no period is chosen
 * @param {string} to last day of the period before
 * @param {boolean} enabled
 * @returns {{status: 'none'|'idle'|'loading'|'ready'|'error', posts: object[]|null, retry: () => void}}
 *   `none`: there is no period before to load
 */
export default function usePreviousPosts(topicId, from, to, enabled) {
  const key = topicId && from && to ? `${topicId}|${from}|${to}` : '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: '', attempt: 0, status: 'idle', posts: null });
  useEffect(() => {
    if (!key || !enabled) return undefined;
    let active = true;
    api.get('/admin/pulse/analytics', { topic_id: topicId, from, to })
      .then(data => {
        if (!active) return;
        if (data?.measures?.zone) setZone(data.measures.zone);
        setState({ key, attempt, status: 'ready', posts: Array.isArray(data?.posts) ? data.posts : [] });
      })
      .catch(() => { if (active) setState({ key, attempt, status: 'error', posts: null }); });
    return () => { active = false; };
  }, [key, enabled, attempt, topicId, from, to]);
  const retry = useCallback(() => setAttempt(count => count + 1), []);
  if (!key) return { status: 'none', posts: null, retry };
  if (state.key === key && state.attempt === attempt) return { status: state.status, posts: state.posts, retry };
  return { status: enabled ? 'loading' : 'idle', posts: null, retry };
}

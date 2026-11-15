import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { filterPosts } from '../lib/pulsePostFilters';
import { setZone } from '../lib/pulseMeasures';
import { shareProjectPosts, useSharedProjectPosts } from './projectPosts';
import useProjectPeriod from './useProjectPeriod';
import useProjectPlatforms from './useProjectPlatforms';

/**
 * The posts of the project bar's selection (its period and platforms), for what counts from them outside a project
 * page. They are the posts the page already loaded and shared; nothing is fetched for a reader that only shows a
 * figure when one is known (the project bar). With `load`, a page that has no posts of its own (Sumber & Cakupan)
 * loads them once, the way a project page does, and shares them in turn.
 * @param {string} topicId
 * @param {{load?: boolean}} [options]
 * @returns {{posts: object[]|null, status: 'none'|'idle'|'loading'|'ready'|'error'}}
 */
export default function useProjectSelection(topicId, { load = false } = {}) {
  const [period] = useProjectPeriod(topicId), [platforms] = useProjectPlatforms(topicId);
  const from = period.from, to = period.to, platformKey = JSON.stringify(platforms), key = `${topicId}|${from}|${to}`;
  const shared = useSharedProjectPosts(topicId, period);
  const [failed, setFailed] = useState('');
  const missing = load && Boolean(topicId) && !shared;
  useEffect(() => {
    if (!missing) return undefined;
    let active = true;
    api.get('/admin/pulse/analytics', { topic_id: topicId, ...(from ? { from } : {}), ...(to ? { to } : {}) })
      .then(data => {
        if (!active) return;
        if (data?.measures?.zone) setZone(data.measures.zone);
        shareProjectPosts(topicId, { from, to }, Array.isArray(data?.posts) ? data.posts : []);
      })
      .catch(() => { if (active) setFailed(`${topicId}|${from}|${to}`); });
    return () => { active = false; };
  }, [missing, topicId, from, to]);
  // The same narrowing a project page applies to its own posts, so the selection is the one the page counts.
  const posts = useMemo(() => (shared ? filterPosts(shared, { platforms: JSON.parse(platformKey), from, to }) : null), [shared, platformKey, from, to]);
  return { posts, status: posts ? 'ready' : !topicId ? 'none' : failed === key ? 'error' : load ? 'loading' : 'idle' };
}

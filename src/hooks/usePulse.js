import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { setZone } from '../lib/pulseMeasures';

// No demo fallbacks: generations prevent older topic responses replacing newer data.
const asReceived = data => data;   // one function, so refetch keeps its identity between renders
function usePulseResource(path, topicId, receive = asReceived) {
  const key = path + ':' + (topicId || '');
  const generation = useRef(0);
  const [state, setState] = useState({ key, data: null, loading: true, error: null });
  const refetch = useCallback(async (options = {}) => {
    const request = ++generation.current;
    setState(previous => ({ key, data: previous.key === key ? previous.data : null, loading: options.background && previous.key === key && previous.data ? false : true, error: null }));
    try {
      const data = receive(await api.get(path, topicId ? { topic_id: topicId } : undefined));
      if (request === generation.current) setState({ key, data, loading: false, error: null });
    } catch (error) {
      if (request === generation.current) setState({ key, data: null, loading: false, error });
    }
  }, [path, topicId, key, receive]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) refetch(); });
    return () => { active = false; generation.current += 1; };
  }, [refetch]);
  return { ...(state.key === key ? state : { data: null, loading: true, error: null }), refetch };
}

export function useTopics() {
  const resource = usePulseResource('/admin/pulse/topics');
  const { refetch } = resource;
  useEffect(() => {
    const changed = () => refetch();
    window.addEventListener('pulse-projects-changed', changed);
    return () => window.removeEventListener('pulse-projects-changed', changed);
  }, [refetch]);
  const createTopic = useCallback(async (payload) => {
    const result = await api.post('/admin/pulse/topics', payload);
    window.dispatchEvent(new Event('pulse-projects-changed'));
    await refetch();
    return result;
  }, [refetch]);
  const updateTopic = useCallback(async (id, payload) => {
    const result = await api.put('/admin/pulse/topics/' + encodeURIComponent(id), payload);
    window.dispatchEvent(new Event('pulse-projects-changed'));
    await refetch();
    return result;
  }, [refetch]);
  const deleteTopic = useCallback(async (id) => {
    const result = await api.delete('/admin/pulse/topics/' + encodeURIComponent(id));
    window.dispatchEvent(new Event('pulse-projects-changed'));
    await refetch();
    return result;
  }, [refetch]);
  const crawlNow = useCallback((id) => api.post('/admin/pulse/topics/' + encodeURIComponent(id) + '/crawl'), []);
  const bootstrap = useCallback(async () => {
    const result = await api.post('/admin/pulse/bootstrap');
    await refetch();
    return result;
  }, [refetch]);
  return { ...resource, topics: resource.data || [], createTopic, updateTopic, deleteTopic, crawlNow, bootstrap };
}
export function useIssues({ topicId } = {}) {
  const resource = usePulseResource('/admin/pulse/issues', topicId);
  return { ...resource, issues: resource.data || [] };
}
/** day_v1: an analytics payload carries the installation's zone; it is set as the payload arrives, before any page
 * counts a day from it. */
function receiveAnalytics(data) {
  if (data?.measures?.zone) setZone(data.measures.zone);
  return data;
}
export function usePulseAnalytics(topicId, alertId, period = {}) {
  const params=new URLSearchParams();
  if(period.from)params.set('from',period.from);
  if(period.to)params.set('to',period.to);
  const base=alertId ? '/admin/pulse/monitor/alerts/' + encodeURIComponent(alertId) + '/analysis' : '/admin/pulse/analytics';
  return usePulseResource(base+(params.size?'?'+params:''), topicId, receiveAnalytics);
}
export function fetchIssueDetail(issueId) {
  return api.get('/admin/pulse/issues/' + encodeURIComponent(issueId));
}

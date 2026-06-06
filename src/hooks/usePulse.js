import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

// Mock fallback (demo mode saat backend tidak tersedia)
const MOCK_ISSUES = [
  { id: 'm1', topic_id: 't1', title: 'TNI gelar bakti sosial di Jakarta', item_count: 8, score: 7.2, sentiment: 0.6, summary: null, last_seen_at: null },
  { id: 'm2', topic_id: 't1', title: 'Diskusi kebijakan publik pekan ini', item_count: 5, score: 4.1, sentiment: -0.2, summary: null, last_seen_at: null },
];

export function useTopics() {
  const { data, loading, error, refetch } = useApi('/admin/pulse/topics', { defaultData: [] });
  const { mutate } = useMutation();

  const createTopic = useCallback(async (payload) => {
    const r = await mutate(() => api.post('/admin/pulse/topics', payload));
    refetch();
    return r;
  }, [mutate, refetch]);

  const updateTopic = useCallback(async (id, payload) => {
    const r = await mutate(() => api.put(`/admin/pulse/topics/${id}`, payload));
    refetch();
    return r;
  }, [mutate, refetch]);

  const deleteTopic = useCallback(async (id) => {
    const r = await mutate(() => api.delete(`/admin/pulse/topics/${id}`));
    refetch();
    return r;
  }, [mutate, refetch]);

  const crawlNow = useCallback(async (id) => {
    const r = await mutate(() => api.post(`/admin/pulse/topics/${id}/crawl`));
    refetch();
    return r;
  }, [mutate, refetch]);

  return { topics: data || [], loading, error, createTopic, updateTopic, deleteTopic, crawlNow, refetch };
}

export function useIssues({ topicId } = {}) {
  const params = {};
  if (topicId) params.topic_id = topicId;
  const { data, loading, error, refetch } = useApi('/admin/pulse/issues', { params, defaultData: MOCK_ISSUES });
  return { issues: data || [], loading, error, refetch };
}

export async function fetchIssueDetail(issueId) {
  return api.get(`/admin/pulse/issues/${issueId}`);
}

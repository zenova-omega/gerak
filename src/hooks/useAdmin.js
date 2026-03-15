import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';
import { ADMIN_STATS } from '../data/admin';

/**
 * Hook for admin dashboard aggregate stats.
 */
export function useDashboard() {
  const { data, loading, error, refetch } = useApi('/admin/dashboard', {
    defaultData: {
      total_users: ADMIN_STATS.totalAgents,
      active_users: ADMIN_STATS.activeToday,
      total_missions: 15,
      active_missions: ADMIN_STATS.missionsActive,
      pending_reviews: 4,
      total_xp_distributed: 0,
    },
  });
  return { stats: data, loading, error, refetch };
}

/**
 * Hook for submission review queue.
 */
export function useSubmissions(status = 'pending') {
  const { data, loading, error, refetch } = useApi('/admin/submissions', {
    params: { status },
    defaultData: [],
  });

  const { mutate } = useMutation();

  const reviewSubmission = useCallback(async (submissionId, reviewStatus, reason) => {
    const result = await mutate(() =>
      api.put(`/admin/submissions/${submissionId}`, { status: reviewStatus, reason })
    );
    refetch();
    return result;
  }, [mutate, refetch]);

  return { submissions: data || [], loading, error, reviewSubmission, refetch };
}

/**
 * Hook for admin agent/member list.
 */
export function useAgents({ type, search, page = 1, perPage = 50 } = {}) {
  const params = { page, per_page: perPage };
  if (type && type !== 'Semua') params.type = type;
  if (search) params.search = search;

  const { data, loading, error, refetch } = useApi('/admin/agents', {
    params,
    defaultData: { items: [], total: 0 },
  });

  return {
    agents: data?.items || [],
    total: data?.total || 0,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for broadcast operations.
 */
export function useBroadcast() {
  const { data: history, loading, error, refetch } = useApi('/admin/broadcast', {
    defaultData: [],
  });

  const { mutate } = useMutation();

  const sendBroadcast = useCallback(async (broadcastData) => {
    const result = await mutate(() => api.post('/admin/broadcast', broadcastData));
    refetch();
    return result;
  }, [mutate, refetch]);

  return { history: history || [], loading, error, sendBroadcast, refetch };
}

/**
 * Hook for system settings.
 */
export function useSettings() {
  const { data, loading, error, refetch } = useApi('/admin/settings', {
    defaultData: {},
  });

  const { mutate } = useMutation();

  const updateSetting = useCallback(async (key, value) => {
    const result = await mutate(() => api.put('/admin/settings', { key, value }));
    refetch();
    return result;
  }, [mutate, refetch]);

  return { settings: data || {}, loading, error, updateSetting, refetch };
}

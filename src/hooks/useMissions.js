import { useState, useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';
import { MISSIONS } from '../data/missions';

/**
 * Hook for mission operations — list, filter, join, submit, review.
 * Falls back to hardcoded MISSIONS when API is unavailable.
 */
export function useMissions({ type, status, page = 1, perPage = 50 } = {}) {
  const params = {};
  if (type && type !== 'Semua') params.type = type;
  if (status) params.status = status;
  params.page = page;
  params.per_page = perPage;

  const { data, loading, error, refetch, setData } = useApi('/missions', {
    params,
    defaultData: { items: MISSIONS, total: MISSIONS.length, page: 1, per_page: 50, pages: 1 },
  });

  return {
    missions: data?.items || [],
    total: data?.total || 0,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for single mission detail.
 */
export function useMission(missionId) {
  const { data, loading, error, refetch } = useApi(
    missionId ? `/missions/${missionId}` : null,
    {
      enabled: !!missionId,
      defaultData: MISSIONS.find(m => m.id === missionId) || MISSIONS[0],
    }
  );
  return { mission: data, loading, error, refetch };
}

/**
 * Hook for mission actions — join, submit, create.
 */
export function useMissionActions() {
  const { mutate, loading } = useMutation();

  const joinMission = useCallback((missionId) =>
    mutate(() => api.post(`/missions/${missionId}/join`))
  , [mutate]);

  const submitMission = useCallback((missionId, { caption, platform, postUrl, file } = {}) => {
    if (file) {
      return mutate(() => api.upload(`/missions/${missionId}/submit`, file, { caption, platform, post_url: postUrl }));
    }
    return mutate(() => api.post(`/missions/${missionId}/submit`, { caption, platform, post_url: postUrl }));
  }, [mutate]);

  const createMission = useCallback((data) =>
    mutate(() => api.post('/missions', data))
  , [mutate]);

  const updateMission = useCallback((missionId, data) =>
    mutate(() => api.put(`/missions/${missionId}`, data))
  , [mutate]);

  const deleteMission = useCallback((missionId) =>
    mutate(() => api.delete(`/missions/${missionId}`))
  , [mutate]);

  return { joinMission, submitMission, createMission, updateMission, deleteMission, loading };
}

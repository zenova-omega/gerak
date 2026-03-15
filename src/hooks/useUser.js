import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for current user profile data.
 */
export function useProfile() {
  const { user: authUser, isAuthenticated } = useAuth();

  const { data, loading, error, refetch } = useApi('/auth/me', {
    enabled: isAuthenticated && authUser?.id !== undefined,
    defaultData: authUser,
  });

  return { profile: data || authUser, loading, error, refetch };
}

/**
 * Hook for leaderboard data.
 */
export function useLeaderboard(limit = 20) {
  const { data, loading, error } = useApi('/users/leaderboard', {
    params: { limit },
    defaultData: [],
  });

  return { leaderboard: data || [], loading, error };
}

/**
 * Hook for user's mission history.
 */
export function useUserMissions(userId) {
  const { data, loading, error } = useApi(
    userId ? `/users/${userId}/missions` : null,
    { enabled: !!userId, defaultData: [] }
  );

  return { missions: data || [], loading, error };
}

/**
 * Hook for family members.
 */
export function useFamily(userId) {
  const { data, loading, error, refetch } = useApi(
    userId ? `/users/${userId}/family` : null,
    { enabled: !!userId, defaultData: [] }
  );

  const { mutate } = useMutation();

  const addFamily = useCallback(async (familyData) => {
    const result = await mutate(() => api.post(`/users/${userId}/family`, familyData));
    refetch();
    return result;
  }, [userId, mutate, refetch]);

  return { family: data || [], loading, error, addFamily, refetch };
}

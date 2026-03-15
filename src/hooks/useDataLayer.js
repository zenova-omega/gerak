/**
 * Data Layer Bridge
 *
 * This hook provides the same interface as the hardcoded data in App.jsx,
 * but routes through the API when available. It's designed to be a drop-in
 * replacement during the migration period.
 *
 * In App.jsx, replace:
 *   const missions = MISSIONS;
 * With:
 *   const { missions, joinMission, submitMission } = useDataLayer();
 *
 * The hook detects whether the API is available and falls back to
 * local state when it's not (demo mode).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { MISSIONS } from '../data/missions';
import { ADMIN_STATS } from '../data/admin';

export function useDataLayer() {
  const [apiAvailable, setApiAvailable] = useState(false);
  const [missions, setMissions] = useState(MISSIONS);
  const [dashboardStats, setDashboardStats] = useState(ADMIN_STATS);
  const checkedRef = useRef(false);

  // Check API availability on mount
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    api.get('/health')
      .then(() => {
        setApiAvailable(true);
        // Load missions from API
        api.get('/missions').then(data => {
          if (data?.items?.length > 0) setMissions(data.items);
        }).catch(() => {});
        // Load dashboard stats
        api.get('/admin/dashboard').then(data => {
          if (data) setDashboardStats(prev => ({ ...prev, ...data }));
        }).catch(() => {});
      })
      .catch(() => {
        setApiAvailable(false);
        // Stay with hardcoded data
      });
  }, []);

  const joinMission = useCallback(async (missionId) => {
    if (apiAvailable) {
      return api.post(`/missions/${missionId}/join`);
    }
    // Demo mode: local state update
    return { join_id: `demo-${Date.now()}`, status: 'TERDAFTAR' };
  }, [apiAvailable]);

  const submitMission = useCallback(async (missionId, data) => {
    if (apiAvailable) {
      if (data?.file) {
        return api.upload(`/missions/${missionId}/submit`, data.file, {
          caption: data.caption, platform: data.platform, post_url: data.postUrl,
        });
      }
      return api.post(`/missions/${missionId}/submit`, data);
    }
    return { submission_id: `demo-${Date.now()}`, status: 'SUBMITTED' };
  }, [apiAvailable]);

  const createMission = useCallback(async (missionData) => {
    if (apiAvailable) {
      return api.post('/missions', missionData);
    }
    return { id: `demo-${Date.now()}`, title: missionData.title, status: 'TERBUKA' };
  }, [apiAvailable]);

  const reviewSubmission = useCallback(async (submissionId, status) => {
    if (apiAvailable) {
      return api.put(`/admin/submissions/${submissionId}`, { status });
    }
    return { id: submissionId, status };
  }, [apiAvailable]);

  return {
    apiAvailable,
    missions,
    dashboardStats,
    joinMission,
    submitMission,
    createMission,
    reviewSubmission,
  };
}

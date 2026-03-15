import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';

/**
 * Generic API fetching hook with loading/error/cache states.
 * Falls back to provided defaultData when API is unavailable (demo mode).
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi('/missions', { defaultData: MISSIONS });
 */
export function useApi(path, { params, defaultData, enabled = true } = {}) {
  const [data, setData] = useState(defaultData ?? null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(path, params);
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        // Fallback to default data in demo mode
        if (defaultData) {
          setData(defaultData);
          setError(null);
        } else {
          setError(err.message || 'Gagal memuat data');
        }
        setLoading(false);
      }
    }
  }, [path, JSON.stringify(params), enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, setData };
}

/**
 * Mutation hook for POST/PUT/DELETE operations.
 *
 * Usage:
 *   const { mutate, loading, error } = useMutation();
 *   await mutate(() => api.post('/missions/123/join'));
 */
export function useMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message || 'Operasi gagal');
      setLoading(false);
      throw err;
    }
  }, []);

  return { mutate, loading, error };
}

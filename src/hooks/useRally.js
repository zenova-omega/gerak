import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

const MOCK_RALLIES = [
  { id: 'r1', title: 'Dukung post bakti sosial', post_url: 'https://instagram.com/p/abc', talking_points: 'Sebutkan kegiatan baksos; tulis dengan kalimatmu sendiri.', target: 'Semua outlet', status: 'open', ack_count: 34 },
  { id: 'r2', title: 'Ramaikan pengumuman cabang baru', post_url: 'https://x.com/brand/status/123', talking_points: 'Ucapkan selamat; ceritakan pengalamanmu sendiri.', target: 'Cabang Jakarta', status: 'open', ack_count: 12 },
];

export function useRallies() {
  const { data, loading, refetch, setData } = useApi('/admin/rally', { defaultData: MOCK_RALLIES });
  const { mutate } = useMutation();

  const createRally = useCallback(async (r) => {
    try {
      const x = await mutate(() => api.post('/admin/rally', r));
      refetch();
      return x;
    } catch {
      const fake = { id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...r, status: 'open', ack_count: 0 };
      setData((prev) => [fake, ...(prev || [])]);
      return fake;
    }
  }, [mutate, refetch, setData]);

  const deleteRally = useCallback(async (id) => {
    try {
      const x = await mutate(() => api.delete(`/admin/rally/${id}`));
      refetch();
      return x;
    } catch {
      setData((prev) => (prev || []).filter((x) => x.id !== id));
      return null;
    }
  }, [mutate, refetch, setData]);

  return { rallies: data || [], loading, createRally, deleteRally, refetch };
}

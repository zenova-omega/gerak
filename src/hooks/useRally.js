import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

const MOCK_RALLIES = [
  { id: 'r1', title: 'Dukung post bakti sosial', post_url: 'https://instagram.com/p/abc', talking_points: 'Sebutkan kegiatan baksos; tulis dengan kalimatmu sendiri.', target: 'Semua outlet', status: 'open', ack_count: 34 },
  { id: 'r2', title: 'Ramaikan pengumuman cabang baru', post_url: 'https://x.com/brand/status/123', talking_points: 'Ucapkan selamat; ceritakan pengalamanmu sendiri.', target: 'Cabang Jakarta', status: 'open', ack_count: 12 },
];

export function useRallies() {
  const { data, loading, refetch } = useApi('/admin/rally', { defaultData: MOCK_RALLIES });
  const { mutate } = useMutation();
  const createRally = useCallback(async (r) => { const x = await mutate(() => api.post('/admin/rally', r)); refetch(); return x; }, [mutate, refetch]);
  const deleteRally = useCallback(async (id) => { const x = await mutate(() => api.delete(`/admin/rally/${id}`)); refetch(); return x; }, [mutate, refetch]);
  return { rallies: data || [], loading, createRally, deleteRally, refetch };
}

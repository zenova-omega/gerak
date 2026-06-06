import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

const MOCK_ACCOUNTS = [
  { id: 'a1', label: 'Brand Pusat', platform: 'instagram', handle: '@brand.pusat', status: 'connected' },
  { id: 'a2', label: 'Cabang Jakarta', platform: 'tiktok', handle: '@brand.jkt', status: 'connected' },
  { id: 'a3', label: 'Brand X Resmi', platform: 'x', handle: '@brand', status: 'connected' },
  { id: 'a4', label: 'Cabang Surabaya', platform: 'facebook', handle: '@brand.sby', status: 'connected' },
  { id: 'a5', label: 'Rina Dewi', platform: 'instagram', handle: '@rina.dewi', status: 'connected' },
  { id: 'a6', label: 'Budi Santoso', platform: 'tiktok', handle: '@budi.santoso', status: 'connected' },
  { id: 'a7', label: 'Sari Melati', platform: 'youtube', handle: '@sarimelati', status: 'connected' },
  { id: 'a8', label: 'Dimas Prayoga', platform: 'x', handle: '@dimaspray', status: 'connected' },
];
const MOCK_POSTS = [
  { id: 'p1', caption: 'Promo akhir pekan! Diskon 30% semua menu 🎉 #SCOUT', platforms: ['instagram', 'tiktok'], scheduled_at: '2026-06-08T10:00:00', status: 'scheduled', published_at: null },
  { id: 'p2', caption: 'Terima kasih sudah hadir di bakti sosial kemarin 🙏', platforms: ['x'], scheduled_at: '2026-06-06T08:00:00', status: 'published', published_at: '2026-06-06T08:00:00' },
];

export function useAccounts() {
  const { data, loading, refetch, setData } = useApi('/admin/scheduler/accounts', { defaultData: MOCK_ACCOUNTS });
  const { mutate } = useMutation();

  const addAccount = useCallback(async (a) => {
    try {
      const r = await mutate(() => api.post('/admin/scheduler/accounts', a));
      refetch();
      return r;
    } catch {
      const fake = { id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...a, status: 'connected' };
      setData((prev) => [fake, ...(prev || [])]);
      return fake;
    }
  }, [mutate, refetch, setData]);

  const removeAccount = useCallback(async (id) => {
    try {
      const r = await mutate(() => api.delete(`/admin/scheduler/accounts/${id}`));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).filter((x) => x.id !== id));
      return null;
    }
  }, [mutate, refetch, setData]);

  return { accounts: data || [], loading, addAccount, removeAccount, refetch };
}

export function usePosts() {
  const { data, loading, refetch, setData } = useApi('/admin/scheduler/posts', { defaultData: MOCK_POSTS });
  const { mutate } = useMutation();

  const createPost = useCallback(async (p) => {
    try {
      const r = await mutate(() => api.post('/admin/scheduler/posts', p));
      refetch();
      return r;
    } catch {
      const fake = {
        id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        caption: p.caption,
        media_url: p.media_url || null,
        platforms: p.platforms || [],
        scheduled_at: p.scheduled_at || null,
        status: 'scheduled',
        published_at: null,
      };
      setData((prev) => [fake, ...(prev || [])]);
      return fake;
    }
  }, [mutate, refetch, setData]);

  const updatePost = useCallback(async (id, p) => {
    try {
      const r = await mutate(() => api.put(`/admin/scheduler/posts/${id}`, p));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).map((x) => x.id === id ? { ...x, ...p } : x));
      return null;
    }
  }, [mutate, refetch, setData]);

  const deletePost = useCallback(async (id) => {
    try {
      const r = await mutate(() => api.delete(`/admin/scheduler/posts/${id}`));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).filter((x) => x.id !== id));
      return null;
    }
  }, [mutate, refetch, setData]);

  const publishPost = useCallback(async (id) => {
    try {
      const r = await mutate(() => api.post(`/admin/scheduler/posts/${id}/publish`));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).map((x) => x.id === id ? { ...x, status: 'published', published_at: new Date().toISOString() } : x));
      return null;
    }
  }, [mutate, refetch, setData]);

  return { posts: data || [], loading, createPost, updatePost, deletePost, publishPost, refetch };
}

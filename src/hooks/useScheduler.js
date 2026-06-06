import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

const MOCK_ACCOUNTS = [
  { id: 'a1', label: 'Brand Pusat', platform: 'instagram', handle: '@brand.pusat', status: 'connected' },
  { id: 'a2', label: 'Cabang Jakarta', platform: 'tiktok', handle: '@brand.jkt', status: 'connected' },
  { id: 'a3', label: 'Brand X Resmi', platform: 'x', handle: '@brand', status: 'connected' },
];
const MOCK_POSTS = [
  { id: 'p1', caption: 'Promo akhir pekan! Diskon 30% semua menu 🎉 #SINAR', platforms: ['instagram', 'tiktok'], scheduled_at: '2026-06-08T10:00:00', status: 'scheduled', published_at: null },
  { id: 'p2', caption: 'Terima kasih sudah hadir di bakti sosial kemarin 🙏', platforms: ['x'], scheduled_at: '2026-06-06T08:00:00', status: 'published', published_at: '2026-06-06T08:00:00' },
];

export function useAccounts() {
  const { data, loading, refetch } = useApi('/admin/scheduler/accounts', { defaultData: MOCK_ACCOUNTS });
  const { mutate } = useMutation();
  const addAccount = useCallback(async (a) => { const r = await mutate(() => api.post('/admin/scheduler/accounts', a)); refetch(); return r; }, [mutate, refetch]);
  const removeAccount = useCallback(async (id) => { const r = await mutate(() => api.delete(`/admin/scheduler/accounts/${id}`)); refetch(); return r; }, [mutate, refetch]);
  return { accounts: data || [], loading, addAccount, removeAccount, refetch };
}

export function usePosts() {
  const { data, loading, refetch } = useApi('/admin/scheduler/posts', { defaultData: MOCK_POSTS });
  const { mutate } = useMutation();
  const createPost = useCallback(async (p) => { const r = await mutate(() => api.post('/admin/scheduler/posts', p)); refetch(); return r; }, [mutate, refetch]);
  const updatePost = useCallback(async (id, p) => { const r = await mutate(() => api.put(`/admin/scheduler/posts/${id}`, p)); refetch(); return r; }, [mutate, refetch]);
  const deletePost = useCallback(async (id) => { const r = await mutate(() => api.delete(`/admin/scheduler/posts/${id}`)); refetch(); return r; }, [mutate, refetch]);
  const publishPost = useCallback(async (id) => { const r = await mutate(() => api.post(`/admin/scheduler/posts/${id}/publish`)); refetch(); return r; }, [mutate, refetch]);
  return { posts: data || [], loading, createPost, updatePost, deletePost, publishPost, refetch };
}

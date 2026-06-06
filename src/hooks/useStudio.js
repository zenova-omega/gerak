import { useState, useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

const EMOJI = { positif: '💪', negatif: '⚠️', netral: '📌', custom: '✨' };
function mockCaptions(prompt, tone, n) {
  const base = (prompt || 'konten').trim();
  const hooks = ['', 'Yuk simak: ', 'Penting! ', 'Update: ', 'Tahukah kamu? ', 'Bangga: '];
  const e = EMOJI[tone] || '📌';
  return Array.from({ length: n }, (_, i) => `${e} ${hooks[i % hooks.length]}${base} #SCOUT #TNIAD`.trim());
}

export function useCaptions() {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState([]);
  const generate = useCallback(async ({ prompt, tone, n, custom }) => {
    setLoading(true);
    try {
      const r = await api.post('/admin/studio/captions', { prompt, tone, n, custom });
      setVariants(r.variants || []);
      return r.variants;
    } catch {
      const v = mockCaptions(prompt, tone, n);
      setVariants(v);
      return v;
    } finally {
      setLoading(false);
    }
  }, []);
  return { variants, loading, generate, setVariants };
}

export function useMeme() {
  const [loading, setLoading] = useState(false);
  const [meme, setMeme] = useState(null);
  const generate = useCallback(async ({ prompt }) => {
    setLoading(true);
    try {
      const r = await api.post('/admin/studio/meme', { prompt });
      setMeme(r);
      return r;
    } catch {
      const base = (prompt || 'Konten').trim();
      const m = { top_text: base.slice(0, 40), bottom_text: '#SCOUT #TNIAD', caption: base, image_url: null };
      setMeme(m);
      return m;
    } finally {
      setLoading(false);
    }
  }, []);
  return { meme, loading, generate, setMeme };
}

export function useDrafts() {
  const { data, loading, refetch, setData } = useApi('/admin/studio/drafts', { defaultData: [] });
  const { mutate } = useMutation();

  const saveDraft = useCallback(async (d) => {
    try {
      const r = await mutate(() => api.post('/admin/studio/drafts', d));
      refetch();
      return r;
    } catch {
      const fake = { id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...d, created_at: new Date().toISOString() };
      setData((prev) => [fake, ...(prev || [])]);
      return fake;
    }
  }, [mutate, refetch, setData]);

  const deleteDraft = useCallback(async (id) => {
    try {
      const r = await mutate(() => api.delete(`/admin/studio/drafts/${id}`));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).filter((x) => x.id !== id));
      return null;
    }
  }, [mutate, refetch, setData]);

  return { drafts: data || [], loading, saveDraft, deleteDraft, refetch };
}

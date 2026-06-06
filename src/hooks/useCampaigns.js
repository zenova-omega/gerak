import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

const MOCK_CAMPAIGNS = [
  { id: 'c1', name: 'Kampanye Bakti Sosial', objective: 'Naikkan citra positif pasca-kegiatan', status: 'active',
    pipeline: { listen: 'Isu "bakti sosial TNI AD" sedang positif di IG & berita', create: '3 varian caption + 1 meme', distribute: 'IG + TikTok, jadwal Sabtu 10.00', engage: 'Ajak outlet meramaikan (sukarela)' } },
  { id: 'c2', name: 'Peluncuran Cabang Jakarta', objective: 'Awareness pembukaan cabang', status: 'draft',
    pipeline: { listen: '', create: '', distribute: '', engage: '' } },
];

export function useCampaigns() {
  const { data, loading, refetch, setData } = useApi('/admin/campaigns', { defaultData: MOCK_CAMPAIGNS });
  const { mutate } = useMutation();

  const createCampaign = useCallback(async (c) => {
    try {
      const r = await mutate(() => api.post('/admin/campaigns', c));
      refetch();
      return r;
    } catch {
      const fake = {
        id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: c.name,
        objective: c.objective || '',
        status: 'draft',
        pipeline: { listen: '', create: '', distribute: '', engage: '' },
        source_issue_id: c.source_issue_id || null,
      };
      setData((prev) => [fake, ...(prev || [])]);
      return fake;
    }
  }, [mutate, refetch, setData]);

  const updateCampaign = useCallback(async (id, c) => {
    try {
      const r = await mutate(() => api.put(`/admin/campaigns/${id}`, c));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).map((x) => x.id === id ? { ...x, ...c } : x));
      return null;
    }
  }, [mutate, refetch, setData]);

  const deleteCampaign = useCallback(async (id) => {
    try {
      const r = await mutate(() => api.delete(`/admin/campaigns/${id}`));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).filter((x) => x.id !== id));
      return null;
    }
  }, [mutate, refetch, setData]);

  return { campaigns: data || [], loading, createCampaign, updateCampaign, deleteCampaign, refetch };
}

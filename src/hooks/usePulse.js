import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api from '../lib/api';

// Mock fallback (demo mode saat backend tidak tersedia).
// Setiap source_item membawa metrics + sentiment agar kartu isu bisa
// menampilkan link sumber, reach/engagement/likes, dan tag pos/neg walau
// backend mati.
const MOCK_ISSUES = [
  {
    id: 'm1', topic_id: 't1',
    title: 'TNI AD gelar bakti sosial & pengobatan gratis di Jakarta',
    item_count: 8, score: 7.2, reach_total: 389300, engagement_total: 27850, platforms: ['news', 'instagram', 'tiktok', 'x', 'youtube'], sentiment: 0.6,
    summary: 'Liputan positif soal bakti sosial dan pengobatan gratis TNI AD di Jakarta Timur menyebar di media dan sosmed.',
    last_seen_at: '2026-06-06T09:40:00',
    source_items: [
      { id: 's1', source: 'rss', platform: 'news', url: 'https://www.kompas.com/regional/tni-ad-bakti-sosial-jaktim', title: 'TNI AD Gelar Bakti Sosial dan Pengobatan Gratis di Jakarta Timur', author: 'Kompas.com', published_at: '2026-06-06T09:40:00', sentiment: 0.5, metrics: { reach: 45200, engagement: 1820, likes: null } },
      { id: 's2', source: 'rss', platform: 'news', url: 'https://news.detik.com/berita/tni-bagikan-sembako-warga', title: 'TNI Bagikan 1.000 Paket Sembako untuk Warga Terdampak', author: 'detikNews', published_at: '2026-06-06T08:55:00', sentiment: 0.4, metrics: { reach: 38100, engagement: 1450, likes: null } },
      { id: 's3', source: 'n8n', platform: 'instagram', url: 'https://www.instagram.com/p/Cx-baksos-tniad', title: 'Senyum warga di kegiatan baksos hari ini 🇮🇩 #TNIAD #BaktiSosial', author: '@tni_ad', published_at: '2026-06-06T08:20:00', sentiment: 0.8, metrics: { reach: 89400, engagement: 7300, likes: 6200 } },
      { id: 's4', source: 'n8n', platform: 'tiktok', url: 'https://www.tiktok.com/@infotni/video/7421baksos', title: 'Momen prajurit bantu lansia di posko pengobatan gratis', author: '@infotni', published_at: '2026-06-06T07:50:00', sentiment: 0.7, metrics: { reach: 152000, engagement: 14200, likes: 12800 } },
      { id: 's5', source: 'n8n', platform: 'x', url: 'https://x.com/Puspen_TNI/status/1799baksos', title: 'Hari ini TNI AD hadir di tengah masyarakat Jakarta Timur. 🙏', author: '@Puspen_TNI', published_at: '2026-06-06T07:30:00', sentiment: 0.6, metrics: { reach: 41200, engagement: 2100, likes: 1750 } },
      { id: 's6', source: 'browserless', platform: 'youtube', url: 'https://www.youtube.com/watch?v=baksos-jaktim', title: '[FULL] Bakti Sosial TNI AD — Pengobatan Gratis Warga Jaktim', author: 'TNI AD Official', published_at: '2026-06-05T20:10:00', sentiment: 0.3, metrics: { reach: 23400, engagement: 980, likes: 870 } },
    ],
  },
  {
    id: 'm2', topic_id: 't1',
    title: 'Diskusi kebijakan publik pekan ini menuai pro–kontra',
    item_count: 5, score: 4.1, reach_total: 56000, engagement_total: 2750, platforms: ['news', 'x', 'facebook'], sentiment: -0.25,
    summary: 'Perbincangan kebijakan baru memicu opini terbelah; nada cenderung kritis di kanal berita dan X.',
    last_seen_at: '2026-06-06T06:15:00',
    source_items: [
      { id: 's7', source: 'rss', platform: 'news', url: 'https://www.tempo.co/politik/pro-kontra-kebijakan-baru', title: 'Pro dan Kontra Kebijakan Baru: Apa Kata Pengamat?', author: 'Tempo.co', published_at: '2026-06-06T06:15:00', sentiment: 0.05, metrics: { reach: 18700, engagement: 540, likes: null } },
      { id: 's8', source: 'rss', platform: 'news', url: 'https://www.cnnindonesia.com/nasional/respons-publik-kebijakan', title: 'Respons Publik Terbelah soal Kebijakan Pekan Ini', author: 'CNN Indonesia', published_at: '2026-06-06T05:40:00', sentiment: -0.3, metrics: { reach: 22100, engagement: 690, likes: null } },
      { id: 's9', source: 'n8n', platform: 'x', url: 'https://x.com/warganet/status/1799kebijakan', title: 'Thread: kenapa kebijakan ini perlu dikaji ulang 🧵', author: '@warganet_id', published_at: '2026-06-06T05:05:00', sentiment: -0.6, metrics: { reach: 9800, engagement: 1200, likes: 760 } },
      { id: 's10', source: 'n8n', platform: 'facebook', url: 'https://www.facebook.com/groups/diskusipublik/posts/kebijakan', title: 'Diskusi: dampak kebijakan ke pelaku UMKM', author: 'Forum Diskusi Publik', published_at: '2026-06-05T22:30:00', sentiment: -0.35, metrics: { reach: 5400, engagement: 320, likes: 210 } },
    ],
  },
  {
    id: 'm3', topic_id: 't1',
    title: 'Harga pangan stabil jelang akhir bulan',
    item_count: 3, score: 2.4, reach_total: 23100, engagement_total: 1190, platforms: ['news', 'web', 'instagram'], sentiment: 0.1,
    summary: 'Pemberitaan netral soal stabilitas harga pangan menjelang akhir bulan.',
    last_seen_at: '2026-06-05T18:00:00',
    source_items: [
      { id: 's11', source: 'rss', platform: 'news', url: 'https://bisnis.com/ekonomi/harga-pangan-stabil', title: 'Harga Pangan Pokok Stabil Jelang Akhir Bulan', author: 'Bisnis.com', published_at: '2026-06-05T18:00:00', sentiment: 0.1, metrics: { reach: 7600, engagement: 210, likes: null } },
      { id: 's12', source: 'browserless', platform: 'web', url: 'https://infopangan.jakarta.go.id/harga-harian', title: 'Info Pangan Jakarta — Harga Harian', author: 'infopangan.jakarta.go.id', published_at: '2026-06-05T16:30:00', sentiment: 0.0, metrics: { reach: 3100, engagement: null, likes: null } },
      { id: 's13', source: 'n8n', platform: 'instagram', url: 'https://www.instagram.com/p/Cx-pasar-update', title: 'Update harga di pasar hari ini, relatif stabil ya 👍', author: '@pasar.update', published_at: '2026-06-05T15:10:00', sentiment: 0.3, metrics: { reach: 12400, engagement: 980, likes: 820 } },
    ],
  },
];

export function useTopics() {
  const { data, loading, error, refetch } = useApi('/admin/pulse/topics', { defaultData: [] });
  const { mutate } = useMutation();

  const createTopic = useCallback(async (payload) => {
    const r = await mutate(() => api.post('/admin/pulse/topics', payload));
    refetch();
    return r;
  }, [mutate, refetch]);

  const updateTopic = useCallback(async (id, payload) => {
    const r = await mutate(() => api.put(`/admin/pulse/topics/${id}`, payload));
    refetch();
    return r;
  }, [mutate, refetch]);

  const deleteTopic = useCallback(async (id) => {
    const r = await mutate(() => api.delete(`/admin/pulse/topics/${id}`));
    refetch();
    return r;
  }, [mutate, refetch]);

  const crawlNow = useCallback(async (id) => {
    const r = await mutate(() => api.post(`/admin/pulse/topics/${id}/crawl`));
    refetch();
    return r;
  }, [mutate, refetch]);

  return { topics: data || [], loading, error, createTopic, updateTopic, deleteTopic, crawlNow, refetch };
}

export function useIssues({ topicId } = {}) {
  const params = {};
  if (topicId) params.topic_id = topicId;
  const { data, loading, error, refetch } = useApi('/admin/pulse/issues', { params, defaultData: MOCK_ISSUES });
  return { issues: data || [], loading, error, refetch };
}

// Fetch the source items for an issue. Falls back to mock data (demo mode)
// so the source links + metrics stay visible even when the backend is down.
export async function fetchIssueDetail(issueId) {
  try {
    return await api.get(`/admin/pulse/issues/${issueId}`);
  } catch {
    const mock = MOCK_ISSUES.find((i) => i.id === issueId);
    return mock || { source_items: [] };
  }
}

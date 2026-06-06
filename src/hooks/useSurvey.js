import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import api, { ApiError } from '../lib/api';

const MOCK_SURVEYS = [
  { id: 'sv1', title: 'Kepuasan Kegiatan Bakti Sosial', description: 'Polling singkat pasca-kegiatan', status: 'open', mission_id: 'm-sv1', response_count: 128,
    questions: [
      { id: 'q1', order: 0, type: 'single', text: 'Seberapa puas Anda dengan kegiatan?', options: ['Sangat puas', 'Puas', 'Biasa', 'Kurang'], rating_max: 5, required: true },
      { id: 'q2', order: 1, type: 'rating', text: 'Nilai keseluruhan (1-5)', options: null, rating_max: 5, required: true },
      { id: 'q3', order: 2, type: 'yesno', text: 'Akan ikut kegiatan lagi?', options: null, rating_max: 5, required: true },
      { id: 'q4', order: 3, type: 'text', text: 'Saran untuk kegiatan berikutnya?', options: null, rating_max: 5, required: false },
    ] },
  { id: 'sv2', title: 'Preferensi Konten Sosmed', description: 'Draft survey preferensi konten', status: 'draft', mission_id: null, response_count: 0, questions: [] },
];

const MOCK_RESULTS = {
  survey_id: 'sv1', title: 'Kepuasan Kegiatan Bakti Sosial', response_count: 128,
  questions: [
    { id: 'q1', text: 'Seberapa puas Anda dengan kegiatan?', type: 'single', distribution: [
      { label: 'Sangat puas', count: 74, pct: 57.8 }, { label: 'Puas', count: 38, pct: 29.7 }, { label: 'Biasa', count: 12, pct: 9.4 }, { label: 'Kurang', count: 4, pct: 3.1 }] },
    { id: 'q2', text: 'Nilai keseluruhan (1-5)', type: 'rating', average: 4.3, distribution: [
      { label: '1', count: 3 }, { label: '2', count: 5 }, { label: '3', count: 14 }, { label: '4', count: 41 }, { label: '5', count: 65 }] },
    { id: 'q3', text: 'Akan ikut kegiatan lagi?', type: 'yesno', distribution: [{ label: 'Ya', count: 118, pct: 92.2 }, { label: 'Tidak', count: 10, pct: 7.8 }] },
    { id: 'q4', text: 'Saran untuk kegiatan berikutnya?', type: 'text', texts: ['Tambah sesi tanya jawab', 'Lokasi lebih dekat dari pusat kota', 'Sudah bagus, pertahankan', 'Durasi diperpanjang'] },
  ],
};

export function useSurveys() {
  const { data, loading, error, refetch, setData } = useApi('/admin/surveys', { defaultData: MOCK_SURVEYS });
  const { mutate } = useMutation();

  const createSurvey = useCallback(async (p) => {
    try {
      const r = await mutate(() => api.post('/admin/surveys', p));
      refetch();
      return r;
    } catch {
      const fake = {
        id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: p.title,
        description: p.description || '',
        status: 'draft',
        mission_id: null,
        response_count: 0,
        questions: (p.questions || []).map((q, i) => ({
          id: `lq-${i}`,
          order: i,
          type: q.type,
          text: q.text,
          options: q.options || null,
          rating_max: q.rating_max || 5,
          required: q.required !== false,
        })),
      };
      setData((prev) => [fake, ...(prev || [])]);
      return fake;
    }
  }, [mutate, refetch, setData]);

  const updateSurvey = useCallback(async (id, p) => {
    try {
      const r = await mutate(() => api.put(`/admin/surveys/${id}`, p));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).map((x) => x.id === id ? { ...x, ...p } : x));
      return null;
    }
  }, [mutate, refetch, setData]);

  const deleteSurvey = useCallback(async (id) => {
    try {
      const r = await mutate(() => api.delete(`/admin/surveys/${id}`));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).filter((x) => x.id !== id));
      return null;
    }
  }, [mutate, refetch, setData]);

  const publishSurvey = useCallback(async (id) => {
    try {
      const r = await mutate(() => api.post(`/admin/surveys/${id}/publish`));
      refetch();
      return r;
    } catch {
      setData((prev) => (prev || []).map((x) => x.id === id ? { ...x, status: 'open', mission_id: `local-m-${id}` } : x));
      return null;
    }
  }, [mutate, refetch, setData]);

  return { surveys: data || [], loading, error, createSurvey, updateSurvey, deleteSurvey, publishSurvey, refetch };
}

export function useSurveyResults(id) {
  const { data, loading, error, refetch } = useApi(id ? `/admin/surveys/${id}/results` : '/admin/surveys/none/results', { defaultData: MOCK_RESULTS, enabled: !!id });
  return { results: data, loading, error, refetch };
}

const MOCK_RUNNER_SURVEYS = {
  sv1: {
    id: 'sv1', title: 'Kepuasan Kegiatan Bakti Sosial', description: 'Bantu kami menilai kegiatan kemarin. Hanya 4 pertanyaan singkat.', status: 'open',
    questions: [
      { id: 'q1', order: 0, type: 'single', text: 'Seberapa puas Anda dengan kegiatan?', options: ['Sangat puas', 'Puas', 'Biasa', 'Kurang'], rating_max: 5, required: true },
      { id: 'q2', order: 1, type: 'rating', text: 'Nilai keseluruhan kegiatan (1-5)', options: null, rating_max: 5, required: true },
      { id: 'q3', order: 2, type: 'yesno', text: 'Apakah Anda akan ikut kegiatan serupa lagi?', options: null, rating_max: 5, required: true },
      { id: 'q4', order: 3, type: 'text', text: 'Saran untuk kegiatan berikutnya?', options: null, rating_max: 5, required: false },
    ],
  },
  sv2: {
    id: 'sv2', title: 'Preferensi Konten Media Sosial', description: 'Konten seperti apa yang paling kamu suka? 3 pertanyaan singkat.', status: 'open',
    questions: [
      { id: 'q1', order: 0, type: 'single', text: 'Format konten favoritmu?', options: ['Video pendek', 'Foto / Carousel', 'Infografis', 'Teks / Caption'], rating_max: 5, required: true },
      { id: 'q2', order: 1, type: 'multiple', text: 'Topik apa yang ingin kamu lihat? (boleh lebih dari satu)', options: ['Edukasi', 'Hiburan', 'Berita', 'Behind the scene'], rating_max: 5, required: true },
      { id: 'q3', order: 2, type: 'text', text: 'Ide konten yang kamu harapkan?', options: null, rating_max: 5, required: false },
    ],
  },
  sv3: {
    id: 'sv3', title: 'Jam Aktif & Platform Favorit', description: 'Bantu kami memilih waktu & platform terbaik. 3 pertanyaan.', status: 'open',
    questions: [
      { id: 'q1', order: 0, type: 'single', text: 'Kapan kamu paling aktif di media sosial?', options: ['Pagi', 'Siang', 'Sore', 'Malam'], rating_max: 5, required: true },
      { id: 'q2', order: 1, type: 'single', text: 'Platform yang paling sering kamu pakai?', options: ['Instagram', 'TikTok', 'X', 'YouTube', 'Facebook'], rating_max: 5, required: true },
      { id: 'q3', order: 2, type: 'yesno', text: 'Bersedia menerima pengingat saat ada konten baru?', options: null, rating_max: 5, required: true },
    ],
  },
  sv4: {
    id: 'sv4', title: 'Kepuasan Aplikasi SCOUT', description: 'Pendapatmu soal aplikasi. 3 pertanyaan singkat.', status: 'open',
    questions: [
      { id: 'q1', order: 0, type: 'rating', text: 'Seberapa mudah aplikasi ini dipakai? (1-5)', options: null, rating_max: 5, required: true },
      { id: 'q2', order: 1, type: 'single', text: 'Fitur yang paling berguna buatmu?', options: ['Misi', 'Polling', 'Pangkat & XP', 'Toko Poin'], rating_max: 5, required: true },
      { id: 'q3', order: 2, type: 'text', text: 'Apa yang bisa kami tingkatkan?', options: null, rating_max: 5, required: false },
    ],
  },
};

export async function fetchSurvey(id) {
  try {
    return await api.get(`/surveys/${id}`);
  } catch {
    return MOCK_RUNNER_SURVEYS[id] || MOCK_RUNNER_SURVEYS.sv1;
  }
}

export async function submitSurvey(id, answers) {
  try {
    return await api.post(`/surveys/${id}/respond`, { answers });
  } catch (err) {
    // Re-throw real server errors so callers can surface them to the user.
    // Only fall back to the demo result for network/offline failures (no numeric status).
    if (err instanceof ApiError && typeof err.status === 'number') {
      throw err;
    }
    return { response_id: 'demo', xp_awarded: 50 }; // offline/demo fallback
  }
}

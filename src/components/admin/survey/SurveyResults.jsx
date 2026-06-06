import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useSurveyResults } from '../../../hooks/useSurvey';
import { Users, Star, MessageSquare } from 'lucide-react';

const GREEN = '#2D6A4F';
const GOLD  = '#D4A843';
const RED   = '#C0392B';

function HorizBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 100, right: 40, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={96}
          tick={{ fontSize: 12, fill: '#6B6555' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,.08)', fontSize: 12 }}
          formatter={(v, _, p) => [`${v} responden${p.payload.pct != null ? ` (${p.payload.pct}%)` : ''}`, '']}
          labelStyle={{ fontWeight: 700, color: '#1B4332' }}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={GREEN} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ data }) {
  const colors = [GREEN, RED];
  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={3}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,.08)', fontSize: 12 }}
            formatter={(v, n, p) => [`${v} (${p.payload.pct ?? Math.round(v)}%)`, '']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="font-semibold text-[#1B4332]">{d.label}</span>
            <span className="text-[#6B6555]">{d.pct != null ? `${d.pct}%` : d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingChart({ average, distribution }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-black text-[#1B4332]">{average?.toFixed(1)}</span>
        <div className="mb-1 flex items-center gap-1 text-[#D4A843]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} fill={i < Math.round(average) ? '#D4A843' : 'none'} />
          ))}
          <span className="ml-1 text-xs text-[#6B6555]">rata-rata</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={distribution} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6B6555' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,.08)', fontSize: 12 }}
            formatter={(v) => [`${v} responden`, '']}
            labelStyle={{ fontWeight: 700, color: '#1B4332' }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={GOLD} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TextList({ texts }) {
  if (!texts || texts.length === 0) {
    return <p className="text-sm text-[#9A9486] italic">Belum ada jawaban teks.</p>;
  }
  return (
    <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
      {texts.map((t, i) => (
        <li key={i} className="flex items-start gap-2">
          <MessageSquare size={13} className="mt-0.5 shrink-0 text-[#D4A843]" />
          <span className="text-sm text-[#2B2B2B]">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function QuestionCard({ q }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-[#1B4332]">{q.text}</p>
      {(q.type === 'single' || q.type === 'multiple') && q.distribution && (
        <HorizBarChart data={q.distribution} />
      )}
      {q.type === 'yesno' && q.distribution && (
        <DonutChart data={q.distribution} />
      )}
      {q.type === 'rating' && (
        <RatingChart average={q.average} distribution={q.distribution || []} />
      )}
      {q.type === 'text' && (
        <TextList texts={q.texts} />
      )}
    </div>
  );
}

export default function SurveyResults({ surveyId }) {
  const { results, loading, error } = useSurveyResults(surveyId);

  if (loading) {
    return <div className="text-sm text-[#6B6555]">Memuat hasil…</div>;
  }
  if (error) {
    return <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>;
  }
  if (!results) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header summary */}
      <div className="rounded-2xl bg-white p-4 shadow-sm flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-base font-black text-[#1B4332]">{results.title}</h2>
          <p className="text-xs text-[#6B6555]">Hasil survey — data langsung dari responden</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#F5F3EE] px-4 py-2">
          <Users size={15} className="text-[#2D6A4F]" />
          <span className="text-sm font-bold text-[#1B4332]">{results.response_count.toLocaleString('id-ID')}</span>
          <span className="text-xs text-[#6B6555]">responden</span>
        </div>
      </div>

      {/* Per-question cards */}
      {results.questions.map((q) => (
        <QuestionCard key={q.id} q={q} />
      ))}
    </div>
  );
}

import React, { useState } from 'react';
import { useIssues } from '../../../hooks/usePulse';
import TopicManager from './TopicManager';
import IssueCard from './IssueCard';

export default function PulseDashboard() {
  const [topicId, setTopicId] = useState(null);
  const { issues, loading } = useIssues({ topicId });

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-black text-[#1B4332]">Pulse — Top Isu Hari Ini</h1>
        <p className="text-sm text-[#6B6555]">Pantau apa yang sedang dibicarakan dari sumber publik.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <TopicManager onSelectTopic={setTopicId} selectedTopicId={topicId} />

        <section className="space-y-3">
          {loading && <div className="text-sm text-[#6B6555]">Memuat isu…</div>}
          {!loading && issues.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#6B6555] shadow-sm">
              Belum ada isu. Tambahkan watch topic lalu klik ↻ untuk crawl.
            </div>
          )}
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </section>
      </div>
    </div>
  );
}

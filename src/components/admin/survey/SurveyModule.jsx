import React, { useState } from 'react';
import { ArrowLeft, PlusCircle, RefreshCw } from 'lucide-react';
import { useSurveys } from '../../../hooks/useSurvey';
import SurveyList from './SurveyList';
import SurveyBuilder from './SurveyBuilder';
import SurveyResults from './SurveyResults';

export default function SurveyModule() {
  const [view, setView] = useState('list'); // 'list' | 'builder' | 'results'
  const [selectedId, setSelectedId] = useState(null);
  const [editTarget, setEditTarget] = useState(null); // survey object being edited

  const { surveys, loading, createSurvey, updateSurvey, deleteSurvey, publishSurvey, refetch } = useSurveys();

  function goList() { setView('list'); setSelectedId(null); setEditTarget(null); }

  function goBuilder(survey = null) {
    setEditTarget(survey);
    setView('builder');
  }

  function goResults(id) {
    setSelectedId(id);
    setView('results');
  }

  async function handleSave(payload) {
    if (editTarget) {
      await updateSurvey(editTarget.id, payload);
    } else {
      await createSurvey(payload);
    }
    goList();
  }

  return (
    <div>
      {/* Page header */}
      <header className="mb-5 flex items-center gap-3">
        {view !== 'list' && (
          <button
            onClick={goList}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#6B6555] transition hover:bg-[#EDEBE3]"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-black text-[#1B4332]">
            {view === 'list' && 'Survey & Polling'}
            {view === 'builder' && (editTarget ? `Edit: ${editTarget.title}` : 'Buat Survey Baru')}
            {view === 'results' && 'Hasil Survey'}
          </h1>
          {view === 'list' && (
            <p className="text-sm text-[#6B6555]">Buat polling, pantau respons, dan analisis hasil.</p>
          )}
        </div>
        {view === 'list' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#6B6555] transition hover:bg-[#EDEBE3]"
            >
              <RefreshCw size={13} />
              Segarkan
            </button>
            <button
              onClick={() => goBuilder()}
              className="inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2D6A4F]"
            >
              <PlusCircle size={14} />
              Buat survey
            </button>
          </div>
        )}
      </header>

      {/* View content */}
      {view === 'list' && (
        loading
          ? <div className="text-sm text-[#6B6555]">Memuat survey…</div>
          : (
            <SurveyList
              surveys={surveys}
              onCreate={() => goBuilder()}
              onOpenResults={goResults}
              onEdit={(sv) => goBuilder(sv)}
              onPublish={async (id) => { await publishSurvey(id); }}
              onDelete={async (id) => { await deleteSurvey(id); }}
            />
          )
      )}

      {view === 'builder' && (
        <SurveyBuilder
          initial={editTarget}
          onSave={handleSave}
          onCancel={goList}
        />
      )}

      {view === 'results' && (
        <SurveyResults surveyId={selectedId} />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { fetchSurvey, submitSurvey } from '../../hooks/useSurvey';

// ─── Palette ───────────────────────────────────────────────────────────────
const P = {
  primary: '#1B4332',
  primaryMid: '#2D6A4F',
  gold: '#D4A843',
  cream: '#F5F3EE',
  white: '#FFFFFF',
  muted: '#6B6555',
  border: '#DDD9D0',
  text: '#1A1814',
  textSec: '#3D3929',
};

// ─── Question Controls ──────────────────────────────────────────────────────

function SingleChoice({ question, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(question.options || []).map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: 14,
              border: `2px solid ${selected ? P.primary : P.border}`,
              background: selected ? P.primary : P.white,
              color: selected ? P.white : P.text,
              fontSize: 15,
              fontWeight: selected ? 600 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${selected ? P.white : P.border}`,
              background: selected ? P.white : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {selected && <span style={{ width: 10, height: 10, borderRadius: '50%', background: P.primary }} />}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MultipleChoice({ question, value, onChange }) {
  const arr = Array.isArray(value) ? value : [];
  const toggle = (opt) => {
    const next = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
    onChange(next.length ? next : undefined);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(question.options || []).map((opt) => {
        const selected = arr.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: 14,
              border: `2px solid ${selected ? P.primary : P.border}`,
              background: selected ? P.primary : P.white,
              color: selected ? P.white : P.text,
              fontSize: 15,
              fontWeight: selected ? 600 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: `2px solid ${selected ? P.white : P.border}`,
              background: selected ? 'rgba(255,255,255,0.2)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {selected && <Check size={13} color={P.white} strokeWidth={3} />}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RatingControl({ question, value, onChange }) {
  const max = question.rating_max || 5;
  const [hover, setHover] = useState(null);
  const active = hover !== null ? hover : value;
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const filled = active !== undefined && n <= active;
        return (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              border: `2px solid ${filled ? P.gold : P.border}`,
              background: filled ? P.gold : P.white,
              color: filled ? P.white : P.muted,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              transition: 'all 0.15s ease',
            }}
          >
            <Star size={18} fill={filled ? P.white : 'none'} color={filled ? P.white : P.muted} />
            <span>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {[{ label: 'Ya', val: true }, { label: 'Tidak', val: false }].map(({ label, val }) => {
        const selected = value === val;
        return (
          <button
            key={label}
            onClick={() => onChange(val)}
            style={{
              flex: 1,
              padding: '18px 0',
              borderRadius: 16,
              border: `2px solid ${selected ? P.primary : P.border}`,
              background: selected ? P.primary : P.white,
              color: selected ? P.white : P.text,
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TextAnswer({ value, onChange }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      placeholder="Tulis saran Anda di sini..."
      rows={5}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 14,
        border: `2px solid ${P.border}`,
        background: P.white,
        color: P.text,
        fontSize: 15,
        fontFamily: 'inherit',
        resize: 'vertical',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease',
      }}
      onFocus={(e) => { e.target.style.borderColor = P.primary; }}
      onBlur={(e) => { e.target.style.borderColor = P.border; }}
    />
  );
}

// ─── Success Screen ──────────────────────────────────────────────────────────

function SuccessScreen({ xp, onDone }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: P.cream,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        <div style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: P.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(27,67,50,0.3)',
        }}>
          <Check size={44} color={P.white} strokeWidth={3} />
        </div>

        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: P.primary, marginBottom: 8 }}>
            Terima kasih!
          </div>
          <div style={{ fontSize: 15, color: P.muted, lineHeight: 1.6 }}>
            Jawaban Anda telah berhasil dikirim. Kami sangat menghargai partisipasi Anda.
          </div>
        </div>

        <div style={{
          background: P.white,
          borderRadius: 16,
          padding: '16px 32px',
          border: `1px solid ${P.border}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 13, color: P.muted, fontWeight: 500, marginBottom: 4 }}>
            XP Diperoleh
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: P.gold }}>
            +{xp} XP
          </div>
        </div>

        <button
          onClick={onDone}
          style={{
            width: '100%',
            padding: '16px 0',
            borderRadius: 14,
            border: 'none',
            background: P.primary,
            color: P.white,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(27,67,50,0.25)',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          Selesai
        </button>
      </div>
    </div>
  );
}

// ─── Main SurveyRunner ───────────────────────────────────────────────────────

export default function SurveyRunner({ surveyId, onBack, onComplete }) {
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(50);

  useEffect(() => {
    setLoading(true);
    fetchSurvey(surveyId)
      .then((s) => { setSurvey(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, [surveyId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: P.cream,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: `3px solid ${P.border}`,
          borderTopColor: P.primary,
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ color: P.muted, fontSize: 14 }}>Memuat survey...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!survey) {
    return (
      <div style={{ minHeight: '100vh', background: P.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: P.muted, marginBottom: 16 }}>Survey tidak ditemukan.</div>
          <button onClick={onBack} style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: P.primary, color: P.white, cursor: 'pointer', fontWeight: 600 }}>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return <SuccessScreen xp={xpAwarded} onDone={() => { onComplete?.() || onBack?.(); }} />;
  }

  const questions = survey.questions || [];
  const total = questions.length;
  const q = questions[step];
  const currentAnswer = answers[q?.id];

  const isAnswered = (() => {
    if (!q) return true;
    if (q.type === 'multiple') return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    if (q.type === 'text') return true; // text is always optional-safe
    return currentAnswer !== undefined;
  })();

  const canProceed = !q?.required || isAnswered;

  const setAnswer = (val) => {
    setAnswers((prev) => ({ ...prev, [q.id]: val }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = questions
      .filter((qq) => answers[qq.id] !== undefined && answers[qq.id] !== '')
      .map((qq) => ({ question_id: qq.id, value: answers[qq.id] }));
    try {
      const result = await submitSurvey(surveyId, payload);
      setXpAwarded(result.xp_awarded || 50);
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = total > 0 ? (step + 1) / total : 1;

  return (
    <div style={{ minHeight: '100vh', background: P.cream }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 0 32px' }}>

        {/* Header */}
        <div style={{
          background: P.white,
          borderBottom: `1px solid ${P.border}`,
          padding: '16px 20px 14px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          {/* Back + title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px 4px 0',
                display: 'flex',
                alignItems: 'center',
                color: P.muted,
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={22} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: P.muted, fontWeight: 500, marginBottom: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Survey
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: P.primary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {survey.title}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: P.border, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: P.primary,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: P.muted, marginTop: 6, fontWeight: 500 }}>
            Pertanyaan {step + 1} dari {total}
          </div>
        </div>

        {/* Question card */}
        <div style={{ padding: '24px 20px 0' }}>
          {survey.description && step === 0 && (
            <div style={{
              background: `rgba(27,67,50,0.06)`,
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 13,
              color: P.primaryMid,
              lineHeight: 1.6,
            }}>
              {survey.description}
            </div>
          )}

          <div style={{
            background: P.white,
            borderRadius: 20,
            padding: '24px 20px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: P.text, marginBottom: 20, lineHeight: 1.4 }}>
              {q?.text}
              {q?.required && (
                <span style={{ color: '#DC2626', marginLeft: 4, fontSize: 14 }}>*</span>
              )}
            </div>

            {q?.type === 'single' && (
              <SingleChoice question={q} value={currentAnswer} onChange={setAnswer} />
            )}
            {q?.type === 'multiple' && (
              <MultipleChoice question={q} value={currentAnswer} onChange={setAnswer} />
            )}
            {q?.type === 'rating' && (
              <RatingControl question={q} value={currentAnswer} onChange={setAnswer} />
            )}
            {q?.type === 'yesno' && (
              <YesNo value={currentAnswer} onChange={setAnswer} />
            )}
            {q?.type === 'text' && (
              <TextAnswer value={currentAnswer} onChange={setAnswer} />
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <div style={{ padding: '0 20px', display: 'flex', gap: 12 }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                flex: 1,
                padding: '15px 0',
                borderRadius: 14,
                border: `1.5px solid ${P.border}`,
                background: P.white,
                color: P.textSec,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronLeft size={18} />
              Kembali
            </button>
          )}

          {step < total - 1 ? (
            <button
              onClick={() => { if (canProceed) setStep((s) => s + 1); }}
              disabled={!canProceed}
              style={{
                flex: 1,
                padding: '15px 0',
                borderRadius: 14,
                border: 'none',
                background: canProceed ? P.primary : P.border,
                color: canProceed ? P.white : P.muted,
                fontSize: 15,
                fontWeight: 700,
                cursor: canProceed ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                boxShadow: canProceed ? '0 4px 12px rgba(27,67,50,0.2)' : 'none',
              }}
            >
              Lanjut
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => { if (canProceed && !submitting) handleSubmit(); }}
              disabled={!canProceed || submitting}
              style={{
                flex: 1,
                padding: '15px 0',
                borderRadius: 14,
                border: 'none',
                background: canProceed ? P.primary : P.border,
                color: canProceed ? P.white : P.muted,
                fontSize: 15,
                fontWeight: 700,
                cursor: canProceed && !submitting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                boxShadow: canProceed ? '0 4px 12px rgba(27,67,50,0.2)' : 'none',
              }}
            >
              {submitting ? 'Mengirim...' : (
                <>
                  <Check size={18} />
                  Kirim
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

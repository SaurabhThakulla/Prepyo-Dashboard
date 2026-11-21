import React from 'react';
import { EXAM_LABELS, ExamType } from '@/lib/types';
import { PteExamVariant } from '@/lib/pteExamConfig';

/**
 * The exam pills. Switching here re-generates the practice menu. Admin-only,
 * which is also how EPS-TOPIK is reachable before learners are offered it.
 */
export function ExamSwitcher({
  activeExam,
  onChange,
  onBlue = false,
}: {
  activeExam: ExamType;
  onChange: (exam: ExamType) => void;
  /** Set when drawn on the blue sidebar. */
  onBlue?: boolean;
}) {
  const EXAMS: { exam: ExamType; target: string; activeClass: string }[] = [
    { exam: 'PTE', target: '79+', activeClass: 'bg-primary text-white shadow-sm' },
    { exam: 'IELTS', target: '8.0', activeClass: 'bg-amber-500 text-white shadow-sm' },
    { exam: 'EPS_TOPIK', target: '60+', activeClass: 'bg-emerald-600 text-white shadow-sm' },
  ];

  return (
    <div className={`flex items-center p-1 rounded-xl border ${onBlue ? 'bg-white/10 border-white/25' : 'bg-muted/60 border-border'}`}>
      {EXAMS.map(({ exam, target, activeClass }) => (
        <button
          key={exam}
          onClick={() => onChange(exam)}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all ${
            activeExam === exam
              ? onBlue && exam === 'PTE'
                ? 'bg-white text-primary shadow-sm'
                : activeClass
              : onBlue
                ? 'text-white/75 hover:text-white'
                : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="whitespace-nowrap">{EXAM_LABELS[exam]}</span>
          <span className="text-xs opacity-75 font-mono">{target}</span>
        </button>
      ))}
    </div>
  );
}

export function PteVariantSwitcher({
  pteVariant,
  onChange,
  onBlue = false,
}: {
  pteVariant: PteExamVariant;
  onChange: (variant: PteExamVariant) => void;
  onBlue?: boolean;
}) {
  return (
    <div className={`flex items-center p-1 rounded-xl border ${onBlue ? 'bg-white/10 border-white/20' : 'bg-muted/60 border-border'}`}>
      <button
        type="button"
        onClick={() => onChange('academic')}
        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all text-center ${
          pteVariant === 'academic'
            ? 'bg-[#00c4a7] text-white shadow-sm'
            : onBlue
              ? 'text-white/70 hover:text-white'
              : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        PTE Academic
      </button>
      <button
        type="button"
        onClick={() => onChange('core')}
        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all text-center ${
          pteVariant === 'core'
            ? 'bg-[#00c4a7] text-white shadow-sm'
            : onBlue
              ? 'text-white/70 hover:text-white'
              : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        PTE Core
      </button>
    </div>
  );
}

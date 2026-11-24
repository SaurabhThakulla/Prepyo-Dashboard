import React from 'react';
import { EXAM_LABELS, ExamType } from '@/lib/types';
import { PteExamVariant } from '@/lib/pteExamConfig';

// The exams an admin authors for, each with the score it aims learners at.
const EXAMS: { exam: ExamType; target: string }[] = [
  { exam: 'PTE', target: '79+' },
  { exam: 'IELTS', target: '8.0' },
  { exam: 'EPS_TOPIK', target: '60+' },
  // JLPT is pass or fail, at the level the admin picks beside these pills.
  { exam: 'JLPT', target: 'Pass' },
  { exam: 'CDS', target: '140+' },
  // NCC: an 'A' grade needs 70%, so 245 of the 350 written marks.
  { exam: 'NCC', target: '245+' },
];

/**
 * The exam pills, each with its target. Switching re-generates the practice
 * menu. Admin-only, which is also how EPS-TOPIK is reachable before learners
 * are offered it. They size to their text and wrap as a row, so no label is
 * squeezed.
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
  return (
    <div
      role="group"
      aria-label="Exam you are authoring"
      className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl p-1 ring-1 ${onBlue ? 'bg-slate-950/25 ring-white/10' : 'bg-muted/60 ring-border'}`}
    >
      {EXAMS.map(({ exam, target }) => {
        const active = exam === activeExam;
        return (
          <button
            key={exam}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(exam)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              active
                ? onBlue
                  ? 'bg-white text-primary shadow-sm'
                  : 'bg-primary text-white shadow-sm'
                : onBlue
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            {EXAM_LABELS[exam]}
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                active ? (onBlue ? 'bg-primary/10 text-primary' : 'bg-white/20 text-white') : onBlue ? 'bg-white/10 text-white/75' : 'bg-background text-muted-foreground'
              }`}
            >
              {target}
            </span>
          </button>
        );
      })}
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
  const VARIANTS: { id: PteExamVariant; label: string }[] = [
    { id: 'academic', label: 'PTE Academic' },
    { id: 'core', label: 'PTE Core' },
  ];
  return (
    <div className={`inline-flex items-center gap-1 rounded-xl p-1 ring-1 ${onBlue ? 'bg-slate-950/25 ring-white/10' : 'bg-muted/60 ring-border'}`}>
      {VARIANTS.map(({ id, label }) => {
        const active = pteVariant === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              active
                ? 'bg-[#00c4a7] text-white shadow-sm'
                : onBlue
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            {active && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Question } from '@/lib/types';
import { LEVELS, LEVEL_STYLE, paperSource, SOURCE_TAGS } from '@/lib/questionSource';

type Item = Pick<Question, 'tags' | 'difficulty'> & Partial<Pick<Question, 'exam'>>;

/** Short names for the label; the cards spell the source out in full. */
const SHORT: Record<string, string> = { original: 'Prepyo original', exam_memories: 'PTE Tutorials memories' };

/** Where the questions on screen come from, and how many are at each level. */
export function questionSource(questions: Item[], exam?: string) {
  const codes = [...new Set(questions.flatMap(q => (q.tags ?? []).map(t => SOURCE_TAGS[t]).filter(Boolean)))].sort();
  const levels = LEVELS.map(level => [level, questions.filter(q => q.difficulty === level).length] as const).filter(([, n]) => n > 0);
  return { codes, full: paperSource(codes, exam ?? questions[0]?.exam ?? ''), levels };
}

/**
 * A line above a question group, passage, task or item: its source, and its
 * level (with a count per level when the questions on screen differ).
 * `sources` stands in for tags where the content has none (IELTS Speaking sets).
 */
export default function QuestionSource({ questions = [], exam, sources }: { questions?: Item[]; exam?: string; sources?: string[] }) {
  const info = questionSource(questions, exam);
  const codes = info.codes.length ? info.codes : sources ?? [];
  const source = codes.map(c => SHORT[c]).filter(Boolean).join(' · ');
  const full = info.full || paperSource(codes, exam ?? '');
  if (!source && info.levels.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {info.levels.map(([level, n]) => (
        <span key={level} className={`rounded-full px-2 py-0.5 font-bold capitalize ${LEVEL_STYLE[level].chip}`}>
          {level}
          {info.levels.length > 1 ? ` · ${n}` : ''}
        </span>
      ))}
      {source && (
        <span className="inline-flex items-center gap-1 text-muted-foreground" title={full}>
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          {source}
        </span>
      )}
    </div>
  );
}

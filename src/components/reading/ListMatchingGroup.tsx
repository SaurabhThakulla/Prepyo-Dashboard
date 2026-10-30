import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AnswerSubmission, ReadingGroup } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import { READING_TYPES, listAllowsReuse } from '@/lib/readingTypes';
import MatchDnd, { MatchChip, MatchEntry, MatchSlot } from '@/components/reading/MatchDnd';
import { placeEntry, placedEntries } from '@/components/reading/matchRules';

interface ListMatchingGroupProps {
  group: ReadingGroup;
  /** Number of the first question in this group, across the whole paper. */
  startNumber: number;
  answers: Record<string, AnswerSubmission>;
  results?: Record<string, ReadingAnswerResult>;
  disabled?: boolean;
  onAnswer: (questionId: string, patch: Partial<AnswerSubmission>) => void;
}

/**
 * Matching headings, matching features and matching sentence endings.
 *
 * The set prints its list once, the headings i-x, the people A-E or the
 * endings A-I, and each question has a slot the learner drags an entry into.
 * A heading or an ending is used once, so a placed one greys out of the list
 * and dragging it elsewhere moves it. Features may be used more than once and
 * never run out.
 *
 * A sentence beginning reads straight into its slot, so the ending lands where
 * it completes the sentence. Headings and features put the slot under the
 * paragraph name or statement.
 */
export default function ListMatchingGroup({
  group,
  startNumber,
  answers,
  results,
  disabled,
  onAnswer,
}: ListMatchingGroupProps) {
  const reuse = listAllowsReuse(group.typeId);
  const isEnding = group.typeId === READING_TYPES.sentenceEndings;
  const entries: MatchEntry[] = (group.resources ?? []).map(entry => ({
    id: entry.label,
    label: entry.label,
    text: entry.text,
  }));
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const questionIds = group.questions.map(question => question.id);
  const used = reuse ? new Set<string>() : placedEntries(answers, questionIds);
  const marked = group.questions.some(question => results?.[question.id]);
  const locked = disabled || marked;

  const place = (questionId: string, entryId: string) => {
    if (locked || !questionIds.includes(questionId)) return;
    const patches = placeEntry(answers, questionIds, questionId, entryId, reuse);
    for (const [id, selected] of Object.entries(patches)) onAnswer(id, { selectedOptions: selected });
  };

  const graded = group.questions.filter(question => results?.[question.id]);
  const right = graded.filter(question => results?.[question.id]?.attempt.isCorrect).length;

  return (
    <MatchDnd entries={entries} disabled={locked} onPlace={place}>
      <div className="space-y-4 p-3 sm:p-4">
        <section aria-label={group.boxTitle || 'List'} className="rounded-xl border border-border bg-muted/30 p-3">
          {group.boxTitle && <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group.boxTitle}</h4>}
          <div className={`grid gap-1.5 ${isEnding ? '' : 'sm:grid-cols-2'}`}>
            {entries.map(entry => (
              <MatchChip key={entry.id} entry={entry} spent={used.has(entry.id)} />
            ))}
          </div>
          {!locked && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Drag an answer into a box, or tap it and then tap the box. Tap a filled box to empty it.
              {reuse ? ' You may use any letter more than once.' : ''}
            </p>
          )}
        </section>

        <ol className="space-y-3">
          {group.questions.map((question, index) => {
            const number = startNumber + index;
            const chosen = answers[question.id]?.selectedOptions?.[0];
            const result = results?.[question.id];
            const correctId = result?.review.correctAnswers?.[0];
            return (
              <li key={question.id} data-dictionary className="flex items-start gap-3">
                <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-bold tabular-nums text-muted-foreground">
                  {number}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5 text-[13px] sm:text-sm leading-relaxed text-foreground">
                  {isEnding ? (
                    <p className="font-reading text-[15px] leading-loose">
                      {question.prompt}{' '}
                      <MatchSlot
                        inline
                        id={question.id}
                        label={`Question ${number}`}
                        placeholder="drop ending"
                        placed={chosen ? byId.get(chosen) : undefined}
                        verdict={result ? result.attempt.isCorrect : undefined}
                        correct={correctId ? byId.get(correctId) : undefined}
                        onClear={() => onAnswer(question.id, { selectedOptions: [] })}
                      />
                    </p>
                  ) : (
                    <>
                      <p className="font-medium">{question.prompt}</p>
                      <MatchSlot
                        id={question.id}
                        label={`Question ${number}`}
                        placed={chosen ? byId.get(chosen) : undefined}
                        verdict={result ? result.attempt.isCorrect : undefined}
                        correct={correctId ? byId.get(correctId) : undefined}
                        onClear={() => onAnswer(question.id, { selectedOptions: [] })}
                      />
                    </>
                  )}
                  {result && !result.attempt.isCorrect && result.review.explanation && (
                    <p className="text-xs text-muted-foreground">{result.review.explanation}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {graded.length > 0 && <SetScore right={right} total={graded.length} />}
      </div>
    </MatchDnd>
  );
}

/** One line under a marked set: all right, or how many. */
export function SetScore({ right, total }: { right: number; total: number }) {
  return (
    <div className="border-t border-border/70 pt-2">
      {right === total ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          All {total} correct
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
          <XCircle className="h-3.5 w-3.5" />
          {right} of {total} correct. The right answer is shown beside each wrong one.
        </p>
      )}
    </div>
  );
}

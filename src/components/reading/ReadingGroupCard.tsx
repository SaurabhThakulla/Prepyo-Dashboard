import React from 'react';
import { Card } from '@/components/ui/card';
import { AnswerSubmission, ReadingGroup } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import ReadingQuestionRow, { isAnswered } from '@/components/reading/ReadingQuestionRow';
import ReadingParagraphGroup from '@/components/reading/ReadingParagraphGroup';
import ListMatchingGroup from '@/components/reading/ListMatchingGroup';
import SummaryGroup from '@/components/reading/SummaryGroup';
import DiagramGroup from '@/components/reading/DiagramGroup';
import { READING_TYPES, isGapFill, isListMatching } from '@/lib/readingTypes';
import { findPteTaskConfig } from '@/lib/pteExamConfig';

interface ReadingGroupCardProps {
  group: ReadingGroup;
  /** Number of the first question in this group, across the whole paper. */
  startNumber: number;
  answers: Record<string, AnswerSubmission>;
  results?: Record<string, ReadingAnswerResult>;
  disabled?: boolean;
  onAnswer: (questionId: string, patch: Partial<AnswerSubmission>) => void;
}

/**
 * One task set, laid out like the other practice pages: a round task-code
 * badge, the task name and instructions, then the questions in a card under a
 * blue bar with the question numbers and title.
 */
export default function ReadingGroupCard({
  group,
  startNumber,
  answers,
  results,
  disabled,
  onAnswer,
}: ReadingGroupCardProps) {
  // A gap-fill draws its words from the set. Every other task that carries
  // resources — the boxes of an ordering task — shows them above the questions.
  const wordBank = isGapFill(group.typeId) ? group.resources : undefined;
  // These print their own list or box of words, laid out for dragging.
  const ownLayout = isListMatching(group.typeId) || group.typeId === READING_TYPES.summaryCompletion;

  const total = group.questions.length;
  const answered = group.questions.filter(question => isAnswered(answers[question.id])).length;
  const endNumber = startNumber + total - 1;

  // The exam's own short code (FIB-D, RO), else the task name's initials.
  const isPte = group.questions[0]?.exam === 'PTE';
  const code =
    (isPte && findPteTaskConfig(group.typeName)?.code) ||
    group.typeName.split(/[\s:&,/()-]+/).filter(Boolean).slice(0, 3).map(word => word[0]).join('').toUpperCase();

  // A single-question set names its text in the bar ("The birth of time zones").
  const same = (a?: string, b?: string) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
  const onlyTitle = total === 1 ? group.questions[0].title?.trim() : '';
  const heading = onlyTitle && !same(onlyTitle, group.instructions) ? onlyTitle : '';

  return (
    <Card className="p-3.5 sm:p-5 space-y-4 bg-card dark:bg-[#0f141f] border-border/80 border-r-0 rounded-r-none rounded-l-lg shadow-2xs">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 px-2 text-xs sm:text-sm font-bold text-primary-foreground shadow-md">
          {code}
        </span>
        <div className="min-w-0 flex-1 space-y-1 pt-0.5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-primary leading-tight">{group.typeName}</h2>
            <span className="shrink-0 rounded-full bg-primary/[0.07] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-primary">
              {answered}/{total} answered
            </span>
          </div>
          {group.instructions && (
            <p className="text-sm text-muted-foreground leading-relaxed">{group.instructions}</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/75 px-4 py-3 text-primary-foreground dark:!bg-muted dark:!text-foreground sm:px-5">
          <span className="rounded-lg bg-white/15 px-2.5 py-0.5 text-sm font-bold tabular-nums">
            {total > 1 ? `#${startNumber}–${endNumber}` : `#${startNumber}`}
          </span>
          {(heading || group.boxTitle) && <span className="h-5 w-px bg-white/40" aria-hidden />}
          {(heading || group.boxTitle) && (
            <h3 className="text-sm sm:text-base font-semibold leading-snug">{heading || group.boxTitle}</h3>
          )}
        </div>

        {!wordBank && !ownLayout && group.resources && group.resources.length > 0 && (
          <div className="space-y-1.5 p-3 sm:p-4 pb-0 sm:pb-0">
            {group.resources.map(resource => (
              <div key={resource.label} className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-0.5">
                <span className="text-xs font-bold text-primary">{resource.label}</span>
                <p className="text-xs text-foreground leading-normal">{resource.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Sentence completion is printed as running text with gaps, the way the
            paper does it. Every other task lists its questions one per row. */}
        {isListMatching(group.typeId) ? (
          <ListMatchingGroup
            group={group}
            startNumber={startNumber}
            answers={answers}
            results={results}
            disabled={disabled}
            onAnswer={onAnswer}
          />
        ) : group.typeId === READING_TYPES.summaryCompletion ? (
          <SummaryGroup
            group={group}
            startNumber={startNumber}
            answers={answers}
            results={results}
            disabled={disabled}
            onAnswer={onAnswer}
          />
        ) : group.typeId === READING_TYPES.diagramLabel ? (
          <DiagramGroup
            group={group}
            startNumber={startNumber}
            answers={answers}
            results={results}
            disabled={disabled}
            onAnswer={onAnswer}
          />
        ) : group.typeId === READING_TYPES.sentenceCompletion ? (
          <div className="p-3 sm:p-4">
            <ReadingParagraphGroup
              group={group}
              startNumber={startNumber}
              answers={answers}
              results={results}
              disabled={disabled}
              onAnswer={onAnswer}
            />
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {group.questions.map((question, index) => (
              <ReadingQuestionRow
                key={question.id}
                question={question}
                number={startNumber + index}
                answer={answers[question.id]}
                result={results?.[question.id]}
                disabled={disabled}
                resources={group.resources}
                hidePrompt={same(question.prompt, group.instructions) || same(question.prompt, heading)}
                hideNumber={total === 1}
                onChange={patch => onAnswer(question.id, patch)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

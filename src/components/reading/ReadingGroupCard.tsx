import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AnswerSubmission, ReadingGroup } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import ReadingQuestionRow from '@/components/reading/ReadingQuestionRow';

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
 * One task set: the instruction line, any material the task carries with it,
 * and the questions.
 *
 * `resources` is where an ordering task keeps its boxes. Without them the
 * questions reference paragraphs that appear nowhere, so they render above the
 * questions rather than being treated as optional decoration.
 */
export default function ReadingGroupCard({
  group,
  startNumber,
  answers,
  results,
  disabled,
  onAnswer,
}: ReadingGroupCardProps) {
  const last = startNumber + group.questions.length - 1;

  return (
    <Card className="p-5 space-y-3">
      <div className="space-y-1.5 border-b border-border pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="default">{group.typeName}</Badge>
          <span className="text-[11px] text-muted-foreground font-mono">
            {startNumber === last ? `Q${startNumber}` : `Q${startNumber}–${last}`}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{group.instructions}</p>
      </div>

      {group.resources && group.resources.length > 0 && (
        <div className="space-y-1.5">
          {group.resources.map(resource => (
            <div key={resource.label} className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
              <span className="text-[11px] font-bold text-primary">{resource.label}</span>
              <p className="text-xs text-foreground leading-relaxed">{resource.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {group.questions.map((question, index) => (
          <ReadingQuestionRow
            key={question.id}
            question={question}
            number={startNumber + index}
            answer={answers[question.id]}
            result={results?.[question.id]}
            disabled={disabled}
            onChange={patch => onAnswer(question.id, patch)}
          />
        ))}
      </div>
    </Card>
  );
}

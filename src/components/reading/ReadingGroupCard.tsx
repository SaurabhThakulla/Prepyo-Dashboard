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
    <Card className="p-5 sm:p-6 space-y-4 bg-card dark:bg-[#0f141f] border-border/80 shadow-md rounded-2xl">
      <div className="space-y-2 border-b border-border/80 pb-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="default" className="text-xs px-2.5 py-0.5 font-bold shadow-xs">
            {group.typeName}
          </Badge>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 font-mono">
            {startNumber === last ? `Question ${startNumber}` : `Questions ${startNumber}–${last}`}
          </span>
        </div>
        <p className="text-xs sm:text-[13px] text-muted-foreground font-medium leading-relaxed">{group.instructions}</p>
      </div>

      {group.resources && group.resources.length > 0 && (
        <div className="space-y-2">
          {group.resources.map(resource => (
            <div key={resource.label} className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1">
              <span className="text-xs font-bold text-primary">{resource.label}</span>
              <p className="text-sm text-foreground leading-relaxed">{resource.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
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

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AnswerSubmission, ReadingGroup } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import ReadingQuestionRow from '@/components/reading/ReadingQuestionRow';
import { isGapFill } from '@/lib/readingTypes';

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
 * Compact & strict Question Group container with minimal whitespace.
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
  const wordBank = isGapFill(group.typeId) ? group.resources : undefined;

  return (
    <Card className="p-3.5 sm:p-4 space-y-2.5 bg-card dark:bg-[#0f141f] border-border/80 border-r-0 rounded-r-none rounded-l-lg shadow-2xs">
      <div className="space-y-1 border-b border-border/70 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="default" className="text-[11px] px-2 py-0.5 font-bold shadow-xs">
            {group.typeName}
          </Badge>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 font-mono">
            {startNumber === last ? `Question ${startNumber}` : `Questions ${startNumber}–${last}`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-medium leading-tight">{group.instructions}</p>
      </div>

      {!wordBank && group.resources && group.resources.length > 0 && (
        <div className="space-y-1.5">
          {group.resources.map(resource => (
            <div key={resource.label} className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-0.5">
              <span className="text-xs font-bold text-primary">{resource.label}</span>
              <p className="text-xs text-foreground leading-normal">{resource.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {group.questions.map((question, index) => (
          <ReadingQuestionRow
            key={question.id}
            question={question}
            number={startNumber + index}
            answer={answers[question.id]}
            result={results?.[question.id]}
            disabled={disabled}
            wordBank={wordBank}
            onChange={patch => onAnswer(question.id, patch)}
          />
        ))}
      </div>
    </Card>
  );
}

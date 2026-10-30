import React, { useMemo } from 'react';
import { Blank } from '@/lib/types';
import { Check, X } from 'lucide-react';

// Note-style passages number their gaps as "____ (1)"; they become [[1]] markers.
const numberedGaps = (passage: string) => passage.replace(/_{2,}\s*\((\d+)\)/g, '[[$1]]');

export function passageHasGaps(passage?: string | null): boolean {
  if (!passage) return false;
  return /\[\[[\w-]+\]\]/.test(numberedGaps(passage));
}

interface InlineBlankPassageProps {
  passage: string;
  blanks?: Blank[];
  responses: Record<string, string>;
  disabled?: boolean;
  reviewBlanks?: Blank[];
  onChange: (responses: Record<string, string>) => void;
  className?: string;
}

export default function InlineBlankPassage({
  passage,
  blanks = [],
  responses,
  disabled = false,
  reviewBlanks,
  onChange,
  className = '',
}: InlineBlankPassageProps) {
  // Splitting with a capturing group interleaves text and gap markers
  const parts = useMemo(() => numberedGaps(passage).split(/\[\[([\w-]+)\]\]/g), [passage]);

  const blankById = useMemo(() => new Map(blanks.map(b => [b.id, b])), [blanks]);
  const reviewById = useMemo(
    () => new Map((reviewBlanks ?? []).map(b => [b.id, b])),
    [reviewBlanks],
  );

  let gapCount = 0;

  return (
    <div
      className={`p-4 sm:p-5 rounded-xl bg-background border border-border text-[15px] sm:text-[16px] text-foreground leading-[2.6] whitespace-pre-line max-h-96 overflow-y-auto select-text ${className}`}
    >
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }

        const gapIndex = gapCount++;
        const marker = part;

        // Resolve blank definition by id, prefix/suffix, or position
        const blank =
          blankById.get(marker) ||
          blankById.get(`b${marker}`) ||
          blanks.find(b => `b${b.id}` === marker) ||
          blanks[gapIndex] ||
          { id: marker };

        const blankId = blank.id;
        const currentVal = responses[blankId] || '';

        const reviewBlank =
          reviewById.get(blankId) ||
          reviewById.get(marker) ||
          (reviewBlanks ? reviewBlanks[gapIndex] : undefined);

        const correctAnswer = reviewBlank?.correctAnswer?.trim();
        const isReviewed = Boolean(correctAnswer !== undefined && correctAnswer !== '');
        const isCorrect = isReviewed
          ? currentVal.trim().toLowerCase() === correctAnswer!.toLowerCase()
          : undefined;

        let tone =
          'bg-card border-input text-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/40';
        if (disabled && !isReviewed) {
          tone = 'bg-muted/40 border-border text-muted-foreground cursor-not-allowed opacity-80';
        } else if (isReviewed) {
          if (isCorrect) {
            tone =
              'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30';
          } else {
            tone =
              'border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-300 font-semibold ring-1 ring-rose-500/30';
          }
        }

        return (
          <span
            key={index}
            className="inline-flex items-center align-middle mx-1.5 my-0.5 whitespace-nowrap"
          >
            <input
              type="text"
              id={`blank-gap-${blankId}`}
              name={`blank-${blankId}`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={currentVal}
              disabled={disabled}
              onChange={e => onChange({ ...responses, [blankId]: e.target.value })}
              placeholder={`Blank ${gapIndex + 1}`}
              aria-label={`Blank ${gapIndex + 1}`}
              className={`inline-block w-32 sm:w-40 h-9 px-3 rounded-lg border text-sm sm:text-[15px] font-semibold shadow-2xs transition-all focus:outline-none ${tone}`}
            />
            {isReviewed && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-xs">
                {isCorrect ? (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    title="Correct"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      title="Incorrect"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 text-[11px]"
                      title={`Correct answer: ${correctAnswer}`}
                    >
                      {correctAnswer}
                    </span>
                  </span>
                )}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

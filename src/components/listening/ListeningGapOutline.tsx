import React from 'react';
import { Check, X } from 'lucide-react';
import { Blank } from '@/lib/types';
import { blankFor, gapAccepts, gapPieces, outlineBlocks } from '@/lib/listeningTypes';

interface ListeningGapOutlineProps {
  /** The printed outline, gaps written "____ (1)". */
  passage: string;
  blanks?: Blank[];
  responses: Record<string, string>;
  disabled?: boolean;
  /** The marked key, after submission. */
  reviewBlanks?: Blank[];
  onChange: (responses: Record<string, string>) => void;
}

/**
 * IELTS Listening table, flow-chart, summary, note, diagram-label and
 * short-answer completion: the outline as the paper prints it, with a typed
 * box at each numbered gap. Tables (lines written "| a | b |") become real
 * tables, scrolling sideways inside their frame on a phone; a line holding
 * only an arrow is a flow-chart step. Each box carries its question number,
 * which is also the number on a diagram.
 */
export default function ListeningGapOutline({
  passage,
  blanks,
  responses,
  disabled = false,
  reviewBlanks,
  onChange,
}: ListeningGapOutlineProps) {
  const blocks = outlineBlocks(passage);

  const renderPieces = (text: string) =>
    gapPieces(text).map((piece, index) =>
      piece.gap ? (
        <GapBox
          key={index}
          number={piece.gap}
          blankId={blankFor(blanks, piece.gap)?.id ?? piece.gap}
          responses={responses}
          disabled={disabled}
          review={reviewBlanks ? blankFor(reviewBlanks, piece.gap) : undefined}
          onChange={onChange}
        />
      ) : (
        <React.Fragment key={index}>{piece.text}</React.Fragment>
      ),
    );

  return (
    <div data-testid="listening-outline" className="space-y-3 rounded-xl border border-border bg-background p-3 text-[15px] leading-relaxed text-foreground sm:p-4 sm:text-base">
      {blocks.map((block, blockIndex) => {
        if (block.kind === 'table') {
          const [head, ...body] = block.rows;
          const headHasGap = gapPieces(head.join(' ')).some(piece => piece.gap);
          const rows = headHasGap ? block.rows : body;
          const columns = Math.max(...block.rows.map(row => row.length));
          return (
            <div key={blockIndex} className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[34rem] border-collapse text-left text-sm sm:text-[15px]">
                {!headHasGap && (
                  <thead className="bg-muted/50">
                    <tr>
                      {Array.from({ length: columns }, (_, i) => (
                        <th key={i} scope="col" className="border-b border-border px-3 py-2 font-semibold">
                          {head[i] ?? ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border last:border-b-0 align-top">
                      {Array.from({ length: columns }, (_, i) => (
                        <td key={i} className="px-3 py-2 leading-loose">
                          {renderPieces(row[i] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        // A title line above the outline, as the paper prints one.
        if (blockIndex === 0 && block.lines.length === 1 && !gapPieces(block.lines[0]).some(piece => piece.gap)) {
          return (
            <h4 key={blockIndex} className="font-display text-base font-bold text-foreground">
              {block.lines[0]}
            </h4>
          );
        }
        return (
          <div key={blockIndex} className="space-y-1.5">
            {block.lines.map((line, lineIndex) => {
              if (/^[↓⬇]$/.test(line)) {
                return (
                  <div key={lineIndex} className="text-center text-lg leading-none text-primary" aria-hidden>
                    ↓
                  </div>
                );
              }
              const bullet = line.startsWith('- ');
              const step = block.lines.some(other => /^[↓⬇]$/.test(other));
              return (
                <p
                  key={lineIndex}
                  className={`leading-loose ${bullet ? 'flex gap-2' : ''} ${step ? 'rounded-lg border border-border bg-card px-3 py-1.5 text-center' : ''}`}
                >
                  {bullet && <span aria-hidden className="text-primary">•</span>}
                  <span>{renderPieces(bullet ? line.slice(2) : line)}</span>
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

interface GapBoxProps {
  number: string;
  blankId: string;
  responses: Record<string, string>;
  disabled: boolean;
  review?: Blank;
  onChange: (responses: Record<string, string>) => void;
}

function GapBox({ number, blankId, responses, disabled, review, onChange }: GapBoxProps) {
  const value = responses[blankId] ?? '';
  const marked = Boolean(review?.correctAnswer);
  const right = marked && gapAccepts(review, value);
  const tone = !marked
    ? 'border-primary/50 bg-card focus:border-primary focus:ring-2 focus:ring-primary/30'
    : right
      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
      : 'border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-200';
  return (
    <span className="mx-1 inline-flex flex-wrap items-center gap-1 align-middle">
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground tabular-nums">
        {number}
      </span>
      <input
        type="text"
        value={value}
        disabled={disabled || marked}
        onChange={event => onChange({ ...responses, [blankId]: event.target.value })}
        aria-label={`Question ${number}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`h-8 w-32 rounded-md border px-2 text-sm font-semibold outline-none transition-colors disabled:opacity-100 sm:w-40 ${tone}`}
      />
      {marked &&
        (right ? (
          <Check className="h-4 w-4 text-emerald-600" aria-label="Correct" />
        ) : (
          <>
            <X className="h-4 w-4 text-rose-600" aria-label="Incorrect" />
            <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
              {review!.correctAnswer}
            </span>
          </>
        ))}
    </span>
  );
}

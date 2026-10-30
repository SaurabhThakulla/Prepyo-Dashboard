import React from 'react';
import { Blank, Question, QuestionOption } from '@/lib/types';
import MatchDnd, { MatchChip, MatchEntry, MatchSlot } from '@/components/reading/MatchDnd';
import { placeEntry, placedEntries } from '@/components/reading/matchRules';
import { blankFor, gapAccepts, gapPieces, lettersMayRepeat } from '@/lib/listeningTypes';

export interface LetterItem {
  /** Where the answer is kept: a blank id (practice) or a question id (mock). */
  slot: string;
  number: number;
  text: string;
}

interface ListeningLetterBoardProps {
  /** The box: options lettered A, B, C ... A diagram's box holds bare letters. */
  options: QuestionOption[];
  items: LetterItem[];
  /** Letter placed in each slot. */
  values: Record<string, string | undefined>;
  /** Whether a letter may answer more than one question. */
  reuse: boolean;
  disabled?: boolean;
  /** Letters to set; '' empties a slot. */
  onChange: (patch: Record<string, string>) => void;
  /** After marking: the right letter for each slot, and whether the placed one was it. */
  review?: Record<string, { correct?: string; right: boolean }>;
  boxTitle?: string;
}

/**
 * IELTS Listening matching, and diagram labelling from a list of letters, as
 * the computer-delivered test sets them: the box once, a drop box beside each
 * numbered question, and the letter dragged across. On a phone, or without a
 * mouse, tap a letter and then the question (MatchDnd). A box that uses each
 * letter once greys a letter out when it is placed, and placing it again moves
 * it; a box whose instruction says "more than once" never runs out.
 */
export default function ListeningLetterBoard({
  options,
  items,
  values,
  reuse,
  disabled,
  onChange,
  review,
  boxTitle = 'Options',
}: ListeningLetterBoardProps) {
  const bare = options.every(option => option.text.trim() === option.id);
  const entries: MatchEntry[] = options.map(option => ({
    id: option.id,
    label: option.id,
    text: bare ? '' : option.text,
  }));
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const slots = items.map(item => item.slot);
  const answers = Object.fromEntries(
    slots.map(slot => [slot, values[slot] ? { questionId: slot, selectedOptions: [values[slot]!] } : undefined]),
  );
  const used = reuse ? new Set<string>() : placedEntries(answers, slots);
  const locked = Boolean(disabled || review);

  const place = (slot: string, entryId: string) => {
    if (locked || !slots.includes(slot)) return;
    const patches = placeEntry(answers, slots, slot, entryId, reuse);
    onChange(Object.fromEntries(Object.entries(patches).map(([id, chosen]) => [id, chosen[0] ?? ''])));
  };

  return (
    <MatchDnd entries={entries} disabled={locked} onPlace={place}>
      <div className="space-y-4">
        <section aria-label={boxTitle} className="rounded-xl border border-border bg-muted/30 p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{boxTitle}</h4>
          <div className={bare ? 'grid grid-cols-4 gap-1.5 sm:grid-cols-8' : 'grid gap-1.5 sm:grid-cols-2'}>
            {entries.map(entry => (
              <MatchChip key={entry.id} entry={entry} spent={used.has(entry.id)} />
            ))}
          </div>
          {!locked && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Drag a letter into a box, or tap it and then tap the box. Tap a filled box to empty it.
              {reuse ? ' You may use any letter more than once.' : ' Each letter can be used only once.'}
            </p>
          )}
        </section>

        <ol className="space-y-3">
          {items.map(item => {
            const chosen = values[item.slot];
            const mark = review?.[item.slot];
            return (
              <li key={item.slot} className="flex items-start gap-3">
                <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold tabular-nums text-primary-foreground">
                  {item.number}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5 text-sm leading-relaxed text-foreground sm:text-[15px]">
                  {item.text && <p className="font-medium">{item.text}</p>}
                  <MatchSlot
                    id={item.slot}
                    label={`Question ${item.number}`}
                    placeholder={bare ? 'Drop a letter' : 'Drop answer here'}
                    placed={chosen ? byId.get(chosen) : undefined}
                    verdict={mark ? mark.right : undefined}
                    correct={mark?.correct ? byId.get(mark.correct) : undefined}
                    onClear={() => onChange({ [item.slot]: '' })}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </MatchDnd>
  );
}

interface ListeningLetterPracticeProps {
  question: Question;
  responses: Record<string, string>;
  disabled?: boolean;
  reviewBlanks?: Blank[];
  onChange: (responses: Record<string, string>) => void;
}

/**
 * A practice item answered from a box: its outline's lines with a gap are the
 * questions (the words before the gap name the item), other lines are printed
 * as they are, and the answers go into the item's blanks like typed gaps, so
 * the server marks them the same way.
 */
export function ListeningLetterPractice({ question, responses, disabled, reviewBlanks, onChange }: ListeningLetterPracticeProps) {
  const lines = (question.contextPassage ?? '').replace(/\r\n/g, '\n').split('\n').map(line => line.trim());
  const items: LetterItem[] = [];
  const notes: string[] = [];
  for (const line of lines) {
    const gap = gapPieces(line).find(piece => piece.gap)?.gap;
    if (!gap) {
      if (line && items.length === 0) notes.push(line);
      continue;
    }
    const text = gapPieces(line)
      .filter(piece => piece.text)
      .map(piece => piece.text)
      .join(' ')
      .trim();
    items.push({ slot: blankFor(question.blanks, gap)?.id ?? gap, number: Number(gap), text });
  }

  const review = reviewBlanks
    ? Object.fromEntries(
        items.map(item => {
          const key = blankFor(reviewBlanks, String(item.number));
          return [item.slot, { correct: key?.correctAnswer, right: gapAccepts(key, responses[item.slot]) }];
        }),
      )
    : undefined;

  return (
    <div data-dictionary className="space-y-3 rounded-xl border border-border bg-background p-3 sm:p-4">
      {notes.map((note, index) =>
        index === 0 ? (
          <h4 key={index} className="font-display text-base font-bold text-foreground">{note}</h4>
        ) : (
          <p key={index} className="text-sm text-foreground">{note}</p>
        ),
      )}
      <ListeningLetterBoard
        options={question.options ?? []}
        items={items}
        values={responses}
        reuse={lettersMayRepeat(question.prompt)}
        disabled={disabled}
        review={review}
        boxTitle={question.typeId === 'ielts-listening-diagram' ? 'Letters on the diagram' : 'Options'}
        onChange={patch => onChange({ ...responses, ...patch })}
      />
    </div>
  );
}

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
 * IELTS Listening matching from a box of worded options: the box once, a drop
 * box beside each numbered question, and the option dragged across. On a
 * phone, or without a mouse, tap an option and then the question (MatchDnd). A
 * box that uses each letter once greys an option out when it is placed, and
 * placing it again moves it; a box whose instruction says "more than once"
 * never runs out.
 */
function LetterDrag({ options, items, values, reuse, disabled, onChange, review, boxTitle = 'Options' }: ListeningLetterBoardProps) {
  const entries: MatchEntry[] = options.map(option => ({ id: option.id, label: option.id, text: option.text }));
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
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <section aria-label={boxTitle} className="rounded-2xl bg-muted/50 p-3.5 lg:sticky lg:top-20 lg:order-last">
          <h4 className="mb-3 text-sm font-bold text-foreground">{boxTitle}</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {entries.map(entry => (
              <MatchChip key={entry.id} entry={entry} spent={used.has(entry.id)} />
            ))}
          </div>
          {!locked && (
            <p className="mt-3 text-xs leading-snug text-muted-foreground">
              Drag a letter into a box, or tap it and then tap the box. Tap a filled box to empty it.
              {reuse ? ' You may use any letter more than once.' : ' Each letter can be used only once.'}
            </p>
          )}
        </section>

        <ol className="space-y-1">
          {items.map(item => {
            const chosen = values[item.slot];
            const mark = review?.[item.slot];
            return (
              <li
                key={item.slot}
                id={`lq-${item.number}`}
                className="flex scroll-mt-24 flex-col gap-2 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold tabular-nums text-primary-foreground">
                    {item.number}
                  </span>
                  {item.text && <p className="pt-0.5 text-base font-medium leading-relaxed text-foreground">{item.text}</p>}
                </div>
                <div className="pl-9 sm:w-64 sm:shrink-0 sm:pl-0">
                  <MatchSlot
                    id={item.slot}
                    label={`Question ${item.number}`}
                    placeholder="Drop answer here"
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

/** Worded options are dragged into place; a map's or diagram's bare letters are ticked in a grid. */
export default function ListeningLetterBoard(props: ListeningLetterBoardProps) {
  const bare = props.options.every(option => option.text.trim() === option.id);
  return bare ? <LetterGrid {...props} /> : <LetterDrag {...props} />;
}

/**
 * Map or diagram labelling, laid out as the computer-delivered test does: a
 * grid with a row for each numbered question and a column for each letter on
 * the picture. Tap a circle to choose; tap it again to clear. Where each letter
 * may be used once, choosing one that is already used moves it here.
 */
function LetterGrid({
  options,
  items,
  values,
  reuse,
  disabled,
  onChange,
  review,
  boxTitle = 'Options',
}: ListeningLetterBoardProps) {
  const slots = items.map(item => item.slot);
  const answers = Object.fromEntries(
    slots.map(slot => [slot, values[slot] ? { questionId: slot, selectedOptions: [values[slot]!] } : undefined]),
  );
  const locked = Boolean(disabled || review);

  const choose = (slot: string, letter: string) => {
    if (locked) return;
    if (values[slot] === letter) {
      onChange({ [slot]: '' });
      return;
    }
    const patches = placeEntry(answers, slots, slot, letter, reuse);
    onChange(Object.fromEntries(Object.entries(patches).map(([id, chosen]) => [id, chosen[0] ?? ''])));
  };

  return (
    <div className="max-w-4xl space-y-5">

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-y-1 text-base" aria-label={boxTitle}>
          <thead>
            <tr>
              <th scope="col" className="sr-only">Question</th>
              {options.map(option => (
                <th key={option.id} scope="col" className="w-11 pb-1 text-center text-sm font-bold text-muted-foreground">
                  {option.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const chosen = values[item.slot];
              const mark = review?.[item.slot];
              return (
                <tr key={item.slot} id={`lq-${item.number}`} className="scroll-mt-24">
                  <th scope="row" className="rounded-l-xl bg-muted/30 py-2.5 pl-3 pr-4 text-left font-medium">
                    <span className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold tabular-nums text-primary-foreground">
                        {item.number}
                      </span>
                      <span className="text-foreground">{item.text}</span>
                    </span>
                  </th>
                  {options.map((option, index) => {
                    const on = chosen === option.id;
                    const isKey = mark?.correct === option.id;
                    const tone = on
                      ? mark
                        ? mark.right
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-rose-500 bg-rose-500 text-white'
                        : 'border-primary bg-primary text-primary-foreground'
                      : isKey && mark && !mark.right
                        ? 'border-emerald-500 text-emerald-600 ring-2 ring-emerald-500/30'
                        : 'border-muted-foreground/30 text-transparent hover:border-primary hover:text-primary/60';
                    return (
                      <td key={option.id} className={`bg-muted/30 text-center ${index === options.length - 1 ? 'rounded-r-xl' : ''}`}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={`Question ${item.number}: ${option.id}`}
                          disabled={locked}
                          onClick={() => choose(item.slot, option.id)}
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default ${tone}`}
                        >
                          {option.id}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!locked && !reuse && <p className="text-xs text-muted-foreground">Each letter can be used only once.</p>}
    </div>
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
    <div data-dictionary className="space-y-3">
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

import React, { useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import AnswerSelect from '@/components/ui/answer-select';
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Blank, ReadingParagraph } from '@/lib/types';

interface BlankedTextProps {
  /** The gapped text, carrying [[bN]] markers where the gaps go. */
  text: string;
  blanks: Blank[];
  /** The learner's answers so far, keyed by blank id. */
  value: Record<string, string>;
  disabled?: boolean;
  /**
   * The word bank, for gaps that are filled by dragging rather than choosing.
   * Absent for the dropdown form, where each blank carries its own options.
   */
  wordBank?: ReadingParagraph[];
  /** Blank id to correct answer, present only after the answer is checked. */
  correct?: Record<string, string>;
  onChange: (responses: Record<string, string>) => void;
}

/**
 * The gapped text both Fill in the Blanks tasks are answered on.
 *
 * Two forms of the same task. Reading & Writing gives every gap its own list of
 * choices, so each one is a dropdown. Reading gives one pool of words shared
 * across the gaps — with more words than gaps — so those are dragged in.
 *
 * The drag form is also answerable by clicking: pick a word, then pick a gap.
 * That is the keyboard path, and it is not a lesser one — both routes write the
 * same `blankResponses`.
 */
export default function BlankedText({
  text,
  blanks,
  value,
  disabled,
  wordBank,
  correct,
  onChange,
}: BlankedTextProps) {
  // The word a click-to-place learner has picked up but not yet put down.
  const [armed, setArmed] = useState<string | null>(null);

  const byId = useMemo(() => new Map(blanks.map(blank => [blank.id, blank])), [blanks]);

  // Splitting on a capturing group interleaves the ids with the prose, so odd
  // indexes are gaps and even ones are text.
  const parts = useMemo(() => text.split(/\[\[(\w+)\]\]/), [text]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  // The word being dragged, drawn in an overlay so the scrolling question
  // column cannot clip it on its way up to the text.
  const [dragging, setDragging] = useState<string | null>(null);
  // A drop is followed by a click on the chip that was dragged; without this it
  // would pick the word straight back up.
  const justDropped = useRef(false);

  const place = (blankId: string, word: string) => {
    if (disabled) return;
    onChange({ ...value, [blankId]: word });
    setArmed(null);
  };

  const clear = (blankId: string) => {
    if (disabled) return;
    const next = { ...value };
    delete next[blankId];
    onChange(next);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setArmed(null);
    setDragging(String(event.active.id).replace(/^word:/, ''));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    justDropped.current = true;
    setTimeout(() => {
      justDropped.current = false;
    }, 0);
    const { active, over } = event;
    if (!over) return;
    place(String(over.id), String(active.id).replace(/^word:/, ''));
  };

  // A word already sitting in a gap is out of the bank.
  const used = new Set(Object.values(value));

  const body = (
    <p className="font-reading text-[17px] sm:text-[18px] leading-[2.3] text-foreground/90">
      {parts.map((part, index) => {
        if (index % 2 === 0) return <React.Fragment key={index}>{part}</React.Fragment>;

        const blank = byId.get(part);
        if (!blank) return <React.Fragment key={index}>{`[[${part}]]`}</React.Fragment>;

        const answered = value[blank.id] ?? '';
        const verdict = correct ? sameWord(answered, correct[blank.id]) : undefined;

        // A word bank means drag and drop, full stop. Some Reading gap-fills
        // were saved with a list on every gap as well, and letting those win
        // put a dropdown on a task that has none in the exam.
        const hasBank = Boolean(wordBank && wordBank.length > 0);

        // Otherwise its own options means the choice is per gap: a dropdown.
        if (!hasBank && blank.options && blank.options.length > 0) {
          return (
            <span key={index} className="inline-flex items-center align-middle mx-1 my-0.5">
              <AnswerSelect
                value={answered}
                options={blank.options}
                disabled={disabled}
                onChange={value => place(blank.id, value)}
                aria-label={`Blank ${Math.floor(index / 2) + 1}`}
                className={`font-sans min-w-[7.5rem] tracking-tight ${!answered && verdict === undefined ? EMPTY : toneOf(verdict)} ${verdict === false ? 'line-through decoration-rose-500/70' : ''}`}
              />
              <GapVerdict verdict={verdict} answer={correct?.[blank.id]} />
            </span>
          );
        }

        if (!wordBank || wordBank.length === 0) {
          return (
            <span key={index} className="inline-flex items-center align-middle mx-1">
              <input
                type="text"
                id={`blank-${blank.id}`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={answered}
                disabled={disabled}
                onChange={event => place(blank.id, event.target.value)}
                placeholder="— type —"
                aria-label={`Blank ${Math.floor(index / 2) + 1}`}
                className={`font-sans h-8 w-28 sm:w-36 px-2.5 rounded-lg border text-sm font-semibold align-baseline transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs disabled:opacity-70 ${toneOf(verdict)}`}
              />
              <GapVerdict verdict={verdict} answer={correct?.[blank.id]} />
            </span>
          );
        }

        return (
          <GapSlot
            key={index}
            id={blank.id}
            word={answered}
            armed={armed}
            disabled={disabled}
            tone={verdict === undefined ? undefined : toneOf(verdict)}
            onPlace={word => place(blank.id, word)}
            onClear={() => clear(blank.id)}
          />
        );
      })}
    </p>
  );

  if (!wordBank || wordBank.length === 0) return body;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dropUnderPointer}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="space-y-4">
        {body}

        <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-muted/30 border border-border">
          {wordBank.map(word => (
            <WordChip
              key={word.label}
              word={word.text}
              spent={used.has(word.text)}
              armed={armed === word.text}
              disabled={disabled}
              onArm={() => {
                if (justDropped.current) return;
                setArmed(armed === word.text ? null : word.text);
              }}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging && (
            <span className="inline-block cursor-grabbing rounded-lg border border-primary bg-background px-3 py-1.5 text-sm font-semibold text-foreground shadow-lg ring-2 ring-primary/30">
              {dragging}
            </span>
          )}
        </DragOverlay>

        {correct && (
          <p className="text-[11px] text-muted-foreground">
            Correct:{' '}
            <span className="font-mono font-bold">
              {blanks.map(blank => correct[blank.id]).join(', ')}
            </span>
          </p>
        )}
      </div>
    </DndContext>
  );
}

interface GapSlotProps {
  id: string;
  word: string;
  armed: string | null;
  disabled?: boolean;
  /** Right/wrong colours after marking; empty before. */
  tone?: string;
  onPlace: (word: string) => void;
  onClear: () => void;
}

function GapSlot({ id, word, armed, disabled, tone, onPlace, onClear }: GapSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  // Before marking, gaps are tinted and dashed so they stand out in the text.
  const slotTone = tone
    ? tone
    : word
      ? 'border-primary/60 bg-primary/10 text-primary'
      : `border-dashed ${isOver || armed ? 'border-primary bg-primary/15' : 'border-primary/50 bg-primary/[0.06] hover:bg-primary/10'}`;

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      onClick={() => (armed ? onPlace(armed) : word ? onClear() : undefined)}
      className={`font-sans mx-1 inline-flex min-w-[7rem] items-center justify-center rounded-lg border-2 px-2 py-0.5 text-sm font-semibold align-middle transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-90 ${slotTone} ${
        isOver || armed ? 'ring-2 ring-primary/40' : ''
      }`}
    >
      {word || <span className="font-medium text-primary/70">drop a word</span>}
    </button>
  );
}

interface WordChipProps {
  word: string;
  spent: boolean;
  armed: boolean;
  disabled?: boolean;
  onArm: () => void;
}

function WordChip({ word, spent, armed, disabled, onArm }: WordChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `word:${word}`,
    disabled: disabled || spent,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled || spent}
      onClick={onArm}
      // Without this a touch drag scrolls the page instead of moving the word.
      style={{ touchAction: 'none' }}
      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
        spent
          ? 'opacity-40 bg-background border-border text-muted-foreground cursor-default'
          : armed
            ? 'bg-primary text-primary-foreground border-primary cursor-pointer'
            : 'bg-background border-border text-foreground hover:border-primary/40 cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-40 border-dashed' : ''}`}
    >
      {word}
    </button>
  );
}

/**
 * The gap under the pointer wins. The gaps are small inline targets, so
 * matching on how much of the word's box overlaps one misses drops that land
 * squarely on it. Keyboard drags have no pointer and fall back to overlap.
 */
const dropUnderPointer: CollisionDetection = args => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

/**
 * Gap answers are compared the way the server compares them: case and
 * surrounding punctuation are not what the task is testing.
 */
function sameWord(given: string, want?: string): boolean | undefined {
  if (want === undefined) return undefined;
  const tidy = (value: string) => value.trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '');
  return tidy(given) === tidy(want);
}

// An unanswered dropdown, tinted so the gaps are easy to spot in the text.
const EMPTY = 'bg-primary/5 border-primary/30 text-primary hover:border-primary/60';

function toneOf(verdict: boolean | undefined): string {
  if (verdict === undefined) return 'bg-background border-border text-foreground';
  return verdict
    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-200'
    : 'bg-rose-500/15 border-rose-500 text-rose-800 dark:text-rose-200';
}

/** After marking: a tick for a right gap; a cross and the right word for a wrong one. */
function GapVerdict({ verdict, answer }: { verdict: boolean | undefined; answer?: string }) {
  if (verdict === undefined) return null;
  if (verdict) return <Check className="ml-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct" />;
  return (
    <span className="ml-1 inline-flex items-center gap-1 whitespace-nowrap">
      <X className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-label="Wrong" />
      {answer && (
        <span className="rounded-md border border-emerald-500/50 bg-emerald-500/15 px-1.5 py-0.5 font-sans text-xs font-bold leading-none text-emerald-700 dark:text-emerald-300">
          {answer}
        </span>
      )}
    </span>
  );
}

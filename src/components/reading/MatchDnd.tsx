import React, { createContext, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Drag and drop for the IELTS tasks answered from a list: matching headings,
 * features and sentence endings, and a summary completed from a box of words.
 *
 * It is BlankedText's pattern lifted out so several layouts can share it. Every
 * placement has three routes that all end in the same `onPlace` call: drag the
 * entry onto the slot; tap (or click) the entry and then the slot, which is how
 * it works on a phone; or tab to the entry, press Enter, tab to the slot and
 * press Enter. dnd-kit's keyboard sensor (Space, the arrow keys, Space) is the
 * fourth.
 */

export interface MatchEntry {
  /** What the answer records: a list label, or a word for a word box. */
  id: string;
  /** What the chip shows, for a list: "iv", "B". Absent for a word box. */
  label?: string;
  text: string;
}

interface MatchState {
  armed: string | null;
  disabled?: boolean;
  arm: (id: string | null) => void;
  /** Called by a slot when it is tapped with an entry armed. */
  placeArmed: (slot: string) => void;
}

const MatchContext = createContext<MatchState | null>(null);

function useMatch(): MatchState {
  const state = useContext(MatchContext);
  if (!state) throw new Error('MatchChip and MatchSlot must sit inside MatchDnd');
  return state;
}

interface MatchDndProps {
  entries: MatchEntry[];
  disabled?: boolean;
  /** Put entry `id` into slot `slot`. Replacing what was there is the caller's rule. */
  onPlace: (slot: string, id: string) => void;
  children: React.ReactNode;
}

export default function MatchDnd({ entries, disabled, onPlace, children }: MatchDndProps) {
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  // A drop is followed by a click on the chip that was dragged; without this it
  // would pick the entry straight back up.
  const justDropped = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setArmed(null);
    setDragging(String(event.active.id).replace(/^entry:/, ''));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    justDropped.current = true;
    setTimeout(() => {
      justDropped.current = false;
    }, 0);
    if (!event.over || disabled) return;
    onPlace(String(event.over.id).replace(/^slot:/, ''), String(event.active.id).replace(/^entry:/, ''));
  };

  const state: MatchState = {
    armed,
    disabled,
    arm: id => {
      if (justDropped.current || disabled) return;
      setArmed(id);
    },
    placeArmed: slot => {
      if (!armed || disabled) return;
      onPlace(slot, armed);
      setArmed(null);
    },
  };

  const draggedEntry = entries.find(entry => entry.id === dragging);

  return (
    <MatchContext.Provider value={state}>
      <DndContext
        sensors={sensors}
        collisionDetection={dropUnderPointer}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        {children}
        {/* On document.body: inside the card's transformed parent a fixed overlay
            is measured from that parent and drawn away from the pointer. */}
        {createPortal(
          <DragOverlay dropAnimation={null} zIndex={70}>
            {draggedEntry && (
              <span className="inline-flex max-w-xs cursor-grabbing items-start gap-2 rounded-lg border border-primary bg-background px-3 py-1.5 text-sm font-semibold text-foreground shadow-lg ring-2 ring-primary/30">
                {draggedEntry.label && <span className="font-bold text-primary">{draggedEntry.label}</span>}
                <span>{draggedEntry.text}</span>
              </span>
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </MatchContext.Provider>
  );
}

interface MatchChipProps {
  entry: MatchEntry;
  /** Already placed, and the task allows each entry only once. */
  spent?: boolean;
}

/** One entry of the list, draggable and tappable. */
export function MatchChip({ entry, spent }: MatchChipProps) {
  const { armed, disabled, arm } = useMatch();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `entry:${entry.id}`,
    disabled: disabled || spent,
  });
  const isArmed = armed === entry.id;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled || spent}
      aria-pressed={isArmed}
      onClick={() => arm(isArmed ? null : entry.id)}
      // Without this a touch drag scrolls the page instead of moving the entry.
      style={{ touchAction: 'none' }}
      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
        spent
          ? 'cursor-default border-border bg-background text-muted-foreground opacity-40'
          : isArmed
            ? 'cursor-pointer border-primary bg-primary text-primary-foreground'
            : 'cursor-grab border-border bg-background text-foreground hover:border-primary/50 active:cursor-grabbing'
      } ${isDragging ? 'border-dashed opacity-40' : ''}`}
    >
      {entry.label && (
        <span className={`shrink-0 font-bold ${isArmed ? '' : 'text-primary'}`}>{entry.label}</span>
      )}
      <span className="leading-snug">{entry.text}</span>
    </button>
  );
}

interface MatchSlotProps {
  id: string;
  /** The entry in the slot, if any. */
  placed?: MatchEntry;
  /** Right or wrong once marked; undefined before. */
  verdict?: boolean;
  /** The right entry, shown beside a wrong one after marking. */
  correct?: MatchEntry;
  /** Screen-reader name: "Question 3". */
  label: string;
  /** Empty-state text. */
  placeholder?: string;
  inline?: boolean;
  onClear: () => void;
}

/** Where an entry is dropped. Tapping it with an entry armed places that entry; tapping it full empties it. */
export function MatchSlot({ id, placed, verdict, correct, label, placeholder = 'Drop answer here', inline, onClear }: MatchSlotProps) {
  const { armed, disabled, placeArmed } = useMatch();
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${id}`, disabled });

  let tone = placed
    ? 'border-primary/60 bg-primary/10 text-primary'
    : `border-dashed ${isOver || armed ? 'border-primary bg-primary/15' : 'border-primary/50 bg-primary/[0.05] hover:bg-primary/10'}`;
  if (verdict !== undefined) {
    tone = verdict
      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
      : 'border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200';
  }

  return (
    <span className={inline ? 'inline-flex flex-wrap items-center gap-1 align-middle' : 'flex flex-wrap items-center gap-2'}>
      <button
        ref={setNodeRef}
        type="button"
        disabled={disabled}
        aria-label={placed ? `${label}: ${placed.label ?? ''} ${placed.text}. Tap to remove.` : `${label}: empty`}
        onClick={() => (armed ? placeArmed(id) : placed ? onClear() : undefined)}
        className={`inline-flex min-h-9 items-start gap-2 rounded-lg border-2 px-2.5 py-1 text-left text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-100 ${
          inline ? 'min-w-[7rem] align-middle' : 'w-full sm:min-w-[16rem]'
        } ${tone} ${isOver || armed ? 'ring-2 ring-primary/30' : ''}`}
      >
        {placed ? (
          <>
            {placed.label && <span className="shrink-0 font-bold">{placed.label}</span>}
            <span className={verdict === false ? 'line-through decoration-rose-500/70' : ''}>{placed.text}</span>
          </>
        ) : (
          <span className="font-medium text-primary/70">{placeholder}</span>
        )}
      </button>
      {verdict === false && correct && (
        <span className="rounded-md border border-emerald-500/50 bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          {correct.label ? `${correct.label} ${correct.text}` : correct.text}
        </span>
      )}
    </span>
  );
}

/**
 * The slot under the pointer wins; keyboard drags have no pointer and fall
 * back to overlap.
 */
const dropUnderPointer: CollisionDetection = args => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

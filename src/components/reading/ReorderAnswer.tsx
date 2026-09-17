import React, { useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { QuestionOption } from '@/lib/types';

interface ReorderAnswerProps {
  options: QuestionOption[];
  /** The learner's order so far, as option ids. Empty before they touch it. */
  value: string[];
  disabled?: boolean;
  /** The correct sequence, present only after the answer has been checked. */
  correctOrder?: string[];
  onChange: (order: string[]) => void;
}

/**
 * The ranking control for Re-order Paragraphs.
 *
 * The server deals the boxes already shuffled, so the order they arrive in is
 * the starting arrangement. That order is also submitted as-is if the learner
 * never touches anything: an untouched answer is a wrong answer, not a missing
 * one, which is what the real test does too.
 *
 * Reordering works by keyboard as well as pointer — dnd-kit's keyboard sensor
 * makes the whole cards focusable and moves a box with the arrow keys — because a
 * drag-only control would put this task out of reach for anyone not using a
 * mouse.
 */
export default function ReorderAnswer({
  options,
  value,
  disabled,
  correctOrder,
  onChange,
}: ReorderAnswerProps) {
  const dealt = useMemo(() => options.map(option => option.id), [options]);
  const order = value.length > 0 ? value : dealt;

  const byId = useMemo(
    () => new Map(options.map(option => [option.id, option])),
    [options],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    onChange(arrayMove(order, from, to));
  };

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((id, index) => (
            <SortableBox
              key={id}
              id={id}
              position={index + 1}
              text={byId.get(id)?.text ?? id}
              disabled={disabled}
              // Marks stay per adjacent pair, so what a learner needs to see is
              // which neighbours they got right, not which box is "correct".
              pairCorrect={pairAfterIsCorrect(order, index, correctOrder)}
              reviewing={Boolean(correctOrder)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {correctOrder && (
        <p className="text-[11px] text-muted-foreground pt-1">
          Correct order:{' '}
          <span className="font-mono font-bold">
            {correctOrder.map(id => positionLabel(dealt, id)).join(' → ')}
          </span>
        </p>
      )}
    </div>
  );
}

interface SortableBoxProps {
  id: string;
  position: number;
  text: string;
  disabled?: boolean;
  pairCorrect?: boolean;
  reviewing: boolean;
}

function SortableBox({ id, position, text, disabled, pairCorrect, reviewing }: SortableBoxProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  let tone = 'bg-card border-border';
  if (reviewing && pairCorrect === true) tone = 'bg-emerald-500/10 border-emerald-500/40';
  else if (reviewing && pairCorrect === false) tone = 'bg-rose-500/10 border-rose-500/30';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      tabIndex={disabled ? -1 : 0}
      aria-label={`Move box ${position}: ${text}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tone} ${
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing touch-none select-none'
      } ${isDragging ? 'opacity-60 shadow-lg' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-muted-foreground ${disabled ? 'opacity-50' : ''}`}
      >
        <GripVertical className="w-4 h-4" />
        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary font-mono font-bold text-[11px] flex items-center justify-center border border-primary/20">
          {position}
        </span>
      </span>

      <p className="text-sm text-foreground leading-relaxed pt-0.5">{text}</p>
    </div>
  );
}

/**
 * Whether this box and the one below it are adjacent in the correct sequence.
 *
 * Undefined for the last box, which has no pair after it, and while the answer
 * is still unchecked.
 */
function pairAfterIsCorrect(
  order: string[],
  index: number,
  correctOrder?: string[],
): boolean | undefined {
  if (!correctOrder || index >= order.length - 1) return undefined;

  const want = correctOrder.indexOf(order[index]);
  return want !== -1 && correctOrder[want + 1] === order[index + 1];
}

/** Where a box sat when it was dealt, so the answer key reads as box numbers. */
function positionLabel(dealt: string[], id: string): string {
  const index = dealt.indexOf(id);
  return index === -1 ? id : String(index + 1);
}

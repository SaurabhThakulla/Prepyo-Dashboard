import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
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
import { ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { QuestionOption } from '@/lib/types';

interface ReorderAnswerProps {
  options: QuestionOption[];
  /** The boxes placed in the target panel, in order, as option ids. */
  value: string[];
  disabled?: boolean;
  /** The correct sequence, present only after the answer has been checked. */
  correctOrder?: string[];
  onChange: (order: string[]) => void;
}

const SOURCE = 'reorder-source';
const TARGET = 'reorder-target';

/**
 * The Re-order Paragraphs control, laid out as the test shows it: the shuffled
 * boxes in a Source panel, and the learner builds the order in a Target panel.
 * Only the target is the answer, so boxes left behind score no pairs, as in
 * the real test.
 *
 * Boxes are lettered by where they were dealt, never by their option ids, which
 * follow the correct order. Boxes move by drag, by the arrow button beside each,
 * or by keyboard (dnd-kit's keyboard sensor), so no one needs a mouse.
 */
export default function ReorderAnswer({
  options,
  value,
  disabled,
  correctOrder,
  onChange,
}: ReorderAnswerProps) {
  const dealt = useMemo(() => options.map(option => option.id), [options]);
  const byId = useMemo(() => new Map(options.map(option => [option.id, option])), [options]);
  const target = value.filter(id => byId.has(id));
  const source = dealt.filter(id => !target.includes(id));
  const letter = (id: string) => String.fromCharCode(65 + dealt.indexOf(id));
  const [dragging, setDragging] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const place = (id: string, at = target.length) => {
    const next = target.filter(other => other !== id);
    next.splice(Math.min(at, next.length), 0, id);
    onChange(next);
  };
  const unplace = (id: string) => onChange(target.filter(other => other !== id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (!over) return;
    const id = String(active.id);
    const overId = String(over.id);
    if (id === overId) return;

    if (overId === SOURCE || source.includes(overId)) {
      if (target.includes(id)) unplace(id);
    } else if (overId === TARGET) {
      place(id);
    } else if (target.includes(id)) {
      onChange(arrayMove(target, target.indexOf(id), target.indexOf(overId)));
    } else {
      place(id, target.indexOf(overId));
    }
  };

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setDragging(String(active.id))}
        onDragCancel={() => setDragging(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
          <Panel id={SOURCE} title="Source" items={source} empty="Every box is in the target.">
            {source.map(id => (
              <Box
                key={id}
                id={id}
                letter={letter(id)}
                text={byId.get(id)?.text ?? id}
                disabled={disabled}
                action={{ label: 'Move to target', icon: 'right', run: () => place(id) }}
              />
            ))}
          </Panel>

          <div aria-hidden="true" className="hidden md:flex items-center justify-center px-1 text-primary/60">
            <ChevronsRight className="w-8 h-8" />
          </div>

          <Panel id={TARGET} title="Target" items={target} empty="Move the boxes here in the right order.">
            {target.map((id, index) => (
              <Box
                key={id}
                id={id}
                letter={letter(id)}
                text={byId.get(id)?.text ?? id}
                disabled={disabled}
                // Marks stay per adjacent pair, so what a learner needs to see is
                // which neighbours they got right, not which box is "correct".
                pairCorrect={pairAfterIsCorrect(target, index, correctOrder)}
                reviewing={Boolean(correctOrder)}
                action={{ label: 'Move back to source', icon: 'left', run: () => unplace(id) }}
              />
            ))}
          </Panel>
        </div>
        {/* On the body, so no panel or page container clips the box while it moves. */}
        {createPortal(
          <DragOverlay>
            {dragging && (
              <div className="flex items-stretch rounded-lg border border-primary bg-card overflow-hidden shadow-xl cursor-grabbing">
                <BoxBody letter={letter(dragging)} text={byId.get(dragging)?.text ?? dragging} />
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {correctOrder && (
        <p className="text-[11px] text-muted-foreground">
          Correct order:{' '}
          <span className="font-mono font-bold">
            {correctOrder.filter(id => byId.has(id)).map(letter).join(' → ')}
          </span>
        </p>
      )}
    </div>
  );
}

function Panel({ id, title, items, empty, children }: {
  id: string;
  title: string;
  items: string[];
  empty: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      aria-label={title}
      className={`flex flex-col rounded-xl border overflow-hidden ${isOver ? 'border-primary' : 'border-primary/40'}`}
    >
      <h3 className="bg-primary text-primary-foreground text-sm font-semibold text-center py-2.5">{title}</h3>
      <div ref={setNodeRef} className="flex-1 min-h-40 p-3 space-y-2.5 bg-card">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-10">{empty}</p>}
      </div>
    </section>
  );
}

interface BoxProps {
  id: string;
  letter: string;
  text: string;
  disabled?: boolean;
  pairCorrect?: boolean;
  reviewing?: boolean;
  action: { label: string; icon: 'left' | 'right'; run: () => void };
}

function Box({ id, letter, text, disabled, pairCorrect, reviewing, action }: BoxProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const Icon = action.icon === 'right' ? ChevronRight : ChevronLeft;

  let tone = 'border-primary/40 bg-card';
  if (reviewing && pairCorrect === true) tone = 'border-emerald-500/60 bg-emerald-500/10';
  else if (reviewing && pairCorrect === false) tone = 'border-rose-500/50 bg-rose-500/10';

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-stretch rounded-lg border overflow-hidden ${tone} ${isDragging ? 'opacity-40' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        tabIndex={disabled ? -1 : 0}
        aria-label={`Move box ${letter}: ${text}`}
        className={`flex flex-1 min-w-0 items-stretch focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
          disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing touch-none select-none'
        }`}
      >
        <BoxBody letter={letter} text={text} />
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={action.run}
          aria-label={`${action.label}: box ${letter}`}
          className="shrink-0 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <Icon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function BoxBody({ letter, text }: { letter: string; text: string }) {
  return (
    <>
      <span className="shrink-0 w-10 flex items-center justify-center bg-primary text-primary-foreground text-sm font-semibold">
        {letter}
      </span>
      <p className="flex-1 px-3 py-3 text-sm text-foreground leading-relaxed">{text}</p>
    </>
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

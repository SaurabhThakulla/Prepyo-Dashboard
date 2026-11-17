import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

/** Where a question's answer lies: a paragraph and a span of its text (UTF-16 units). */
interface Location {
  paragraphIndex: number;
  label?: string;
  start: number;
  end: number;
}

interface LocateState {
  active: string | null;
  locate: (questionId: string) => void;
}

// Only reading practice provides it, so a mock, which renders the same rows, shows no button.
const LocateContext = createContext<LocateState | null>(null);

const HIGHLIGHT = 'answer-locate';

/** The Range covering [start, end) of a paragraph body's text, across any highlight marks inside it. */
function rangeIn(body: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (!started && start <= offset + length) {
      range.setStart(node, start - offset);
      started = true;
    }
    if (started && end <= offset + length) {
      range.setEnd(node, end - offset);
      return range;
    }
    offset += length;
  }
  return null;
}

/** The nearest ancestor that scrolls, or null when the page itself does. */
function scroller(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

function clearHighlight() {
  if (typeof CSS !== 'undefined' && 'highlights' in CSS) CSS.highlights.delete(HIGHLIGHT);
}

/** Marks the spans and scrolls the first a third of the way down its pane. */
function show(passage: HTMLElement, locations: Location[]): boolean {
  const ranges = locations
    .map(location => {
      const body = passage.querySelector<HTMLElement>(`[data-paragraph-body="${location.paragraphIndex}"]`);
      return body && rangeIn(body, location.start, location.end);
    })
    .filter((range): range is Range => Boolean(range));
  if (ranges.length === 0) return false;

  clearHighlight();
  // Supported in every current browser; without it the scroll alone still shows the place.
  if (typeof CSS !== 'undefined' && 'highlights' in CSS) CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));

  const rect = ranges[0].getBoundingClientRect();
  const pane = scroller(ranges[0].startContainer.parentElement ?? passage);
  if (pane) {
    const box = pane.getBoundingClientRect();
    pane.scrollBy({ top: rect.top - box.top - box.height / 3, behavior: 'smooth' });
  } else {
    window.scrollBy({ top: rect.top - window.innerHeight / 3, behavior: 'smooth' });
  }
  return true;
}

/**
 * "Where is the answer?" for reading practice: each question's button scrolls
 * the passage to the sentence its answer comes from and highlights it. The same
 * button again clears it. `resetKey` (the passage) clears it when it changes.
 */
export function LocateProvider({
  passageRef,
  resetKey,
  children,
}: {
  passageRef: React.RefObject<HTMLElement | null>;
  resetKey?: string;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const [active, setActive] = useState<string | null>(null);
  const asked = useRef<string | null>(null);

  useEffect(() => {
    setActive(null);
    clearHighlight();
    return clearHighlight;
  }, [resetKey]);

  const locate = useCallback(async (questionId: string) => {
    if (active === questionId) {
      setActive(null);
      clearHighlight();
      return;
    }
    asked.current = questionId;
    setActive(questionId);
    try {
      const { locations } = await api.get<{ locations: Location[] }>(`/reading/practice/questions/${encodeURIComponent(questionId)}/locate`);
      if (asked.current !== questionId) return; // another button was pressed meanwhile
      if (!passageRef.current || !show(passageRef.current, locations)) {
        setActive(null);
        clearHighlight();
        toast.info('Not pinpointed', 'We could not find the place for this question. Read the paragraphs around the questions near it.');
      }
    } catch (err) {
      if (asked.current !== questionId) return;
      setActive(null);
      toast.error('Could not find the answer', errorMessage(err));
    }
  }, [active, passageRef, toast]);

  return (
    <LocateContext.Provider value={{ active, locate: id => void locate(id) }}>
      {children}
    </LocateContext.Provider>
  );
}

/**
 * The "Locate" pill at the right of a question (inline after the gap in running
 * text). Renders nothing outside reading practice.
 */
export function LocateButton({ questionId, number, className = '' }: { questionId: string; number?: number; className?: string }) {
  const state = useContext(LocateContext);
  if (!state) return null;
  const on = state.active === questionId;
  const label = on
    ? 'Hide where the answer is'
    : `Show where the answer${number ? ` to question ${number}` : ''} is in the passage`;
  return (
    <button
      type="button"
      onClick={() => state.locate(questionId)}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`mx-1 inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 align-middle font-sans text-xs font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        on
          ? 'border-amber-500 bg-amber-400 text-amber-950'
          : 'border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10'
      } ${className}`}
    >
      <LocateFixed className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{on ? 'Hide' : 'Locate'}</span>
    </button>
  );
}

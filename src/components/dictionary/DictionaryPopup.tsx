import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cleanWord, lookUp, prefetch, withBase, type DictionaryEntry } from './lookup';

// Places where a lookup would help in an exam, or where a word is something you type or click.
const SKIP =
  'input, textarea, select, button, a, label, [role="option"], [role="radio"], [role="checkbox"], mark[data-highlight-id], [contenteditable="true"], [data-no-dictionary]';
// Only question and passage text (marked with data-dictionary) opens the dictionary.
const ALLOW = '[data-dictionary]';

function isExamScreen(pathname: string, search: string): boolean {
  return (
    pathname.startsWith('/mocks') ||
    pathname.startsWith('/diagnostic') ||
    (pathname === '/practice' && new URLSearchParams(search).has('mock'))
  );
}

type Caret = { offsetNode: Node; offset: number };
const isLetter = (c: string | undefined) => !!c && /[A-Za-z'’-]/.test(c);

/** The word under the pointer, inside an allowed area, as a range and its text. */
function wordAt(x: number, y: number): { word: string; rect: DOMRect } | null {
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => Caret | null };
  let node: Node | undefined;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const caret = doc.caretPositionFromPoint(x, y);
    node = caret?.offsetNode;
    offset = caret?.offset ?? 0;
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    node = range?.startContainer;
    offset = range?.startOffset ?? 0;
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const el = node.parentElement;
  if (!el || el.closest(SKIP) || !el.closest(ALLOW)) return null;

  const text = node.textContent ?? '';
  let start = offset;
  let end = offset;
  while (start > 0 && isLetter(text[start - 1])) start--;
  while (end < text.length && isLetter(text[end])) end++;
  if (start === end) return null;

  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const rect = range.getBoundingClientRect();
  // The caret snaps to the nearest letter; only count it when the pointer is on the word.
  if (x < rect.left - 1 || x > rect.right + 1 || y < rect.top - 1 || y > rect.bottom + 1) return null;
  const word = cleanWord(text.slice(start, end));
  return word ? { word, rect } : null;
}

type State = { word: string; entry?: DictionaryEntry | null; failed?: boolean };

// The device's own voice: free and instant.
function speak(word: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

/** Hover a word in a question or passage to see it marked; click (or tap) it to see what it means. */
export default function DictionaryPopup() {
  const { pathname, search } = useLocation();
  const [state, setState] = useState<State | null>(null);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const off = isExamScreen(pathname, search);

  useEffect(() => {
    if (off) return;
    const open = (word: string | null) => {
      if (!word) return;
      setState({ word });
      speak(word);
      const show = (entry: DictionaryEntry | null) => setState(s => (s?.word === word ? { word, entry } : s));
      lookUp(word).then(
        entry => {
          // Show the word's own meanings now; the base word's follow when they arrive.
          show(entry);
          if (entry?.baseWord) withBase(entry).then(show, () => null);
        },
        () => setState(s => (s?.word === word ? { word, failed: true } : s)),
      );
    };
    let frame = 0;
    let dwell: number | undefined;
    let hovered: string | null = null;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hit = wordAt(e.clientX, e.clientY);
        document.documentElement.toggleAttribute('data-dictionary-hover', !!hit);
        setHover(prev => (hit ? hit.rect : prev ? null : prev));
        // Resting on a word for a moment loads it, so a click opens at once.
        if ((hit?.word ?? null) !== hovered) {
          hovered = hit?.word ?? null;
          window.clearTimeout(dwell);
          if (hovered) {
            const word = hovered;
            dwell = window.setTimeout(() => prefetch(word), 150);
          }
        }
      });
    };
    const clear = () => {
      document.documentElement.removeAttribute('data-dictionary-hover');
      setHover(null);
    };
    // A press on a control (e.g. a dropdown option), or one that closes an open
    // dropdown, is not a lookup, even if the word under it shows once it closes.
    let pressedControl = false;
    const onPress = (e: PointerEvent) => {
      const target = e.target as Element | null;
      pressedControl = Boolean(target?.closest?.(SKIP)) || Boolean(document.querySelector('[role="menu"]'));
    };
    const onClick = (e: MouseEvent) => {
      if (pressedControl) return;
      if ((e.target as Element | null)?.closest?.(SKIP)) return;
      // A drag that selected text is the highlighter's, not a lookup.
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      const hit = wordAt(e.clientX, e.clientY);
      if (hit) open(hit.word);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('pointerdown', onPress, true);
    document.addEventListener('click', onClick);
    window.addEventListener('scroll', clear, true);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(dwell);
      clear();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('click', onClick);
      window.removeEventListener('scroll', clear, true);
    };
  }, [off]);

  useEffect(() => { if (off) setState(null); }, [off]);
  useEffect(() => { if (state) setHover(null); }, [state]);

  const entry = state?.entry;
  return (
    <>
    {hover && (
      <div
        aria-hidden
        className="pointer-events-none fixed z-40 rounded-[3px] bg-blue-500/40 ring-1 ring-blue-500/60"
        style={{ left: hover.left - 2, top: hover.top - 1, width: hover.width + 4, height: hover.height + 2 }}
      />
    )}
    <Dialog open={!!state} onOpenChange={o => { if (!o) setState(null); }}>
      <DialogContent data-no-dictionary className="max-w-2xl">
        <DialogTitle className="text-xl font-black text-primary">Dictionary</DialogTitle>
        <DialogDescription className="sr-only">Meaning and examples of the selected word</DialogDescription>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <span className="rounded-lg bg-primary/10 px-4 py-1.5 font-bold text-primary">{state?.word}</span>
          {entry?.baseWord && <span className="text-sm text-muted-foreground">from "{entry.baseWord}"</span>}
          <button type="button" onClick={() => state && speak(state.word)} aria-label="Pronounce" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        {state && entry === undefined && !state.failed && (
          <div className="grid gap-4 sm:grid-cols-2" aria-label="Looking up">
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          </div>
        )}
        {(state?.failed || entry === null) && (
          <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
            {state?.failed ? 'Could not reach the dictionary. Check your connection and try again.' : `No definition found for "${state?.word}".`}
          </p>
        )}
        {entry && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Definitions" items={entry.definitions.map(d => (d.partOfSpeech ? `(${d.partOfSpeech}) ` : '') + d.text)} />
            <Section title="Examples" items={entry.examples} empty="No examples for this word." />
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">From Wiktionary</span>
          <Button variant="outline" className="rounded-full px-6" onClick={() => setState(null)}>Go Back</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function Section({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-primary">{title}</h3>
      {items.length ? (
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

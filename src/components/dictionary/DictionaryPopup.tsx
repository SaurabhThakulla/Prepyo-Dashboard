import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cleanWord, lookUp, type DictionaryEntry } from './lookup';

// Places where a lookup would help in an exam, or where a word is something you type or click.
const SKIP = 'input, textarea, select, button, a, [contenteditable="true"], [data-no-dictionary]';

function isExamScreen(pathname: string, search: string): boolean {
  return pathname.startsWith('/mocks') || pathname.startsWith('/diagnostic') ||
    (pathname === '/practice' && new URLSearchParams(search).has('mock'));
}

/** The single word selected outside skipped areas, or null. */
function selectedWord(): string | null {
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  const el = node instanceof Element ? node : node?.parentElement;
  if (!selection || !el || el.closest(SKIP)) return null;
  return cleanWord(selection.toString());
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

/** Double-click (or long-press on a phone) any English word to see what it means. */
export default function DictionaryPopup() {
  const { pathname, search } = useLocation();
  const [state, setState] = useState<State | null>(null);
  const touch = useRef(false);
  const off = isExamScreen(pathname, search);

  useEffect(() => {
    if (off) return;
    const open = (word: string | null) => {
      if (!word) return;
      setState({ word });
      speak(word);
      lookUp(word).then(
        entry => setState(s => (s?.word === word ? { word, entry } : s)),
        () => setState(s => (s?.word === word ? { word, failed: true } : s)),
      );
    };
    let timer: number | undefined;
    const onPointer = (e: PointerEvent) => { touch.current = e.pointerType === 'touch'; };
    const onDouble = () => { if (!touch.current) open(selectedWord()); };
    // A long press selects a word on a phone; wait until the selection settles.
    const onSelection = () => {
      if (!touch.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => open(selectedWord()), 600);
    };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('dblclick', onDouble);
    document.addEventListener('selectionchange', onSelection);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('dblclick', onDouble);
      document.removeEventListener('selectionchange', onSelection);
    };
  }, [off]);

  useEffect(() => { if (off) setState(null); }, [off]);

  const entry = state?.entry;
  return (
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

import type { SentenceFeedback } from '@/lib/types';
import { wordDiff } from '@/lib/wordDiff';

/** How one spoken word is shown in a free-speaking transcript. */
export type SpokenMark = 'good' | 'filler' | 'error';

export interface SpokenWord {
  text: string;
  mark: SpokenMark;
  /** Why it is marked: the correction, or "repeated". */
  note?: string;
}

const FILLERS = new Set(['um', 'umm', 'uh', 'uhm', 'er', 'erm', 'ah', 'hmm', 'mm']);
const FILLER_PHRASES = [['so', 'yeah'], ['you', 'know'], ['i', 'mean']];

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

/**
 * Marks a transcript with no script to compare against: words the grader's
 * sentence fixes changed are errors, fillers and word-for-word repeats are
 * fillers, everything else is good.
 */
export function markTranscript(transcript: string, fixes: SentenceFeedback[] = []): SpokenWord[] {
  const words: SpokenWord[] = transcript.trim().split(/\s+/).filter(Boolean).map(text => ({ text, mark: 'good' }));
  const keys = words.map(w => norm(w.text));

  for (const fix of fixes) {
    const original = fix.original.trim().split(/\s+/).filter(Boolean);
    const start = findRun(keys, original.map(norm));
    if (start < 0) continue;
    let at = start;
    let lastRemoved = -1;
    for (const part of wordDiff(fix.original, fix.correction)) {
      const count = part.text.split(/\s+/).length;
      if (part.kind === 'same') {
        at += count;
      } else if (part.kind === 'removed') {
        for (let k = 0; k < count && at + k < words.length; k++) words[at + k] = { ...words[at + k], mark: 'error', note: `Better: ${fix.correction}` };
        lastRemoved = at + count - 1;
        at += count;
      } else if (lastRemoved !== at - 1) {
        // A word was missing: mark the word it should follow.
        const target = Math.max(start, at - 1);
        words[target] = { ...words[target], mark: 'error', note: `Missing "${part.text}". Better: ${fix.correction}` };
      }
    }
  }

  keys.forEach((k, i) => {
    if (FILLERS.has(k)) mark(words, i, 1, 'filler');
  });
  for (const phrase of FILLER_PHRASES) {
    for (let i = 0; i + phrase.length <= keys.length; i++) {
      if (phrase.every((p, j) => keys[i + j] === p)) mark(words, i, phrase.length, 'filler');
    }
  }
  // Word-for-word repeats ("thank you thank you"), longest first.
  for (let n = 3; n >= 1; n--) {
    for (let i = n; i + n <= keys.length; i++) {
      const same = keys.slice(i, i + n).every((k, j) => k !== '' && k === keys[i - n + j]);
      if (same) mark(words, i, n, 'filler', 'repeated');
    }
  }
  return words;
}

function mark(words: SpokenWord[], from: number, count: number, as: SpokenMark, note = 'filler') {
  for (let k = from; k < from + count && k < words.length; k++) {
    if (words[k].mark === 'good') words[k] = { ...words[k], mark: as, note };
  }
}

function findRun(keys: string[], run: string[]): number {
  if (run.length === 0) return -1;
  for (let i = 0; i + run.length <= keys.length; i++) {
    if (run.every((r, j) => keys[i + j] === r)) return i;
  }
  return -1;
}

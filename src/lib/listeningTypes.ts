import { Blank, Question } from '@/lib/types';

/**
 * The IELTS Listening task types answered gap by gap (migration 000141), after
 * ielts.org, "IELTS Academic: Listening test format" (checked 2026-10-30).
 * A practice item is one recording; each numbered gap or matching item in its
 * outline is one question and one mark.
 */
export const LISTENING_TYPES = {
  table: 'ielts-listening-table',
  diagram: 'ielts-listening-diagram',
  shortAnswer: 'ielts-listening-short-answer',
  matching: 'ielts-listening-matching',
} as const;

const GAP_TYPES: string[] = [LISTENING_TYPES.table, LISTENING_TYPES.diagram, LISTENING_TYPES.shortAnswer];
const LETTER_TYPES: string[] = [LISTENING_TYPES.matching, LISTENING_TYPES.diagram];

const isIeltsListening = (question: Question | null | undefined): question is Question =>
  Boolean(question && question.exam === 'IELTS' && question.skill === 'listening');

/**
 * A practice item answered by dragging letters from a box onto its numbered
 * questions: matching, and a diagram labelled with letters.
 */
export function isListeningLetterTask(question: Question | null | undefined): boolean {
  return (
    isIeltsListening(question) &&
    LETTER_TYPES.includes(question.typeId) &&
    (question.options?.length ?? 0) > 0 &&
    (question.blanks?.length ?? 0) > 0
  );
}

/** A practice item whose numbered gaps are typed: table, notes, flow-chart, summary, diagram, short answer. */
export function isListeningGapTask(question: Question | null | undefined): boolean {
  return (
    isIeltsListening(question) &&
    GAP_TYPES.includes(question.typeId) &&
    !isListeningLetterTask(question) &&
    (question.blanks?.length ?? 0) > 0
  );
}

/** A box allows a letter twice only when the instruction says so, as IELTS does. */
export const lettersMayRepeat = (instructions?: string | null) => /more than once/i.test(instructions ?? '');

/** A gap in an outline: "____ (3)" or "[[3]]". */
export const GAP = /_{2,}\s*\((\d+)\)|\[\[b?(\d+)\]\]/g;

export interface GapPiece {
  text?: string;
  gap?: string;
}

/** A line of the outline cut into text and gaps, in order. */
export function gapPieces(line: string): GapPiece[] {
  const pieces: GapPiece[] = [];
  let last = 0;
  for (const match of line.matchAll(GAP)) {
    if (match.index! > last) pieces.push({ text: line.slice(last, match.index) });
    pieces.push({ gap: match[1] ?? match[2] });
    last = match.index! + match[0].length;
  }
  if (last < line.length) pieces.push({ text: line.slice(last) });
  return pieces;
}

export type OutlineBlock =
  | { kind: 'table'; rows: string[][] }
  | { kind: 'lines'; lines: string[] };

/**
 * The printed outline in blocks: a table where lines are written
 * "| a | b |", otherwise plain lines (notes, a flow-chart, a summary, a list
 * of questions).
 */
export function outlineBlocks(passage: string): OutlineBlock[] {
  const blocks: OutlineBlock[] = [];
  let fresh = true;
  for (const raw of passage.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    // A blank line ends a block: the heading stands apart from the outline under it.
    if (!line) {
      fresh = true;
      continue;
    }
    const top = fresh ? undefined : blocks[blocks.length - 1];
    fresh = false;
    if (line.startsWith('|')) {
      const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
      if (top?.kind === 'table') top.rows.push(cells);
      else blocks.push({ kind: 'table', rows: [cells] });
    } else {
      if (top?.kind === 'lines') top.lines.push(line);
      else blocks.push({ kind: 'lines', lines: [line] });
    }
  }
  return blocks;
}

/** The blank behind a gap number: "1" or the admin form's "b1". */
export function blankFor(blanks: Blank[] | undefined, gap: string): Blank | undefined {
  return blanks?.find(blank => blank.id === gap || blank.id === `b${gap}`);
}

/** Words as the server's marker compares them (scoring.phrase): case and punctuation ignored. */
const words = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');

/** Whether a typed or placed answer matches the reviewed key or any form it accepts. */
export function gapAccepts(review: Blank | undefined, given: string | undefined): boolean {
  const answer = words(given ?? '');
  if (!answer || !review?.correctAnswer) return false;
  return [review.correctAnswer, ...(review.acceptedAnswers ?? [])].some(key => words(key) === answer);
}

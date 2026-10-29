import { AnswerSubmission } from '@/lib/types';

/**
 * The answers to change when entry `entryId` is put into question `questionId`.
 *
 * A heading, an ending or a word from a box is used once: putting it in a
 * second slot takes it out of the first, the way dragging a heading on the
 * computer-delivered test moves it rather than copying it. Matching features
 * allows an option to answer several statements, so nothing else changes.
 */
export function placeEntry(
  answers: Record<string, AnswerSubmission | undefined>,
  questionIds: string[],
  questionId: string,
  entryId: string,
  reuse: boolean,
): Record<string, string[]> {
  const patches: Record<string, string[]> = {};
  if (!reuse) {
    for (const id of questionIds) {
      if (id !== questionId && answers[id]?.selectedOptions?.[0] === entryId) patches[id] = [];
    }
  }
  patches[questionId] = [entryId];
  return patches;
}

/** The entries already placed somewhere in the set. */
export function placedEntries(
  answers: Record<string, AnswerSubmission | undefined>,
  questionIds: string[],
): Set<string> {
  const used = new Set<string>();
  for (const id of questionIds) {
    const chosen = answers[id]?.selectedOptions?.[0];
    if (chosen) used.add(chosen);
  }
  return used;
}

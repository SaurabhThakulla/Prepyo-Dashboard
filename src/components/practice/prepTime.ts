// Seconds to prepare before recording starts on its own.
// PTE: Pearson's on-screen task instructions (as in our PTE mock). IELTS: Part 2 gives one minute;
// Parts 1 and 3 have none (the examiner asks, you answer), so practice allows 5 s to read the question.
// 0 means recording starts as soon as the prompt audio ends, as in the exam (Repeat Sentence, Short Answer).
const PREP_SECONDS: Record<string, number> = {
  'read-aloud': 35,
  'pte-read-aloud': 35,
  'pte-describe-image': 25,
  'describe-image': 25,
  'pte-retell-lecture': 10,
  'retell-lecture': 10,
  're-tell-lecture': 10,
  'pte-summarise-group-discussion': 10,
  'pte-summarize-group-discussion': 10,
  'pte-respond-to-situation': 20,
  'respond-to-situation': 20,
  'pte-repeat-sentence': 0,
  'repeat-sentence': 0,
  'pte-answer-short-question': 0,
  'answer-short-question': 0,
  'ielts-speaking-part1': 5,
  'ielts-speaking-part2': 60,
  'ielts-speaking-part3': 5,
};

/**
 * Seconds before an item's recording plays by itself, as the computer-based
 * tests run it: PTE's published timings (the same as our PTE mock: 3 s for
 * speaking, 7 s for listening, 10 s for Highlight Incorrect Words), and a 3 s
 * lead-in for IELTS, EPS-TOPIK and JLPT listening, whose audio also starts on its own.
 * Undefined where the learner starts it (IELTS speaking is a live interview).
 */
export function audioDelayFor(question: { exam: string; skill: string; typeId?: string }): number | undefined {
  if (question.exam === 'PTE' && question.skill === 'speaking') return 3;
  if (question.exam === 'PTE' && question.skill === 'listening') return question.typeId?.includes('highlight-incorrect') ? 10 : 7;
  if (['IELTS', 'EPS_TOPIK', 'JLPT'].includes(question.exam) && question.skill === 'listening') return 3;
  return undefined;
}

export function prepSecondsFor(typeId: string | undefined, stored?: number | null): number {
  return PREP_SECONDS[typeId ?? ''] ?? Math.max(5, stored ?? 0);
}

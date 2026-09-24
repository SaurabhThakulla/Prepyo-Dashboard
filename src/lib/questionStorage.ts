/**
 * Utilities for tracking question practice status, scores, bookmarks, and deterministic display numbering.
 */

const BOOKMARKS_KEY = 'prepyo-bookmarked-questions';
const SCORES_PREFIX = 'prepyo-question-scores';

export interface QuestionRecord {
  score?: number | string;
  maxScore?: number;
  attemptsCount: number;
  lastAttemptedAt: number;
  isCorrect?: boolean;
}

/** Get list of bookmarked question IDs */
export function getBookmarkedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/** Toggle a question bookmark and return new status (true = bookmarked) */
export function toggleQuestionBookmark(questionId: string): boolean {
  try {
    const set = getBookmarkedIds();
    const isBookmarked = set.has(questionId);
    if (isBookmarked) {
      set.delete(questionId);
    } else {
      set.add(questionId);
    }
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(set)));
    return !isBookmarked;
  } catch {
    return false;
  }
}

/** Check if a question is bookmarked */
export function isQuestionBookmarked(questionId: string): boolean {
  return getBookmarkedIds().has(questionId);
}

/** Get stored scores for an exam */
export function getExamQuestionRecords(exam: string): Record<string, QuestionRecord> {
  try {
    const raw = localStorage.getItem(`${SCORES_PREFIX}:${exam}`);
    if (!raw) return {};
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
}

/** Record a practice attempt and score for a question */
export function recordQuestionAttempt(
  exam: string,
  questionId: string,
  score?: number | string,
  maxScore?: number,
  isCorrect?: boolean,
) {
  try {
    const records = getExamQuestionRecords(exam);
    const existing = records[questionId] || { attemptsCount: 0, lastAttemptedAt: Date.now() };
    records[questionId] = {
      score: score !== undefined ? score : existing.score,
      maxScore: maxScore ?? existing.maxScore ?? (exam === 'PTE' ? 90 : 9),
      attemptsCount: existing.attemptsCount + 1,
      lastAttemptedAt: Date.now(),
      isCorrect: isCorrect !== undefined ? isCorrect : existing.isCorrect,
    };
    localStorage.setItem(`${SCORES_PREFIX}:${exam}`, JSON.stringify(records));
  } catch {
    // ignore local storage errors
  }
}

/** Reset practice status for an exam, skill and type */
export function resetTaskPracticeRecords(exam: string, questionIds: string[]) {
  try {
    const records = getExamQuestionRecords(exam);
    for (const id of questionIds) {
      delete records[id];
    }
    localStorage.setItem(`${SCORES_PREFIX}:${exam}`, JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Returns sequential question numbers (1, 2, 3...) or extracts embedded #number from title.
 */
export function formatQuestionDisplayNumber(questionId: string, title?: string, fallbackIndex = 0): number {
  if (title) {
    const hashMatch = title.match(/#(\d+)/);
    if (hashMatch) return parseInt(hashMatch[1], 10);

    const qNumMatch = title.match(/question\s*(\d+)/i);
    if (qNumMatch) return parseInt(qNumMatch[1], 10);
  }

  return fallbackIndex + 1;
}

import type { PracticeAttempt, Question, ReadingGroup, ReadingSet } from '@/lib/types';

/**
 * What the AI coach is told about the task in front of the learner. The server
 * accepts up to 6,000 characters of it (maxTutorContextChars); stay under that.
 * It is sent with every message, so each part is clipped to what helps the
 * coach: the long texts get most of the room, everything else a line or two.
 */
export const MAX_TUTOR_CONTEXT = 5900;

export function clip(text: string, max: number): string {
  const trimmed = text.trim().replace(/\n{3,}/g, '\n\n');
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function join(lines: (string | false | undefined)[]): string {
  return clip(lines.filter(Boolean).join('\n'), MAX_TUTOR_CONTEXT);
}

function optionLines(q: Question): string {
  if (!q.options?.length || q.options.length > 12) return '';
  return `Options:\n${q.options.map(o => `${o.id}) ${clip(o.text, 200)}${o.imageUrl ? ' [picture]' : ''}`).join('\n')}`;
}

function blankLines(q: Question): string {
  const choices = (q.blanks ?? []).filter(b => b.options?.length);
  if (!choices.length) return '';
  return `Choices for each gap:\n${choices.map(b => `${b.id}: ${b.options!.join(' / ')}`).join('\n')}`;
}

/**
 * A question the learner has not answered yet. It carries no answer key: no
 * correct options or words, and no listening script, which is the key for a
 * listening item.
 */
export function questionContext(q: Question, draft?: string): string {
  return join([
    'I have not submitted my answer yet, so please do not tell me which answer is correct. Help me work it out.',
    `Task type: ${q.typeName}`,
    q.title && `Question: ${clip(q.title, 200)}`,
    q.prompt && `Instructions: ${clip(q.prompt, 1200)}`,
    q.contextPassage && `Text: ${clip(q.contextPassage, 2400)}`,
    q.audioUrl && 'There is a recording for this task; you cannot hear it and I cannot share its script.',
    q.imageUrl && 'There is a picture for this task; you cannot see it.',
    optionLines(q),
    blankLines(q),
    q.timeLimitSeconds > 0 && `Time limit: ${Math.round(q.timeLimitSeconds / 60) || 1} min`,
    draft?.trim() && `My answer so far: ${clip(draft, 1500)}`,
  ]);
}

/**
 * A question that has been marked. The learner is already looking at the key
 * and the explanation on the result card, so the coach may see them too.
 */
export function answeredContext(attempt: PracticeAttempt, review: Question, intro: string): string {
  const optionText = new Map((review.options ?? []).map(o => [o.id, o.text]));
  const correct = (review.correctAnswers ?? []).map(id => optionText.get(id) ?? id);
  const gaps = (review.blanks ?? []).filter(b => b.correctAnswer).map(b => `${b.id} = ${b.correctAnswer}`);
  const options = review.options && review.options.length <= 8
    ? review.options.map(o => `${o.id}) ${o.text}`).join('; ')
    : '';

  return join([
    intro,
    `Task type: ${review.typeName}`,
    review.title && `Question: ${review.title}`,
    review.prompt && `Instructions: ${clip(review.prompt, 800)}`,
    review.contextPassage && `Text: ${clip(review.contextPassage, 1800)}`,
    review.audioTranscript && `Recording transcript: ${clip(review.audioTranscript, 1400)}`,
    options && `Options: ${options}`,
    correct.length > 0 && `Correct answer: ${correct.join(', ')}`,
    gaps.length > 0 && `Correct words for the gaps: ${gaps.join(', ')}`,
    attempt.userResponse && `My answer: ${clip(attempt.userResponse, 1000)}`,
    attempt.feedback && `Marking: ${clip(attempt.feedback, 600)}`,
    `My score: ${attempt.score} of ${attempt.maxScore}`,
    review.explanation && `Explanation shown to me: ${clip(review.explanation, 600)}`,
  ]);
}

/**
 * A reading passage and the task groups on it, before they are checked. A
 * group whose text is a gapped rewrite of the passage hides the passage, and
 * so does this: the clean original would give away every gap.
 */
export function readingContext(set: ReadingSet, groups: ReadingGroup[]): string {
  const showPassage = set.passage && groups.every(g => g.passageDisplay !== 'hidden');
  const passage = showPassage
    ? set.passage!.paragraphs.map(p => (p.label ? `[${p.label}] ${p.text}` : p.text)).join('\n')
    : '';

  const tasks = groups.map(g => {
    const questions = g.questions.slice(0, 15).map((q, i) => {
      const options = q.options?.length ? ` (${q.options.map(o => `${o.id}) ${clip(o.text, 80)}`).join('; ')})` : '';
      return `${i + 1}. ${clip(q.prompt || q.title, 200)}${options}`;
    });
    const boxes = g.resources?.map(r => `[${r.label}] ${clip(r.text, 200)}`).join('\n');
    return [
      `Task type: ${g.typeName}`,
      g.instructions && `Instructions: ${clip(g.instructions, 400)}`,
      boxes && `Boxes:\n${boxes}`,
      questions.length > 0 && `Questions:\n${questions.join('\n')}`,
    ].filter(Boolean).join('\n');
  });

  return join([
    'I have not checked my answers yet, so please do not tell me which answers are correct. Help me work them out.',
    set.passage && `Reading passage: ${set.passage.title}`,
    // Tasks first, so clipping cuts the end of the passage, not the questions.
    tasks.join('\n\n'),
    passage && `Passage:\n${clip(passage, 3000)}`,
  ]);
}

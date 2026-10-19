import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { isPremiumUser, type PracticeAttempt, type Question } from '@/lib/types';

/** The server accepts up to 4,000 characters of task context; stay under it. */
const MAX_CONTEXT = 3900;

const QUESTION = 'Why was my answer wrong, and how can I get questions like this right next time?';

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/**
 * What the coach is told about a marked question. It is sent only after the
 * answer has been graded, so it may include the key and the explanation: the
 * learner is already looking at both on the result card.
 */
export function mistakeContext(attempt: PracticeAttempt, review: Question): string {
  const optionText = new Map((review.options ?? []).map(o => [o.id, o.text]));
  const correct = (review.correctAnswers ?? []).map(id => optionText.get(id) ?? id);
  const gaps = (review.blanks ?? []).filter(b => b.correctAnswer).map(b => `${b.id} = ${b.correctAnswer}`);
  const options = review.options && review.options.length <= 8
    ? review.options.map(o => `${o.id}) ${o.text}`).join('; ')
    : '';

  const lines = [
    'I have just answered this practice question and did not get it fully right. It has already been marked, so we can discuss the correct answer.',
    `Task type: ${review.typeName}`,
    review.title ? `Question: ${review.title}` : '',
    review.prompt ? `Instructions: ${clip(review.prompt, 600)}` : '',
    review.contextPassage ? `Text: ${clip(review.contextPassage, 1200)}` : '',
    review.audioTranscript ? `Recording transcript: ${clip(review.audioTranscript, 1000)}` : '',
    options ? `Options: ${options}` : '',
    correct.length ? `Correct answer: ${correct.join(', ')}` : '',
    gaps.length ? `Correct words for the gaps: ${gaps.join(', ')}` : '',
    attempt.userResponse ? `My answer: ${clip(attempt.userResponse, 400)}` : '',
    attempt.feedback ? `Marking: ${clip(attempt.feedback, 400)}` : '',
    `My score: ${attempt.score} of ${attempt.maxScore}`,
    review.explanation ? `Explanation shown to me: ${clip(review.explanation, 600)}` : '',
  ];
  return clip(lines.filter(Boolean).join('\n'), MAX_CONTEXT);
}

/**
 * "Explain my mistake": opens the AI coach on this question and asks why the
 * answer was wrong. Premium only: free learners do not see it at all.
 */
export default function ExplainMistake({ attempt, review }: { attempt: PracticeAttempt; review: Question }) {
  const { user, askTutor } = useApp();
  if (!isPremiumUser(user)) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">Still unsure? The AI coach can walk you through it.</p>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => askTutor(mistakeContext(attempt, review), QUESTION)}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Explain my mistake
      </Button>
    </div>
  );
}

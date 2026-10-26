import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { isPremiumUser, type PracticeAttempt, type Question } from '@/lib/types';
import { answeredContext } from '@/lib/tutorContext';

const QUESTION = 'Why was my answer wrong, and how can I get questions like this right next time?';

/** What the coach is told about a question the learner got wrong. */
export function mistakeContext(attempt: PracticeAttempt, review: Question): string {
  return answeredContext(
    attempt,
    review,
    'I have just answered this practice question and did not get it fully right. It has already been marked, so we can discuss the correct answer.',
  );
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

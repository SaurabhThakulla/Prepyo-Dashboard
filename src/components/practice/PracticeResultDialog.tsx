import { ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import PracticeResultCard from './PracticeResultCard';
import SpeakingResult from './SpeakingResult';
import PteSkillScores from './PteSkillScores';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PracticeResult } from '@/lib/hooks/usePracticeSession';
import type { Question } from '@/lib/types';

interface Props {
  result: PracticeResult;
  /** What the learner typed, for colouring a writing answer. */
  answerText?: string;
  blankAnswers?: Record<string, string>;
  recording: Blob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omitted for a past attempt opened from My Score. */
  onRedo?: () => void;
  redoLabel?: string;
  /** Omitted on the last question or when retrying a mistake. */
  onNext?: () => void;
  busy?: boolean;
  /** A PTE question's type id, to score each skill its task counts towards. */
  taskType?: string;
  /** A spoken answer's recording kept elsewhere, such as a mock test's. */
  recordingUrl?: string;
  description?: string;
}

/** An answer's result as a pop-up; clicking outside closes it. */
export default function PracticeResultDialog({ result, answerText, blankAnswers, recording, open, onOpenChange, onRedo, redoLabel = 'Redo', onNext, busy, taskType, recordingUrl, description = 'How this answer was marked, and what to work on next.', title = 'Your result' }: Props & { title?: string }) {
  // A past answer opened from history has no review: load it, so it shows the same card as a fresh result.
  const questionId = result.attempt && !result.review ? result.attempt.questionId : '';
  const past = useQuery({
    queryKey: ['practice-review', questionId],
    queryFn: () => api.get<{ review: Question }>(`/practice/questions/${encodeURIComponent(questionId)}/review`),
    enabled: open && questionId !== '',
    staleTime: Infinity,
    retry: false,
  });
  if (past.data?.review) result = { ...result, review: past.data.review };
  blankAnswers ??= blanksFromDisplay(result.review, result.attempt?.userResponse);
  const spoken = result.evaluation?.skill === 'speaking' ? result.evaluation : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-4 sm:p-5">
        <div className="space-y-0.5 pr-8">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </div>

        {/* A rated answer shows its skill scores inside its card. */}
        {taskType && !result.evaluation && <PteSkillScores taskType={taskType} result={result} />}

        {spoken ? (
          <SpeakingResult evaluation={spoken} xpAwarded={result.xpAwarded} recording={recording} taskType={taskType} recordingUrl={recordingUrl} />
        ) : (
          <PracticeResultCard result={result} bare answerText={answerText} blankAnswers={blankAnswers} taskType={taskType} />
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" className="mr-auto h-10 rounded-xl px-5 text-xs font-bold" onClick={() => onOpenChange(false)}>Close</Button>
          {onRedo && (
            <Button variant="outline" className="h-10 gap-2 rounded-xl px-5 text-xs font-bold" onClick={onRedo} disabled={busy}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {redoLabel}
            </Button>
          )}
          {onNext && (
            <Button className="h-10 gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700" onClick={onNext} disabled={busy}>
              Next question <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Gap-fill answers as stored with an attempt ("1: morning, 2: bakery" or "b1: morning"), keyed by blank id. */
function blanksFromDisplay(review: Question | undefined, shown: string | undefined): Record<string, string> | undefined {
  const blanks = review?.blanks ?? [];
  if (blanks.length === 0 || !shown) return undefined;
  const given: Record<string, string> = {};
  for (const part of shown.split(',')) {
    const m = part.trim().match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const id = /^\d+$/.test(m[1]) ? blanks[Number(m[1]) - 1]?.id : m[1];
    if (id) given[id] = m[2];
  }
  return Object.keys(given).length > 0 ? given : undefined;
}

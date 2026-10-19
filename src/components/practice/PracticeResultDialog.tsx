import { ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import PracticeResultCard from './PracticeResultCard';
import SpeakingResult from './SpeakingResult';
import PteSkillScores from './PteSkillScores';
import type { PracticeResult } from '@/lib/hooks/usePracticeSession';

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
}

/** An answer's result as a pop-up; clicking outside closes it. */
export default function PracticeResultDialog({ result, answerText, blankAnswers, recording, open, onOpenChange, onRedo, redoLabel = 'Redo', onNext, busy, taskType, title = 'Your result' }: Props & { title?: string }) {
  const spoken = result.evaluation?.skill === 'speaking' ? result.evaluation : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-5">
        <div className="space-y-1 border-b border-border pb-4 pr-8">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm">How this answer was marked, and what to work on next.</DialogDescription>
        </div>

        {taskType && <PteSkillScores taskType={taskType} result={result} />}

        {spoken ? (
          <SpeakingResult evaluation={spoken} xpAwarded={result.xpAwarded} recording={recording} />
        ) : (
          <PracticeResultCard result={result} bare answerText={answerText} blankAnswers={blankAnswers} />
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
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

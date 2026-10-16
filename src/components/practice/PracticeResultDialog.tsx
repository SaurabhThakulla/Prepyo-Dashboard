import { ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import PracticeResultCard from './PracticeResultCard';
import SpeakingResult from './SpeakingResult';
import type { PracticeResult } from '@/lib/hooks/usePracticeSession';

interface Props {
  result: PracticeResult;
  recording: Blob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedo: () => void;
  redoLabel?: string;
  /** Omitted on the last question or when retrying a mistake. */
  onNext?: () => void;
  busy?: boolean;
}

/** An answer's result as a pop-up; clicking outside closes it. */
export default function PracticeResultDialog({ result, recording, open, onOpenChange, onRedo, redoLabel = 'Redo', onNext, busy }: Props) {
  const spoken = result.evaluation?.skill === 'speaking' ? result.evaluation : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-5">
        <div className="pr-8">
          <DialogTitle className="text-base">Your result</DialogTitle>
          <DialogDescription className="sr-only">The score for the answer you just submitted.</DialogDescription>
        </div>

        {spoken ? (
          <SpeakingResult evaluation={spoken} xpAwarded={result.xpAwarded} recording={recording} />
        ) : (
          <PracticeResultCard result={result} />
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button variant="ghost" className="mr-auto rounded-xl" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={onRedo} disabled={busy}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {redoLabel}
          </Button>
          {onNext && (
            <Button className="gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700" onClick={onNext} disabled={busy}>
              Next question <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

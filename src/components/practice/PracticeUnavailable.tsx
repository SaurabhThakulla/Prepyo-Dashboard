import { ArrowRight, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Shown in place of the questions when they cannot open: no allowance left, or the start failed. */
export default function PracticeUnavailable({ onRetry, isStarting = false }: { onRetry?: () => void; isStarting?: boolean }) {
  const limit = !onRetry;
  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <ShieldAlert className={`w-8 h-8 ${limit ? 'text-amber-500' : 'text-muted-foreground'}`} aria-hidden />
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold text-foreground">
          {limit ? 'Daily limit reached' : "Couldn't open this question"}
        </p>
        <p className="text-sm text-muted-foreground">
          {limit ? "You've used today's practice allowance." : 'Check your connection and try again.'}
        </p>
      </div>
      {limit ? (
        <Button asChild className="rounded-xl gap-2">
          <Link to="/subscription">
            <span>Upgrade for More Practice Tests</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      ) : (
        <Button onClick={onRetry} disabled={isStarting} className="rounded-xl gap-2">
          <RefreshCw className={`w-4 h-4 ${isStarting ? 'animate-spin' : ''}`} /> Start again
        </Button>
      )}
    </div>
  );
}

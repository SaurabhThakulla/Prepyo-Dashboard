import { ReactNode, useRef, useState } from 'react';
import { ClipboardList, RotateCcw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ieltsModuleOf } from '@/lib/types';
import { IeltsSkill, useMockReview } from '@/lib/mockReview';
import IeltsReportForm from './IeltsReportForm';
import IeltsAnswerReview from './IeltsAnswerReview';

/** The attempts that are a whole full mock rather than one section. */
const FULL_MOCK_IDS = new Set(['mock-ielts-full']);

interface IeltsTestReportProps {
  attemptId: string;
  /** Shown right after handing in. */
  xpAwarded?: number;
  backLabel?: string;
  onBack?: () => void;
  onRedo?: () => void;
  /** Extra buttons, such as "See score reports". */
  actions?: ReactNode;
  /** A note under the card, such as what the score leaves out. */
  notice?: ReactNode;
  /** Opens with the answers shown, as a report opened from the list does. */
  reviewOpen?: boolean;
  /** Shown inside another page: no page padding. */
  embedded?: boolean;
}

/**
 * An IELTS attempt's result: a Test Report Form with the bands, then a Review
 * button that lists every question with what was answered, each opening into
 * its details, the mistakes and, for speaking, the recording.
 */
export default function IeltsTestReport({
  attemptId,
  xpAwarded,
  backLabel = 'Back to Mock Center',
  onBack,
  onRedo,
  actions,
  notice,
  reviewOpen = false,
  embedded = false,
}: IeltsTestReportProps) {
  const { user } = useApp();
  const { data: review, isLoading, error } = useMockReview(attemptId);
  const [showReview, setShowReview] = useState(reviewOpen);
  const reviewRef = useRef<HTMLDivElement>(null);

  const frame = embedded ? 'space-y-5' : 'w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5';

  if (isLoading) {
    return (
      <div className={frame}>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !review) {
    return (
      <div className={frame}>
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          This result could not be loaded. Try again in a moment.
        </p>
        {onBack && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onBack}>{backLabel}</Button>
          </div>
        )}
      </div>
    );
  }

  const attempt = review.attempt;
  const full = FULL_MOCK_IDS.has(attempt.mockId);
  const bands: Partial<Record<IeltsSkill, number | null>> = {};
  for (const section of review.sections) bands[section.skill] = section.band ?? null;
  // A section that recorded a band but has no paper left still shows its band.
  for (const [skill, band] of Object.entries(attempt.skillScores ?? {})) {
    if (!(skill in bands)) bands[skill as IeltsSkill] = band ?? null;
  }

  const openReview = () => {
    setShowReview(true);
    requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className={frame} data-testid="ielts-test-report">
      <IeltsReportForm
        candidateName={user?.name ?? ''}
        module={review.module ?? ieltsModuleOf(user)}
        testDate={attempt.completedAt}
        reportId={attempt.id}
        bands={bands}
        overall={full ? attempt.userScore : null}
        sectional={!full}
      />

      {notice}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{Math.round(attempt.durationSeconds / 60)} min</span>
          {attempt.totalQuestions > 0 && (
            <span>
              · {attempt.totalCorrect} of {attempt.totalQuestions} correct
            </span>
          )}
          {xpAwarded != null && xpAwarded > 0 && <Badge variant="default">+{xpAwarded} XP</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              {backLabel}
            </Button>
          )}
          {actions}
          {onRedo && (
            <Button variant="outline" onClick={onRedo} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Redo
            </Button>
          )}
          <Button onClick={showReview ? () => setShowReview(false) : openReview} className="gap-1.5" data-testid="open-review">
            <ClipboardList className="h-4 w-4" />
            {showReview ? 'Hide review' : 'Review answers'}
          </Button>
        </div>
      </div>

      {showReview && (
        <div ref={reviewRef} className="scroll-mt-4 space-y-3">
          <h3 className="text-lg font-bold text-foreground">Review</h3>
          <IeltsAnswerReview review={review} />
        </div>
      )}
    </div>
  );
}

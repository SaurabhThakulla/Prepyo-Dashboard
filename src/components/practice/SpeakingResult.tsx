import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Evaluation, WordMark } from '@/lib/types';
import CriteriaTable from './CriteriaTable';
import { CONFIDENCE_LABEL, SCALE } from './PracticeResultCard';
import { FeedbackLists, MarkedAnswer, MarkedAnswerLegend, ResultSection, ResultSummary, toneFor, xpMeta } from './ResultParts';

interface Props {
  evaluation: Evaluation;
  xpAwarded: number;
  recording: Blob | null;
}

/** A spoken answer's result, laid out like every other result, plus the recording and the marked text. */
export default function SpeakingResult({ evaluation, xpAwarded, recording }: Props) {
  // A past answer replays the copy kept for 30 days; a fresh one plays straight from the device.
  const recordingUrl = useObjectUrl(recording)
    ?? (evaluation.hasRecording ? `/api/v1/evaluations/${encodeURIComponent(evaluation.id)}/recording` : null);
  const criteria = evaluation.criteria ?? [];
  const words = evaluation.words ?? [];
  // Free speech has no script: colour what the grader corrected and the fillers instead.
  const transcript = words.length === 0 ? evaluation.transcript?.trim() ?? '' : '';
  const scale = SCALE[evaluation.exam] ?? SCALE.PTE;
  const score = evaluation.estimatedScore;
  const fraction = score === null ? null : (score - scale.min) / (scale.max - scale.min);

  return (
    <div className="space-y-6">
      <ResultSummary
        label={`${scale.label} estimate`}
        score={score ?? '—'}
        outOf={scale.max}
        fraction={fraction ?? 0}
        tone={toneFor(fraction)}
        verdict={score === null ? 'Not rated' : undefined}
        meta={[score !== null ? CONFIDENCE_LABEL[evaluation.scoreConfidence] : null, xpMeta(xpAwarded)]}
        summary={evaluation.summary}
        notes={['A practice estimate, not an official result.']}
      />

      {criteria.length > 0 && (
        <ResultSection title="Score breakdown">
          <CriteriaTable criteria={criteria} />
        </ResultSection>
      )}

      <ResultSection
        title="Your answer"
        aside={
          words.length > 0 ? (
            <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Legend dot="bg-emerald-500">Good</Legend>
              {words.some(w => w.unclear) && <Legend dot="bg-amber-500">Unclear</Legend>}
              <Legend dot="bg-rose-500">Missed or changed</Legend>
              <span>/ Pause</span>
            </span>
          ) : transcript && score !== null ? (
            <MarkedAnswerLegend />
          ) : null
        }
      >
        <div className="space-y-3 rounded-xl border border-border px-4 py-3">
          {recordingUrl && <audio controls src={recordingUrl} className="h-10 w-full" />}
          {words.length > 0 ? (
            <p className="text-[15px] leading-8" data-testid="marked-passage">
              {words.map((w, i) => (
                <span key={i}>
                  <span className={wordColour(w)}>{w.text}</span>
                  {w.pauseAfter && <span className="font-semibold text-muted-foreground"> /</span>}{' '}
                </span>
              ))}
            </p>
          ) : transcript ? (
            <MarkedAnswer text={transcript} fixes={evaluation.sentenceFeedback ?? []} rated={score !== null} />
          ) : (
            <p className="text-sm leading-relaxed text-foreground">No speech could be made out in that recording.</p>
          )}
        </div>
      </ResultSection>

      <FeedbackLists strengths={evaluation.strengths ?? []} weaknesses={evaluation.weaknesses ?? []} />
    </div>
  );
}

function Legend({ dot, children }: { dot: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden /> {children}
    </span>
  );
}

function wordColour(w: WordMark) {
  if (!w.said) return 'text-rose-700 underline decoration-dotted underline-offset-4 dark:text-rose-400';
  if (w.unclear) return 'text-amber-700 dark:text-amber-400';
  return 'text-emerald-700 dark:text-emerald-400';
}

function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob || typeof URL.createObjectURL !== 'function') return setUrl(null);
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

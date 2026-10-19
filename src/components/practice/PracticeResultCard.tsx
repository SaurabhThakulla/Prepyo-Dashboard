import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { wordDiff } from '@/lib/wordDiff';
import type { PracticeResult } from '@/lib/hooks/usePracticeSession';
import type { Evaluation, ExamType, PracticeAttempt, Question } from '@/lib/types';
import CriteriaTable from './CriteriaTable';
import ExplainMistake from './ExplainMistake';
import { FeedbackLists, MarkedAnswer, MarkedAnswerLegend, ResultSection, ResultSummary, toneFor, xpMeta, type Tone } from './ResultParts';

/**
 * What came back from grading. Two shapes, because the two paths differ:
 * reading and listening return a right/wrong attempt, writing and speaking
 * return a rubric from the AI evaluator. `bare` drops the card, for the pop-up.
 */
export default function PracticeResultCard({ result, bare = false, answerText, blankAnswers }: {
  result: PracticeResult;
  bare?: boolean;
  answerText?: string;
  /** What was typed or picked in each blank, by blank id. */
  blankAnswers?: Record<string, string>;
}) {
  const body = result.attempt ? (
    <DeterministicResult attempt={result.attempt} review={result.review} xpAwarded={result.xpAwarded} blankAnswers={blankAnswers} />
  ) : result.evaluation ? (
    <EvaluationResult evaluation={result.evaluation} xpAwarded={result.xpAwarded} answerText={answerText} />
  ) : null;
  if (!body || bare) return body;
  return <Card className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:p-6">{body}</Card>;
}

/** The exam's own reporting scale, so an estimate is drawn against the range it lives in. */
export const SCALE: Record<ExamType, { min: number; max: number; label: string }> = {
  PTE: { min: 10, max: 90, label: 'PTE score' },
  IELTS: { min: 0, max: 9, label: 'IELTS band' },
  EPS_TOPIK: { min: 0, max: 100, label: 'EPS-TOPIK score' },
};

export const CONFIDENCE_LABEL: Record<Evaluation['scoreConfidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

/** Reading and listening: graded on the server, right or wrong. */
function DeterministicResult({ attempt, review, xpAwarded, blankAnswers }: {
  attempt: PracticeAttempt;
  review?: Question;
  xpAwarded: number;
  blankAnswers?: Record<string, string>;
}) {
  const fraction = attempt.maxScore > 0 ? attempt.score / attempt.maxScore : attempt.isCorrect ? 1 : 0;
  const tone: Tone = attempt.isCorrect ? 'good' : attempt.score > 0 ? 'fair' : 'poor';
  const verdict = attempt.isCorrect ? 'Correct' : attempt.score > 0 ? 'Partly right' : 'Not quite';
  // Typed answers to something heard are compared with the recording's script.
  const written = WRITTEN_FROM_AUDIO.has(review?.typeId ?? '');

  return (
    <div className="space-y-6">
      <ResultSummary
        label="Your score"
        score={attempt.score}
        outOf={attempt.maxScore}
        fraction={fraction}
        tone={tone}
        verdict={verdict}
        meta={[`${attempt.accuracyPercentage}% accuracy`, xpMeta(xpAwarded)]}
        summary={attempt.feedback}
      />
      {review?.blanks && review.blanks.length > 0 && blankAnswers && (
        <ResultSection title="Your answers">
          <BlankAnswers blanks={review.blanks} given={blankAnswers} />
        </ResultSection>
      )}
      {review?.explanation && (
        <ResultSection title="Explanation">
          <p className="text-sm leading-relaxed text-foreground">{review.explanation}</p>
        </ResultSection>
      )}
      {review?.audioTranscript && (
        <ResultSection title={written ? 'Compare' : 'What the speaker said'}>
          <div className={cn('grid gap-3', written && 'md:grid-cols-2')}>
            {written && <CompareBox title="Your answer" text={attempt.userResponse || 'No answer given.'} />}
            <CompareBox title={written ? 'What the speaker said' : undefined} text={review.audioTranscript} />
          </div>
        </ResultSection>
      )}
      {review && !attempt.isCorrect && <ExplainMistake attempt={attempt} review={review} />}
    </div>
  );
}

const WRITTEN_FROM_AUDIO = new Set(['summarize-spoken-text', 'write-from-dictation']);

const blankKey = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').split(/\s+/).filter(Boolean).join(' ');

/** Each blank: what was given, right or wrong, beside the answer key. */
function BlankAnswers({ blanks, given }: { blanks: NonNullable<Question['blanks']>; given: Record<string, string> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/20">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/20 bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="w-16 whitespace-nowrap px-4 py-2.5">Blank</th>
            <th className="border-l border-foreground/15 px-4 py-2.5">Your answer</th>
            <th className="border-l border-foreground/15 px-4 py-2.5">Correct answer</th>
          </tr>
        </thead>
        <tbody>
          {blanks.map((b, i) => {
            const answer = (given[b.id] ?? '').trim();
            const right = answer !== '' && blankKey(answer) === blankKey(b.correctAnswer ?? '');
            return (
              <tr key={b.id} className="border-t border-foreground/15 first:border-t-0">
                <td className="px-4 py-3 font-medium text-foreground">{i + 1}</td>
                <td className={cn('border-l border-foreground/15 px-4 py-3 font-medium', right ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
                  {answer || <span className="italic text-muted-foreground">left blank</span>}
                  {answer && <span className="ml-2 text-xs">{right ? '✓' : '✗'}</span>}
                </td>
                <td className="border-l border-foreground/15 px-4 py-3 font-medium text-emerald-700 dark:text-emerald-400">{b.correctAnswer}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompareBox({ title, text }: { title?: string; text: string }) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      {title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>}
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{text}</p>
    </div>
  );
}

/**
 * The learner's sentence with only the words that changed marked: the wrong
 * ones struck through, the correction right after them.
 */
function CorrectedSentence({ original, correction }: { original: string; correction: string }) {
  const parts = wordDiff(original, correction);
  return (
    <p className="leading-relaxed text-foreground">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && ' '}
          {part.kind === 'same' && part.text}
          {part.kind === 'removed' && (
            <del className="text-rose-600 decoration-rose-500/70 dark:text-rose-400">
              <span className="sr-only">remove </span>
              {part.text}
            </del>
          )}
          {part.kind === 'added' && (
            <ins className="rounded bg-emerald-500/10 px-1 text-emerald-700 no-underline dark:text-emerald-300">
              <span className="sr-only">add </span>
              {part.text}
            </ins>
          )}
        </React.Fragment>
      ))}
    </p>
  );
}

/**
 * What an IELTS estimate does and does not cover. A speaking estimate from a
 * transcript has no Pronunciation criterion, so it is three of the four the
 * Speaking band is made of; a writing estimate is one task, where the Writing
 * band weights Task 2 twice as heavily as Task 1.
 */
function ieltsNote(evaluation: Evaluation, score: number | null, criteria: Evaluation['criteria']): string | null {
  if (evaluation.exam !== 'IELTS' || score === null) return null;
  if (evaluation.skill === 'speaking' && !(criteria ?? []).some(c => /pronunciation/i.test(c.name))) {
    return 'Pronunciation was not assessed, so this uses three of the four Speaking criteria. It is not a Speaking band.';
  }
  if (evaluation.skill === 'writing') {
    return 'This rates one task. The IELTS Writing band combines both tasks, with Task 2 counting twice as much as Task 1.';
  }
  if (evaluation.skill === 'speaking') {
    return 'This rates one answer. The IELTS Speaking band reflects performance across all three parts of the test.';
  }
  return null;
}

/** Writing and speaking: an estimate on the exam's scale plus rubric feedback. */
function EvaluationResult({ evaluation, xpAwarded, answerText }: { evaluation: Evaluation; xpAwarded: number; answerText?: string }) {
  const [showRewrite, setShowRewrite] = useState(false);
  const scale = SCALE[evaluation.exam] ?? SCALE.PTE;
  const score = evaluation.estimatedScore;
  const fraction = score === null ? null : (score - scale.min) / (scale.max - scale.min);
  // The server encodes an empty list as null, so none of these can be assumed.
  const criteria = evaluation.criteria ?? [];
  const sentenceFeedback = evaluation.sentenceFeedback ?? [];
  const note = ieltsNote(evaluation, score, criteria);

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
        notes={['A practice estimate, not an official result.', ...(note ? [note] : [])]}
      />

      {criteria.length > 0 && (
        <ResultSection title="Score breakdown">
          <CriteriaTable criteria={criteria} />
        </ResultSection>
      )}

      {evaluation.skill === 'writing' && answerText?.trim() && (
        <ResultSection title="Your answer" aside={score !== null && <MarkedAnswerLegend writing />}>
          <div className="rounded-xl border border-border px-4 py-3">
            <MarkedAnswer text={answerText} fixes={sentenceFeedback} rated={score !== null} />
          </div>
        </ResultSection>
      )}

      {/* What was actually heard: every judgement is about these words. */}
      {evaluation.skill === 'speaking' && (
        <ResultSection title="What we heard">
          <p className="rounded-xl border border-border px-4 py-3 text-sm leading-relaxed text-foreground">
            {evaluation.transcript ||
              'No speech could be made out in that recording, so there is no score for it. Check your microphone and record the answer again.'}
          </p>
        </ResultSection>
      )}

      <FeedbackLists strengths={evaluation.strengths ?? []} weaknesses={evaluation.weaknesses ?? []} />

      {sentenceFeedback.length > 0 && (
        <ResultSection title="Sentence fixes">
          <ul className="space-y-2">
            {sentenceFeedback.map((fix, i) => (
              <li key={i} className="space-y-1.5 rounded-xl border border-border px-4 py-3 text-sm">
                <CorrectedSentence original={fix.original} correction={fix.correction} />
                {fix.explanation && <p className="text-xs leading-relaxed text-muted-foreground">{fix.explanation}</p>}
              </li>
            ))}
          </ul>
        </ResultSection>
      )}

      {evaluation.modelRewrite && (
        <section className="rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setShowRewrite(open => !open)}
            aria-expanded={showRewrite}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground"
          >
            A stronger version
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showRewrite && 'rotate-180')} aria-hidden />
          </button>
          {showRewrite && (
            <p className="whitespace-pre-line border-t border-border px-4 py-3 text-sm leading-relaxed text-foreground">
              {evaluation.modelRewrite}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

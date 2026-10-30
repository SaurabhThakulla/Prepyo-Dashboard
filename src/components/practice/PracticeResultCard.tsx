import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PracticeResult } from '@/lib/hooks/usePracticeSession';
import type { Evaluation, PracticeAttempt, Question } from '@/lib/types';
import EvaluationCard from './EvaluationCard';
import ExplainMistake from './ExplainMistake';
import { CONFIDENCE_LABEL, SCALE, MarkedAnswer, onExamScale, MarkedAnswerLegend, ResultSection, ResultSummary, xpMeta, type Tone } from './ResultParts';

/**
 * What came back from grading. Two shapes, because the two paths differ:
 * reading and listening return a right/wrong attempt, writing and speaking
 * return a rubric from the AI evaluator. `bare` drops the card, for the pop-up.
 */
export default function PracticeResultCard({ result, bare = false, answerText, blankAnswers, taskType }: {
  result: PracticeResult;
  bare?: boolean;
  answerText?: string;
  /** A PTE question's type id, for the per-skill scores of a rated answer. */
  taskType?: string;
  /** What was typed or picked in each blank, by blank id. */
  blankAnswers?: Record<string, string>;
}) {
  const body = result.attempt ? (
    <DeterministicResult attempt={result.attempt} review={result.review} xpAwarded={result.xpAwarded} blankAnswers={blankAnswers} />
  ) : result.evaluation ? (
    <EvaluationResult evaluation={result.evaluation} xpAwarded={result.xpAwarded} answerText={answerText} taskType={taskType} />
  ) : null;
  // A rated answer is already its own card.
  if (!body || bare || result.evaluation) return body;
  return <Card className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:p-6">{body}</Card>;
}

export { CONFIDENCE_LABEL, SCALE } from './ResultParts';

/** Reading and listening: graded on the server, right or wrong. */
function DeterministicResult({ attempt, review, xpAwarded, blankAnswers }: {
  attempt: PracticeAttempt;
  review?: Question;
  xpAwarded: number;
  blankAnswers?: Record<string, string>;
}) {
  const fraction = attempt.maxScore > 0 ? attempt.score / attempt.maxScore : attempt.isCorrect ? 1 : 0;
  // PTE and IELTS show the exam's own scale (/90, /9) rather than raw marks.
  const shown = onExamScale(review?.exam, fraction) ?? { score: attempt.score, max: attempt.maxScore };
  const tone: Tone = attempt.isCorrect ? 'good' : attempt.score > 0 ? 'fair' : 'poor';
  const verdict = attempt.isCorrect ? 'Correct' : attempt.score > 0 ? 'Partly right' : 'Not quite';
  // Typed answers to something heard are compared with the recording's script.
  const written = WRITTEN_FROM_AUDIO.has(review?.typeId ?? '');

  return (
    <div className="space-y-6">
      <ResultSummary
        label="Your score"
        score={shown.score}
        outOf={shown.max}
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
            // Any form the key accepts ("20" for "twenty") is right, as the server marked it.
            const right = answer !== '' && [b.correctAnswer, ...(b.acceptedAnswers ?? [])].some(key => blankKey(answer) === blankKey(key ?? ''));
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

/** Writing and speaking: an estimate on the exam's scale plus rubric feedback, on one card. */
function EvaluationResult({ evaluation, xpAwarded, answerText, taskType }: { evaluation: Evaluation; xpAwarded: number; answerText?: string; taskType?: string }) {
  const score = evaluation.estimatedScore;
  const note = ieltsNote(evaluation, score, evaluation.criteria ?? []);
  // A past result opened from My Score has no draft on screen; the server keeps the answer with it.
  const typed = answerText?.trim() ? answerText : evaluation.answer;
  const written = evaluation.skill === 'writing' && typed?.trim() ? typed : null;
  // What was actually heard: every judgement is about these words.
  const heard = evaluation.skill === 'speaking'
    ? evaluation.transcript || 'No speech could be made out in that recording, so there is no score for it. Check your microphone and record the answer again.'
    : null;

  return (
    <EvaluationCard
      evaluation={evaluation}
      xpAwarded={xpAwarded}
      taskType={taskType}
      notes={note ? [note] : []}
      answerTitle={heard !== null ? 'What we heard' : 'Your answer'}
      answerLegend={written && score !== null ? <MarkedAnswerLegend writing /> : undefined}
      answer={written ? (
        <MarkedAnswer text={written} fixes={evaluation.sentenceFeedback ?? []} rated={score !== null} />
      ) : heard !== null ? (
        <p className="text-sm leading-relaxed text-foreground">{heard}</p>
      ) : undefined}
    />
  );
}

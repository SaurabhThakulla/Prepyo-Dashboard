import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, dialogBand } from '@/components/ui/dialog';
import QuestionFigure from '@/components/practice/QuestionFigure';
import { GAP } from '@/lib/listeningTypes';
import { AnswerSubmission, PracticeAttempt, Question } from '@/lib/types';

export interface MarkedAnswer {
  attempt: PracticeAttempt;
  review: Question;
}

/** An answer as printed: TRUE as "True", NOT_GIVEN as "Not given"; letters and words as they are. */
const pretty = (value: string) =>
  /^[A-Z_]{2,}$/.test(value) ? value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : value;

const given = (answer?: AnswerSubmission) =>
  answer?.selectedOptions?.length ? answer.selectedOptions.map(pretty).join(', ') : (answer?.textResponse ?? '').trim();

/**
 * Multiple choice (A, B, C with worded options) is shown as its list of options; every other
 * task (True/False/Not Given, matching, maps, diagrams, gaps) as one line: yours, then the key.
 */
const isChoiceList = (question: Question, typeId: string) =>
  /mcq/.test(typeId) && (question.options ?? []).some(option => option.text.trim() && option.text.trim() !== option.id);

/** A set of questions in the result: a listening group, or a reading set (its first number is where it starts). */
export interface ResultGroup {
  id: string;
  heading?: string;
  imageUrl?: string;
  typeId: string;
  firstNumber: number;
  questions: Question[];
}

/**
 * The marked part or passage, in a pop-up: the score on a gauge, every question's
 * number coloured right or wrong (a set ringed while its answers are shown), and the
 * learner's answers to that set beside the key, as the test's review shows them.
 * Used by Listening part practice and Reading passage practice.
 */
export default function ListeningPartResult({ open, onOpenChange, title, groups, answers, marked }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  groups: ResultGroup[];
  answers: Record<string, AnswerSubmission>;
  marked: Record<string, MarkedAnswer>;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (open) setShown(0);
  }, [open]);

  const questions = groups.flatMap(group => group.questions);
  const right = (question: Question) => Boolean(marked[question.id]?.attempt.isCorrect);
  const correct = questions.filter(right).length;
  const group = groups[Math.min(shown, groups.length - 1)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent band className="max-h-[90vh] max-w-5xl gap-4 overflow-y-auto">
        <div className={dialogBand}>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-xs">Unanswered questions count as wrong. Anything you got wrong stays in your Mistake Bank.</DialogDescription>
        </div>

        <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <section className="rounded-2xl border border-border text-center">
            <h3 className="border-b border-border py-2 text-xs font-semibold text-muted-foreground">Score</h3>
            <Gauge correct={correct} total={questions.length} />
          </section>
          <section className="rounded-2xl border border-border">
            <h3 className="border-b border-border py-2 text-center text-xs font-semibold text-muted-foreground">Your score</h3>
            <div className="flex flex-wrap items-center justify-center gap-2 p-4">
              {groups.map((g, index) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setShown(index)}
                  aria-label={`Show answers to questions ${g.firstNumber}–${g.firstNumber + g.questions.length - 1}`}
                  aria-pressed={index === shown}
                  className={`flex items-center gap-1.5 rounded-full p-1 transition-shadow ${index === shown ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border'}`}
                >
                  {g.questions.map((question, i) => (
                    <span
                      key={question.id}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${
                        right(question)
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
                          : 'border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
                      }`}
                    >
                      {g.firstNumber + i}
                    </span>
                  ))}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border">
          <h3 className="border-b border-border py-2 text-center text-xs font-semibold text-muted-foreground">Your answers</h3>
          <div className="space-y-4 p-4">
            {group.heading && <h4 className="text-base font-bold text-foreground">{group.heading}</h4>}
            {group.imageUrl && <QuestionFigure src={group.imageUrl} alt={group.heading || 'Map'} />}
            {group.questions.map((question, i) => (
              <AnswerReview
                key={question.id}
                number={group.firstNumber + i}
                question={question}
                typeId={group.typeId}
                answer={answers[question.id]}
                result={marked[question.id]}
              />
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

/** A half-circle filled to the share of right answers. */
function Gauge({ correct, total }: { correct: number; total: number }) {
  const share = total ? Math.round((correct / total) * 100) : 0;
  const tone = share >= 70 ? 'stroke-emerald-500' : share >= 40 ? 'stroke-amber-500' : 'stroke-rose-500';
  return (
    <div className="px-4 pb-3 pt-2">
      <svg viewBox="0 0 100 56" className="mx-auto w-28" aria-hidden>
        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-muted" />
        {correct > 0 && (
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" strokeWidth="10" strokeLinecap="round" pathLength={100} strokeDasharray={`${share} 100`} className={tone} />
        )}
      </svg>
      <p className="-mt-5 text-2xl font-bold tabular-nums text-foreground">{correct}</p>
      <p className="text-sm text-muted-foreground">out of {total}</p>
    </div>
  );
}

function AnswerReview({ number, question, typeId, answer, result }: {
  number: number;
  question: Question;
  typeId: string;
  answer?: AnswerSubmission;
  result?: MarkedAnswer;
}) {
  const key = result?.review.correctAnswers ?? [];
  const yours = given(answer);
  const prompt = question.prompt.replace(GAP, '______');

  if (isChoiceList(question, typeId)) {
    const chosen = answer?.selectedOptions ?? [];
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground sm:text-base">
          <span className="tabular-nums">{number}.</span> {prompt}
          {!yours && <span className="ml-2 text-xs font-medium text-rose-600">Not answered</span>}
        </p>
        <ul className="space-y-1">
          {(question.options ?? []).map(option => {
            const isKey = key.includes(option.id);
            const isChosen = chosen.includes(option.id);
            return (
              <li
                key={option.id}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                  isKey ? 'bg-emerald-50 dark:bg-emerald-500/15' : isChosen ? 'bg-rose-50 dark:bg-rose-500/15' : ''
                }`}
              >
                <span
                  aria-hidden
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                    isChosen ? (isKey ? 'border-emerald-600 bg-emerald-600' : 'border-rose-600 bg-rose-600') : 'border-muted-foreground/50'
                  }`}
                />
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isKey ? 'border border-emerald-600 text-emerald-700 dark:text-emerald-300' : isChosen ? 'border border-rose-600 text-rose-700 dark:text-rose-300' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {option.id}
                </span>
                <span className="text-foreground">{option.text}</span>
                {isChosen && <span className="sr-only">{isKey ? '(your answer, correct)' : '(your answer, wrong)'}</span>}
                {isKey && !isChosen && <span className="sr-only">(correct answer)</span>}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // A map's letter, a matching letter or a typed gap: the learner's answer and, when wrong, the key.
  const isRight = Boolean(result?.attempt.isCorrect);
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-foreground sm:text-base">
      <span>
        <span className="font-semibold tabular-nums">{number}.</span> {prompt}
      </span>
      {yours ? (
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-semibold ${isRight ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'}`}>
          {isRight ? <CheckCircle2 className="h-4 w-4" aria-label="Correct" /> : <XCircle className="h-4 w-4" aria-label="Wrong" />}
          {yours}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-sm font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
          <XCircle className="h-4 w-4" aria-hidden /> Not answered
        </span>
      )}
      {!isRight && key.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" aria-label="Correct answer" />
          {key.map(pretty).join(' / ')}
        </span>
      )}
    </p>
  );
}

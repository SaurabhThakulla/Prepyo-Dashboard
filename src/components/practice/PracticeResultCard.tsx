import React from 'react';
import { Award, CheckCircle2, XCircle, Quote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { PracticeResult } from '@/lib/hooks/usePracticeSession';

/**
 * What came back from grading. Two shapes, because the two paths differ:
 * reading and listening return a right/wrong attempt, writing and speaking
 * return a rubric from the AI evaluator.
 */
export default function PracticeResultCard({ result }: { result: PracticeResult }) {
  if (result.attempt) return <DeterministicResult result={result} />;
  if (result.evaluation) return <EvaluationResult result={result} />;
  return null;
}

function XpBadge({ xpAwarded }: { xpAwarded: number }) {
  if (xpAwarded <= 0) return null;
  return <Badge variant="warning">+{xpAwarded} XP</Badge>;
}

/** Reading and listening: graded on the server, right or wrong. */
function DeterministicResult({ result }: { result: PracticeResult }) {
  const attempt = result.attempt!;

  return (
    <Card className="border-primary/40 p-6 space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {attempt.isCorrect ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-500" />
          )}
          <CardTitle className="text-base">{attempt.isCorrect ? 'Correct' : 'Not quite'}</CardTitle>
        </div>
        <XpBadge xpAwarded={result.xpAwarded} />
      </div>

      <div className="bg-background p-4 rounded-xl border border-border text-center space-y-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Score</span>
        <div className="font-display text-4xl font-black text-foreground">
          {attempt.score}
          <span className="text-xs text-muted-foreground font-bold"> / {attempt.maxScore}</span>
        </div>
        <p className="text-xs text-foreground pt-1">{attempt.feedback}</p>
      </div>

      {result.review?.explanation && (
        <div className="p-3 rounded-xl bg-background border border-border space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Explanation</span>
          <p className="text-[11px] text-foreground leading-relaxed">{result.review.explanation}</p>
        </div>
      )}
    </Card>
  );
}

/** Writing and speaking: a band estimate plus rubric feedback. */
function EvaluationResult({ result }: { result: PracticeResult }) {
  const evaluation = result.evaluation!;

  return (
    <Card className="border-primary/40 p-6 space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <CardTitle className="text-base">Evaluation</CardTitle>
        </div>
        <XpBadge xpAwarded={result.xpAwarded} />
      </div>

      <div className="bg-background p-4 rounded-xl border border-border text-center space-y-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Practice estimate</span>
        <div className="font-display text-4xl font-black text-foreground">
          {evaluation.estimatedScore ?? '—'}
        </div>
        <p className="text-xs text-foreground pt-1">{evaluation.summary}</p>
      </div>

      {/* What was actually heard. Every judgement below is about these words,
          so a learner can see whether the evaluator heard them correctly
          before taking the score to heart. */}
      {evaluation.skill === 'speaking' && (
        <div className="p-3 rounded-xl bg-background border border-border space-y-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
            <Quote className="w-3 h-3" /> What we heard
          </span>
          {evaluation.transcript ? (
            <p className="text-[11px] text-foreground italic leading-relaxed">
              &ldquo;{evaluation.transcript}&rdquo;
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              No speech could be made out in that recording, so there is no score for it.
              Check your microphone and record the answer again.
            </p>
          )}
        </div>
      )}

      {evaluation.criteria.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Rubric</span>
          {evaluation.criteria.map(criterion => (
            <div key={criterion.name} className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
              <div className="flex justify-between font-bold text-foreground">
                <span>{criterion.name}</span>
                <span className="text-primary">
                  {criterion.score}/{criterion.maxScore}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{criterion.feedback}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

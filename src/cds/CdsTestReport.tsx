import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle2, MinusCircle, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MarkedText } from '@/components/practice/OptionContent';
import { errorMessage } from '@/lib/api';
import { cdsApi } from './cdsApi';
import { cdsKeys, cdsMaxMarks, cdsQuestion, useCdsMocks } from './cdsShared';

interface Props {
  attemptId: string;
  onBack: () => void;
  onRedo?: () => void;
}

/** UPSC's sectional cut-off: at least 20% of a paper's marks. */
const CUT_OFF = 0.2;

/**
 * The score report of a CDS paper, laid out as the shared ScoreReport: net
 * marks after UPSC's negative marking, then every question with its answer.
 */
export default function CdsTestReport({ attemptId, onBack, onRedo }: Props) {
  const { papers } = useCdsMocks(true);
  const { data, isPending, error } = useQuery({
    queryKey: cdsKeys.attempt(attemptId),
    queryFn: () => cdsApi.getAttempt(attemptId),
  });

  if (isPending) return <Card className="p-8 mx-4 sm:mx-6 lg:mx-8 my-6 text-sm text-muted-foreground">Loading the report…</Card>;
  if (error || !data) {
    return (
      <Card className="p-8 mx-4 sm:mx-6 lg:mx-8 my-6 space-y-3">
        <p className="text-sm text-foreground">Could not load this report. {error ? errorMessage(error) : ''}</p>
        <Button variant="outline" size="sm" onClick={onBack}>Back to Mock Center</Button>
      </Card>
    );
  }

  const { attempt } = data;
  const paper = papers.find(p => p.id === attempt.paperId);
  const max = cdsMaxMarks(paper) || attempt.totalCorrect + attempt.totalWrong;
  const questions = data.questions.map(q => cdsQuestion(q, paper?.paperType));
  const skipped = questions.length - attempt.totalAttempted;
  const cleared = max > 0 && attempt.netScore >= max * CUT_OFF;

  return (
    <Card className="border-primary/40 p-6 sm:p-8 space-y-6 mx-4 sm:mx-6 lg:mx-8 my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="font-display text-2xl font-bold text-foreground">Score Report</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(attempt.submittedAt ?? attempt.startedAt).toLocaleString('en-US')} • {attempt.paperTitle ?? paper?.title ?? 'CDS'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5 font-bold">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Back to Mock Center</span>
          </Button>
          {onRedo && (
            <Button size="sm" onClick={onRedo} className="gap-1.5 font-bold">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Redo</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Net marks</span>
          <div className="font-display text-4xl font-black text-foreground">
            {attempt.netScore.toFixed(2)}
            {max > 0 && <span className="text-xs font-bold text-muted-foreground"> / {max}</span>}
          </div>
          <Badge variant={cleared ? 'default' : 'outline'}>
            {cleared ? 'Above the 20% cut-off' : 'Below the 20% cut-off'}
          </Badge>
        </Card>
        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Correct</span>
          <div className="font-display text-4xl font-black text-primary">
            {attempt.totalCorrect}
            <span className="text-xs font-bold text-muted-foreground"> / {questions.length}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {attempt.totalWrong} wrong · {skipped} skipped
          </p>
        </Card>
        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Duration</span>
          <div className="font-display text-4xl font-black text-amber-400">
            {Math.round(attempt.timeSpentSeconds / 60)}
            <span className="text-xs font-bold text-muted-foreground"> min</span>
          </div>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        {attempt.rawScore.toFixed(2)} for correct answers − {attempt.penalty.toFixed(2)} for wrong ones = {attempt.netScore.toFixed(2)}.
        As in the UPSC paper, a wrong answer costs a third of a right one and a skipped question costs nothing.
      </p>

      <div className="space-y-3 pt-2">
        <h3 className="font-display text-sm font-bold text-foreground">Answers</h3>
        <ol className="space-y-3">
          {questions.map((question, index) => {
            const given = attempt.answers?.[question.id];
            const key = question.correctAnswers?.[0];
            const option = (id?: string) => question.options?.find(o => o.id === id)?.text ?? '';
            const Icon = !given ? MinusCircle : given === key ? CheckCircle2 : XCircle;
            const tone = !given ? 'text-muted-foreground' : given === key ? 'text-emerald-600' : 'text-rose-600';
            return (
              <li key={question.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone}`} />
                  <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase text-muted-foreground">
                      {index + 1} · {question.typeName}
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-line">
                      <MarkedText text={question.prompt} />
                    </p>
                    {question.contextPassage && (
                      <p className="text-sm text-foreground/90 whitespace-pre-line">
                        <MarkedText text={question.contextPassage} />
                      </p>
                    )}
                  </div>
                </div>
                <div className="pl-6 text-xs space-y-1">
                  <p>
                    Answer: <strong>({key?.toLowerCase()}) <MarkedText text={option(key)} /></strong>
                    <span className="text-muted-foreground">
                      {given ? <> · yours: ({given.toLowerCase()}) <MarkedText text={option(given)} /></> : ' · skipped'}
                    </span>
                  </p>
                  {question.explanation && <p className="text-muted-foreground">{question.explanation}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

import React from 'react';
import { Clock, Flag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import MockAnswerInput from '@/components/mocks/MockAnswerInput';
import PromptAudio from '@/components/practice/PromptAudio';
import { AnswerSubmission, Mock, Question } from '@/lib/types';
import { isWordHighlightTask } from '@/lib/listening';

/** Seconds as mm:ss, zero-padded, for the exam countdown. */
function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface MockExamRunnerProps {
  mock: Mock;
  questions: Question[];
  currentIndex: number;
  currentQuestion: Question | null;
  secondsLeft: number;
  answers: Record<string, AnswerSubmission>;
  flaggedIds: string[];
  isSubmitting: boolean;
  onAnswer: (question: Question, patch: Partial<AnswerSubmission>) => void;
  onToggleFlag: (questionId: string) => void;
  onGoToIndex: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  onExit: () => void;
}

/** The exam itself: timer bar, the current question, and the palette. */
export default function MockExamRunner({
  mock,
  questions,
  currentIndex,
  currentQuestion,
  secondsLeft,
  answers,
  flaggedIds,
  isSubmitting,
  onAnswer,
  onToggleFlag,
  onGoToIndex,
  onPrevious,
  onNext,
  onFinish,
  onExit,
}: MockExamRunnerProps) {
  const isLastQuestion = currentIndex >= questions.length - 1;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
      <div className="bg-card border border-border p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 sticky top-20 z-30 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Badge variant="default">{mock.exam}</Badge>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">{mock.title}</h3>
            <p className="text-[11px] text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-xl border border-border text-amber-400 font-mono font-bold text-sm">
            <Clock className="w-4 h-4" />
            <span>{formatCountdown(secondsLeft)}</span>
          </div>
          <Button onClick={onFinish} disabled={isSubmitting} variant="destructive" size="sm" className="font-bold">
            {isSubmitting ? 'Scoring…' : 'Finish & Submit'}
          </Button>
        </div>
      </div>

      {!currentQuestion ? (
        <Card className="p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <CardTitle className="text-base">This mock has no questions attached</CardTitle>
          <CardDescription>Nothing to sit yet. Try another exam from the catalog.</CardDescription>
          <Button variant="outline" size="sm" onClick={onExit} className="font-bold text-xs">Back</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="default">{currentQuestion.typeName}</Badge>
                <span className="text-xs text-muted-foreground capitalize">{currentQuestion.skill}</span>
              </div>
              <Button
                size="sm"
                variant={flaggedIds.includes(currentQuestion.id) ? 'warning' : 'outline'}
                onClick={() => onToggleFlag(currentQuestion.id)}
                className="font-bold text-xs gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flaggedIds.includes(currentQuestion.id) ? 'Flagged' : 'Flag'}</span>
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="font-display font-bold text-base text-foreground">{currentQuestion.title}</h4>
              <div className="p-4 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground leading-relaxed">
                {currentQuestion.prompt}
              </div>

              {currentQuestion.contextPassage && !isWordHighlightTask(currentQuestion) && (
                <div className="p-4 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed max-h-56 overflow-y-auto">
                  {currentQuestion.contextPassage}
                </div>
              )}

              <PromptAudio
                key={currentQuestion.id}
                questionId={currentQuestion.id}
                audioUrl={currentQuestion.audioUrl}
                audioTranscript={currentQuestion.audioTranscript}
                title={currentQuestion.title}
                allowTranscript={false}
              />

              <MockAnswerInput
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onChange={patch => onAnswer(currentQuestion, patch)}
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={onPrevious}
                className="font-bold text-xs"
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={isLastQuestion ? onFinish : onNext}
                className="font-bold text-xs"
              >
                {isLastQuestion ? 'Finish & Submit' : 'Next Question ➔'}
              </Button>
            </div>
          </Card>

          <Card className="lg:col-span-4 p-5 space-y-4">
            <CardTitle className="text-xs uppercase">Question palette</CardTitle>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((question, index) => {
                const isCurrent = currentIndex === index;
                const isFlagged = flaggedIds.includes(question.id);
                const isAnswered = Boolean(answers[question.id]);

                // Current beats flagged beats answered, so the learner can
                // always see where they are.
                const style = isCurrent
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                  : isFlagged
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                    : isAnswered
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40';

                return (
                  <button
                    key={question.id}
                    onClick={() => onGoToIndex(index)}
                    className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${style}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

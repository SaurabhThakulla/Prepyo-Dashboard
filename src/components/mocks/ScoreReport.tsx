import React from 'react';
import { Award, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MockAttempt, MockSubmitOutcome } from '@/lib/types';

interface ScoreReportProps {
  attempt: MockAttempt;
  /**
   * Only present right after submitting. Reviewing an old attempt from the
   * reports list has no outcome, so the XP line and the "what wasn't graded"
   * note are hidden.
   */
  outcome?: MockSubmitOutcome;
  onBack: () => void;
}

/** The scorecard shown after finishing a mock, and when reviewing an old one. */
export default function ScoreReport({ attempt, outcome, onBack }: ScoreReportProps) {
  const skillScores = Object.entries(attempt.skillScores ?? {});

  return (
    <Card className="border-primary/40 p-6 sm:p-8 space-y-6 mx-4 sm:mx-6 lg:mx-8 my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="font-display text-2xl font-bold text-foreground">Score Report</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(attempt.completedAt).toLocaleString()} • {attempt.exam}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5 font-bold">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Back to Mock Center</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Overall</span>
          <div className="font-display text-4xl font-black text-foreground">{attempt.userScore}</div>
          <Badge variant="default">Practice estimate</Badge>
        </Card>

        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Correct</span>
          <div className="font-display text-4xl font-black text-primary">
            {attempt.totalCorrect}
            <span className="text-xs font-bold text-muted-foreground"> / {attempt.totalQuestions}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Auto-graded questions</p>
        </Card>

        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Duration</span>
          <div className="font-display text-4xl font-black text-amber-400">
            {Math.round(attempt.durationSeconds / 60)}
            <span className="text-xs font-bold text-muted-foreground"> min</span>
          </div>
          {outcome && <p className="text-[10px] text-muted-foreground">+{outcome.xpAwarded} XP awarded</p>}
        </Card>
      </div>

      {/* The API is explicit about what the score does and does not cover. */}
      {outcome && outcome.ungradedQuestions > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-medium flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            This score covers {outcome.scoredQuestions} auto-graded question
            {outcome.scoredQuestions === 1 ? '' : 's'}. {outcome.ungradedQuestions} speaking/writing question
            {outcome.ungradedQuestions === 1 ? ' was' : 's were'} left out rather than guessed at.
            Confidence: {outcome.scoreConfidence}.
          </span>
        </div>
      )}

      {skillScores.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-display text-sm font-bold text-foreground">Skill breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {skillScores.map(([skill, score]) => (
              <div key={skill} className="p-3.5 rounded-xl bg-card border border-border text-center space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase capitalize">{skill}</span>
                <div className="font-display text-xl font-black text-foreground">{score}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

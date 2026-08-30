'use client';

import React from 'react';
import { Play, FileText, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mock, MockAttempt } from '@/lib/types';

interface ScoreReportListProps {
  attempts: MockAttempt[];
  /** Used to show the mock's title instead of its id. */
  mocks: Mock[];
  onReview: (attempt: MockAttempt) => void;
  onBrowseCatalog: () => void;
}

/** Past attempts, newest first, each opening into a ScoreReport. */
export default function ScoreReportList({
  attempts,
  mocks,
  onReview,
  onBrowseCatalog,
}: ScoreReportListProps) {
  if (attempts.length === 0) {
    return (
      <Card className="text-center py-16 p-6 border-dashed border-border space-y-3">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-foreground">No score reports yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Complete a mock exam and its scorecard will appear here.
          </p>
        </div>
        <Button onClick={onBrowseCatalog} size="sm" className="font-bold text-xs gap-1.5 mt-2">
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Browse catalog</span>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {attempts.map(attempt => (
        <Card
          key={attempt.id}
          className="p-5 border-border hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="indigo">{attempt.exam}</Badge>
              <span className="text-xs font-bold text-foreground">
                {mocks.find(mock => mock.id === attempt.mockId)?.title ?? attempt.mockId}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(attempt.completedAt).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>{Math.round(attempt.durationSeconds / 60)} min</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] font-bold text-muted-foreground uppercase">Score</div>
              <div className="font-display text-2xl font-black text-foreground">{attempt.userScore}</div>
            </div>
            <Button onClick={() => onReview(attempt)} size="sm" className="font-bold text-xs gap-1.5 shadow-sm">
              <span>Review</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

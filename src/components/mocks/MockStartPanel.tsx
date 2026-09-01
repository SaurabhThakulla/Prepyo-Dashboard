import React from 'react';
import { Play, RefreshCw, AlertCircle, Clock, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { ExamType, Mock } from '@/lib/types';

interface MockStartPanelProps {
  mock: Mock | null;
  exam: ExamType;
  isStarting: boolean;
  onStart: (mock: Mock) => void;
}

export default function MockStartPanel({ mock, exam, isStarting, onStart }: MockStartPanelProps) {
  if (!mock) {
    return (
      <Card className="text-center py-16 p-6 border-dashed border-border space-y-2">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
        <h3 className="font-display text-base font-bold text-foreground">No {exam} mock available</h3>
        <p className="text-xs text-muted-foreground">Switch exam or check back later.</p>
      </Card>
    );
  }

  return (
    <div className="w-full flex justify-center py-6 sm:py-10">
      <Card className="w-full max-w-2xl p-8 sm:p-10 text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="indigo">{mock.exam}</Badge>
          {mock.isGenerated && <Badge variant="default">Fresh each time</Badge>}
        </div>

        <div className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl">{mock.title}</CardTitle>
          <CardDescription className="max-w-lg mx-auto">{mock.description}</CardDescription>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            {mock.totalDurationMinutes} min
          </span>
          <span className="flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5 text-primary" />
            {mock.isGenerated
              ? 'Passages you have not sat before, drawn when you start'
              : `${mock.totalQuestions} question${mock.totalQuestions === 1 ? '' : 's'} across ` +
                `${mock.sections.length} section${mock.sections.length === 1 ? '' : 's'}`}
          </span>
        </div>

        <Button
          onClick={() => onStart(mock)}
          disabled={isStarting}
          className="w-full sm:w-auto sm:min-w-[240px] mx-auto font-bold gap-2 h-11 shadow-md"
        >
          {isStarting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{isStarting ? 'Preparing your paper…' : "Let's start"}</span>
        </Button>

        <p className="text-[11px] text-muted-foreground">
          The timer starts as soon as you begin, and the paper is graded on the server.
        </p>
      </Card>
    </div>
  );
}

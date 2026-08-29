'use client';

import React from 'react';
import { Play, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { ExamType, Mock } from '@/lib/types';

interface MockCatalogProps {
  mocks: Mock[];
  exam: ExamType;
  /** Set to the mock being opened, so only that card shows a spinner. */
  startingMockId: string | null;
  onStart: (mock: Mock) => void;
}

/** The grid of mocks a learner can sit. */
export default function MockCatalog({ mocks, exam, startingMockId, onStart }: MockCatalogProps) {
  if (mocks.length === 0) {
    return (
      <Card className="text-center py-16 p-6 border-dashed border-border space-y-2">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
        <h3 className="font-display text-base font-bold text-foreground">No {exam} mocks available</h3>
        <p className="text-xs text-muted-foreground">Switch exam or check back later.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {mocks.map(mock => {
        const isStarting = startingMockId === mock.id;

        return (
          <Card key={mock.id} className="p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="indigo">{mock.exam} • {mock.totalDurationMinutes} min</Badge>
                {mock.isDiagnostic && <Badge variant="warning">Diagnostic</Badge>}
              </div>
              <CardTitle className="text-base">{mock.title}</CardTitle>
              <CardDescription>{mock.description}</CardDescription>
              <p className="text-[11px] text-muted-foreground">
                {mock.totalQuestions} question{mock.totalQuestions === 1 ? '' : 's'} across{' '}
                {mock.sections.length} section{mock.sections.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button
              onClick={() => onStart(mock)}
              disabled={isStarting}
              className="w-full font-bold gap-2 shadow-md"
            >
              {isStarting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              <span>{isStarting ? 'Loading…' : 'Start exam'}</span>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

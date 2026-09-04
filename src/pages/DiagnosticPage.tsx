import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Zap,
  Clock,
  Award,
  RefreshCw,
  Sparkles,
  Play,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { errorMessage } from '@/lib/api';
import { useMocks } from '@/lib/hooks/useResources';

/**
 * The diagnostic is not a separate quiz — it is the mock flagged as diagnostic
 * for the learner's exam. This page introduces it and hands off to the mock
 * runner, so there is exactly one place where an exam is sat and graded.
 */
export default function DiagnosticPage() {
  const { activeExam } = useApp();
  const navigate = useNavigate();

  // Same query as the mocks page, so arriving here from /mocks costs nothing.
  const { data, isPending, error: queryError } = useMocks(activeExam);

  const diagnostic = data?.mocks?.find(mock => mock.isDiagnostic) ?? null;
  const loading = isPending;
  const error = queryError ? errorMessage(queryError) : null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  if (error || !diagnostic) {
    return (
      <div className="max-w-4xl mx-auto py-4">
        <Card className="p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <CardTitle className="text-base">
            {error ? 'Could not load the diagnostic' : `No ${activeExam} diagnostic available`}
          </CardTitle>
          <CardDescription>
            {error ?? 'There is no diagnostic exam for this exam type yet. You can still take a full mock.'}
          </CardDescription>
          <Button asChild variant="outline" size="sm" className="font-bold text-xs">
            <Link to="/mocks">Browse mock exams</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const skills = Array.from(new Set(diagnostic.sections.map(s => s.skill)));

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <Card className="p-8 sm:p-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
          <Zap className="w-8 h-8 fill-amber-400" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <Badge variant="indigo">{diagnostic.totalDurationMinutes}-minute diagnostic</Badge>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground">
            {diagnostic.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {diagnostic.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left text-xs">
          <div className="p-4 rounded-xl bg-background border border-border space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> {diagnostic.totalDurationMinutes} minutes
            </span>
            <p className="text-muted-foreground">
              {diagnostic.totalQuestions} question{diagnostic.totalQuestions === 1 ? '' : 's'} across{' '}
              {skills.join(', ')}.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-background border border-border space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Server graded
            </span>
            <p className="text-muted-foreground">
              Reading and listening are scored automatically. Speaking and writing are recorded but not scored.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-background border border-border space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Sets your estimate
            </span>
            <p className="text-muted-foreground">
              Your first score estimate and readiness figure come from this attempt.
            </p>
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => navigate(`/mocks?start=${diagnostic.id}`)}
          className="font-extrabold text-sm gap-2 shadow-lg shadow-primary/20 px-8 rounded-2xl h-12"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Begin diagnostic</span>
        </Button>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { ClipboardList, LineChart, Loader2, Target } from 'lucide-react';
import { errorMessage } from '@/lib/api';
import { EXAM_MAX_SCORE } from '@/lib/types';
import { ExamCode, fetchStudentProgress, StudentProgress } from './api';
import { examName } from './profile';

/** A score on its exam's own scale: 6.5 / 9, 72 / 90. */
export function scoreOutOf(exam: ExamCode, score: number): string {
  const rounded = Math.round(score * 10) / 10;
  return `${rounded} / ${EXAM_MAX_SCORE[exam] ?? 100}`;
}

const shortDay = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** One student's mock scores over time and their practice in each of the last 12 weeks. */
export default function StudentProgressPanel({ id }: { id: string }) {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setProgress(null);
    fetchStudentProgress(id)
      .then(data => current && (setProgress(data), setError(null)))
      .catch(err => current && setError(errorMessage(err)));
    return () => {
      current = false;
    };
  }, [id]);

  if (error) return <p className="text-rose-600 dark:text-rose-400">{error}</p>;
  if (!progress) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  // Mocks on the student's current exam; they may have switched exams since older ones.
  const mocks = progress.mocks.filter(mock => mock.exam === progress.exam);
  const max = EXAM_MAX_SCORE[progress.exam] ?? 100;
  const busiestWeek = Math.max(1, ...progress.weeks.map(week => week.answers));
  const first = mocks[0];
  const last = mocks[mocks.length - 1];
  const change = first && last && mocks.length > 1 ? Math.round((last.score - first.score) * 10) / 10 : null;

  // Nothing to chart yet: one friendly card instead of empty charts.
  if (mocks.length === 0 && progress.weeks.every(week => week.answers === 0)) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LineChart className="h-6 w-6" />
        </span>
        <div>
          <p className="font-display text-base font-semibold text-foreground">No activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Charts appear after their first practice or mock test.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display font-semibold text-foreground">Mock scores · {examName(progress.exam)}</p>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {progress.targetScore !== null && (
              <span className="inline-flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> Target {scoreOutOf(progress.exam, progress.targetScore)}
              </span>
            )}
            {change !== null && (
              <span className={change >= 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-rose-600 dark:text-rose-400'}>
                {change >= 0 ? '+' : ''}
                {change} since first mock
              </span>
            )}
          </div>
        </div>
        {mocks.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-muted-foreground">
            <ClipboardList className="h-4 w-4 shrink-0" /> No mock tests yet
          </p>
        ) : (
          <div className="relative rounded-lg border border-border bg-background p-3">
            {progress.targetScore !== null && (
              <div
                className="pointer-events-none absolute inset-x-3 border-t border-dashed border-primary/60"
                style={{ bottom: `calc(${(Math.min(progress.targetScore, max) / max) * 7}rem + 2.25rem)` }}
                aria-hidden
              />
            )}
            <div className="flex items-end gap-1.5 overflow-x-auto" role="list" aria-label="Mock scores, oldest first">
              {mocks.map((mock, i) => (
                <div key={i} role="listitem" className="flex min-w-[2.25rem] flex-1 flex-col items-center gap-1" title={`${mock.title || 'Mock test'} · ${scoreOutOf(mock.exam, mock.score)}`}>
                  <span className="text-[10px] font-semibold tabular-nums text-foreground">{Math.round(mock.score * 10) / 10}</span>
                  <div className="flex h-28 w-full items-end">
                    <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${Math.max(4, (mock.score / max) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{shortDay(mock.at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="font-display font-semibold text-foreground">Practice · last 12 weeks</p>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-end gap-1" role="list" aria-label="Practice answers per week, oldest first">
            {progress.weeks.map(week => (
              <div
                key={week.weekStart}
                role="listitem"
                className="flex flex-1 flex-col items-center gap-1"
                title={`Week of ${shortDay(week.weekStart)}: ${week.answers} answers${week.averageAccuracy !== null ? `, ${Math.round(week.averageAccuracy)}% average` : ''}`}
              >
                <span className="text-[10px] tabular-nums text-muted-foreground">{week.answers || ''}</span>
                <div className="flex h-16 w-full items-end">
                  <div
                    className={`w-full rounded-t ${week.answers ? 'bg-emerald-500/80' : 'bg-muted'}`}
                    style={{ height: week.answers ? `${Math.max(6, (week.answers / busiestWeek) * 100)}%` : '3px' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{progress.weeks[0] && shortDay(progress.weeks[0].weekStart)}</span>
            <span>This week</span>
          </div>
        </div>
      </div>
    </div>
  );
}

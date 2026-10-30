import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { errorMessage } from '@/lib/api';
import { ExamCode, fetchStudentActivity, StudentActivity } from './api';
import { examName } from './profile';

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const when = (value: string) =>
  new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** One student's practice by skill over the period, and their latest answers and mocks. */
export default function StudentActivityPanel({ id, days, period }: { id: string; days: number; period: string }) {
  const [activity, setActivity] = useState<StudentActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setActivity(null);
    fetchStudentActivity(id, days)
      .then(data => current && (setActivity(data), setError(null)))
      .catch(err => current && setError(errorMessage(err)));
    return () => {
      current = false;
    };
  }, [id, days]);

  if (error) return <p className="text-rose-600 dark:text-rose-400">{error}</p>;
  if (!activity) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="font-medium text-foreground">Practice by skill · {period}</p>
        {activity.skills.length === 0 ? (
          <p className="text-muted-foreground">No practice in this period.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activity.skills.map(s => (
              <div key={s.skill} className="rounded-lg border border-border bg-background px-2.5 py-1.5">
                <span className="font-semibold text-foreground">{capital(s.skill)}</span>
                <span className="text-muted-foreground">
                  {' '}· {s.attempts} answers
                  {s.averageAccuracy !== null && ` · ${Math.round(s.averageAccuracy)}% average`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="font-medium text-foreground">Latest activity</p>
        {activity.recent.length === 0 ? (
          <p className="text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-background">
            {activity.recent.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{item.title || item.task}</p>
                  <p className="truncate text-muted-foreground">
                    {[item.exam && examName(item.exam as ExamCode), item.skill && capital(item.skill), item.task].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums text-foreground">{scoreText(item)}</p>
                  <p className="text-muted-foreground">{when(item.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function scoreText(item: StudentActivity['recent'][number]) {
  if (item.accuracy !== null) return `${item.accuracy}%`;
  if (item.score !== null && item.maxScore) return `${Math.round(item.score * 10) / 10} / ${item.maxScore}`;
  if (item.score !== null) return `Score ${Math.round(item.score * 10) / 10}`;
  return '—';
}

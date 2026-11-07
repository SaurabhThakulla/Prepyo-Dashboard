import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { usePteMockHistory } from '@/lib/hooks/usePteMock';
import { pteMockHref, pteReportHref } from '@/lib/pteMock/catalog';

const SHORT: Record<string, string> = { listening: 'L', reading: 'R', speaking: 'S', writing: 'W' };

/** The learner's PTE mock tests, newest first, each opening its report. */
export default function PteMockHistory() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isPending, error } = usePteMockHistory();

  useEffect(() => {
    if (error) toast.error('Could not load your PTE mock tests', errorMessage(error));
  }, [error]);

  const sessions = data?.sessions ?? [];
  if (isPending) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (sessions.length === 0) {
    return (
      <Card className="p-10 text-center space-y-2 border-dashed">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto opacity-60" />
        <p className="text-sm font-semibold text-foreground">No PTE mock tests yet</p>
        <p className="text-xs text-muted-foreground">Your score reports appear here once you finish a test.</p>
      </Card>
    );
  }

  // The same cards as the other mock results (ScoreReportList).
  return (
    <div className="space-y-4">
      {sessions.map(s => {
        const open = () => navigate(s.status === 'in_progress' ? pteMockHref(s.kind) : pteReportHref(s.id));
        const minutes = s.completedAt ? Math.round((Date.parse(s.completedAt) - Date.parse(s.createdAt)) / 60000) : null;
        return (
          <Card
            key={s.id}
            className="p-5 border-border hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="indigo">PTE</Badge>
                <span className="text-xs font-bold text-foreground">{s.title}</span>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(s.completedAt ?? s.createdAt).toLocaleDateString()}
                </span>
                {minutes != null && <><span>•</span><span>{minutes} min</span></>}
                {s.result && Object.keys(s.result.skills).length > 1 && (
                  <><span>•</span><span className="tabular-nums">{Object.entries(s.result.skills).map(([skill, score]) => `${SHORT[skill]} ${score}`).join(' · ')}</span></>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {s.status === 'completed' ? (
                <div className="text-right">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase">Score</div>
                  <div className="font-display text-2xl font-black text-foreground">{s.headline ?? '—'}</div>
                </div>
              ) : s.status === 'scoring' ? (
                <Badge variant="indigo" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Scoring</Badge>
              ) : (
                <Badge variant="warning">In progress</Badge>
              )}
              <Button onClick={open} size="sm" className="font-bold text-xs gap-1.5 shadow-sm">
                <span>{s.status === 'in_progress' ? 'Resume' : 'Review'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

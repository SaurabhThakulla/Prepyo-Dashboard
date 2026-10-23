import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { usePteMockHistory } from '@/lib/hooks/usePteMock';
import { pteMockHref, pteMockMeta, pteReportHref } from '@/lib/pteMock/catalog';

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

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {sessions.map(s => {
        const meta = pteMockMeta(s.kind);
        const Icon = meta.icon;
        const open = () => navigate(s.status === 'in_progress' ? pteMockHref(s.kind) : pteReportHref(s.id));
        return (
          <button key={s.id} type="button" onClick={open} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
            <div className={`h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br ${meta.accent} text-white flex items-center justify-center`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(s.completedAt ?? s.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            {s.result && (
              <div className="hidden md:flex gap-1">
                {Object.entries(s.result.skills).map(([skill, score]) => (
                  <Badge key={skill} variant="outline" className="text-xs tabular-nums">{SHORT[skill]} {score}</Badge>
                ))}
              </div>
            )}
            {s.status === 'completed' ? (
              <span className="text-lg font-extrabold tabular-nums text-foreground w-10 text-right">{s.headline ?? '—'}</span>
            ) : s.status === 'scoring' ? (
              <Badge variant="indigo" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Scoring</Badge>
            ) : (
              <Badge variant="warning">In progress</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        );
      })}
    </Card>
  );
}

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, ListChecks, PlayCircle, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { usePteMockCatalog } from '@/lib/hooks/usePteMock';
import { formatMinutes, pteMockHref, pteMockMeta, pteReportHref } from '@/lib/pteMock/catalog';
import { PteCatalogEntry } from '@/lib/pteMock/types';

/**
 * The PTE mock test centre: the full test first, then one sectional test per
 * skill, each with what it is made of, what it costs, and the learner's open
 * attempt or last score. Everything shown comes from the catalog endpoint.
 */
export default function PteMockCenter({ header }: { header: React.ReactNode }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isPending, error } = usePteMockCatalog();

  useEffect(() => {
    if (error) toast.error('Could not load mock tests', errorMessage(error));
  }, [error]);

  const entries = data?.mocks ?? [];
  const full = entries.find(e => e.kind === 'full');
  const sections = entries.filter(e => e.kind !== 'full');
  const live = entries.filter(e => e.live);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
      {header}

      {live.length > 0 && (
        <div className="space-y-2">
          {live.map(entry => (
            <div
              key={entry.kind}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
            >
              <p className="text-sm text-foreground">
                <span className="font-bold">{entry.title}</span> is in progress — item {entry.live!.current} of{' '}
                {entry.live!.totalItems}.
              </p>
              <Button size="sm" onClick={() => navigate(pteMockHref(entry.kind))} className="gap-1.5 font-bold">
                <RotateCcw className="h-3.5 w-3.5" /> Resume
              </Button>
            </div>
          ))}
        </div>
      )}

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        </div>
      ) : entries.length === 0 ? null : (
        <>
          {full && <FullTestCard entry={full} onOpen={() => navigate(pteMockHref('full'))} onReport={id => navigate(pteReportHref(id))} />}

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Sectional tests</h2>
              <p className="text-xs text-muted-foreground">One skill at a time, timed and run exactly as that part of the test.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {sections.map(entry => (
                <SectionCard
                  key={entry.kind}
                  entry={entry}
                  onOpen={() => navigate(pteMockHref(entry.kind))}
                  onReport={id => navigate(pteReportHref(id))}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FullTestCard({ entry, onOpen, onReport }: { entry: PteCatalogEntry; onOpen: () => void; onReport: (id: string) => void }) {
  const meta = pteMockMeta('full');
  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-r ${meta.accent} p-6 sm:p-8 text-white grid grid-cols-1 lg:grid-cols-3 gap-6`}>
        <div className="lg:col-span-2 space-y-3">
          <Badge className="bg-white/20 text-white border-transparent">Recommended · Full test</Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold">{entry.title}</h2>
          <p className="text-sm text-white/85 max-w-xl">{entry.description}</p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1"><Clock className="h-3.5 w-3.5" /> About {formatMinutes(entry.estimatedMinutes)}</span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1"><ListChecks className="h-3.5 w-3.5" /> {entry.availableItems} items</span>
            {entry.parts.map((p, i) => (
              <span key={p.part} className="rounded-full bg-white/15 px-3 py-1">Part {i + 1}: {p.label} · {p.items}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 lg:items-end">
          {entry.latest?.headline != null && (
            <button type="button" onClick={() => onReport(entry.latest!.id)} className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-left hover:bg-white/25">
              <Trophy className="h-5 w-5" />
              <span>
                <span className="block text-[10px] uppercase tracking-wide text-white/75">Last overall</span>
                <span className="text-xl font-extrabold tabular-nums">{entry.latest.headline}</span>
              </span>
            </button>
          )}
          <Button onClick={onOpen} disabled={!entry.available && !entry.live} className="bg-white text-primary hover:bg-white/90 font-bold h-11 px-6 gap-2">
            {entry.live ? <RotateCcw className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {entry.live ? 'Resume full test' : 'Start full test'}
          </Button>
          <p className="text-[11px] text-white/75">Uses one full mock test from your plan.</p>
        </div>
      </div>
    </Card>
  );
}

function SectionCard({ entry, onOpen, onReport }: { entry: PteCatalogEntry; onOpen: () => void; onReport: (id: string) => void }) {
  const meta = pteMockMeta(entry.kind);
  const Icon = meta.icon;
  return (
    <Card className="p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.accent} text-white flex items-center justify-center shadow-sm`}>
          <Icon className="h-5 w-5" />
        </div>
        {entry.latest?.headline != null ? (
          <button type="button" onClick={() => onReport(entry.latest!.id)} className="text-right">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Last score</span>
            <span className="text-lg font-extrabold tabular-nums text-foreground">{entry.latest.headline}</span>
          </button>
        ) : entry.live ? (
          <Badge variant="indigo">In progress</Badge>
        ) : null}
      </div>
      <div className="space-y-1 flex-1">
        <h3 className="font-display text-base font-bold text-foreground">{entry.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {entry.tasks.map(t => (
          <Badge key={t.code} variant="outline" className={`font-mono text-[10px] ${t.available === 0 ? 'opacity-40 line-through' : ''}`}>
            {t.code}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatMinutes(entry.estimatedMinutes)}</span>
        <span>{entry.availableItems} items · {entry.cost.credits} sub-tests</span>
      </div>
      <Button onClick={onOpen} disabled={!entry.available && !entry.live} variant={entry.live ? 'default' : 'outline'} className="w-full gap-1.5 font-bold">
        {entry.live ? 'Resume' : entry.available ? 'Start' : 'Not available yet'} {entry.available || entry.live ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
    </Card>
  );
}

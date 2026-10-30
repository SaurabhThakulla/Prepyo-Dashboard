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
import { useMockPapers } from '@/lib/hooks/useMockPapers';
import { costLabel, formatMinutes, pteMockHref, pteMockMeta, pteReportHref } from '@/lib/pteMock/catalog';
import { PteCatalogEntry } from '@/lib/pteMock/types';
import { useApp } from '@/context/AppContext';
import { PteExamVariant } from '@/lib/pteExamConfig';

/**
 * The PTE mock test centre: the full test first, then one sectional test per
 * skill, each with what it is made of, what it costs, and the learner's open
 * attempt or last score. Everything shown comes from the catalog endpoint.
 */
export default function PteMockCenter({ header }: { header: React.ReactNode }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { pteVariant, setPteVariant } = useApp();
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

      {/* PTE Academic vs PTE Core Switcher Tabs in Mock Center */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-xl w-fit border border-border">
        <button
          type="button"
          onClick={() => setPteVariant('academic')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            pteVariant === 'academic'
              ? 'bg-[#00c4a7] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          PTE Academic / UKVI
        </button>
        <button
          type="button"
          onClick={() => setPteVariant('core')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            pteVariant === 'core'
              ? 'bg-[#00c4a7] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          PTE Core
        </button>
      </div>

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
          {full && <FullTestCard entry={full} variant={pteVariant} onOpen={() => navigate(pteMockHref('full'))} onReport={id => navigate(pteReportHref(id))} />}

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                {pteVariant === 'core' ? 'PTE Core Sectional Tests' : 'Sectional tests'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {pteVariant === 'core'
                  ? 'One skill at a time, timed and structured according to PTE Core specifications.'
                  : 'One skill at a time, timed and run exactly as that part of the test.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {sections.map(entry => (
                <SectionCard
                  key={entry.kind}
                  entry={entry}
                  variant={pteVariant}
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

function FullTestCard({
  entry,
  variant,
  onOpen,
  onReport,
}: {
  entry: PteCatalogEntry;
  variant: PteExamVariant;
  onOpen: () => void;
  onReport: (id: string) => void;
}) {
  const meta = pteMockMeta('full');
  const { data: fullPapers = [] } = useMockPapers('pte', 'full');
  const isCore = variant === 'core';
  const title = isCore ? 'PTE Core Full Mock Test' : entry.title;
  const description = isCore
    ? 'All three parts adapted for PTE Core: Speaking (RA, RS, DI, ASQ, RTS), Writing (SWT, Write Email), Reading, and Listening. Timed and scored 10-90.'
    : entry.description;

  return (
    <Card className="overflow-hidden">
      <div className={`relative overflow-hidden bg-gradient-to-r ${meta.accent} p-4 sm:p-6 text-white grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5`}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative lg:col-span-2 space-y-2.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-transparent text-xs px-2 py-0.5">
              {isCore ? 'PTE Core · Full test' : 'Recommended · Full test'}
            </Badge>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/85"><Clock className="h-3 w-3" /> {formatMinutes(entry.estimatedMinutes)}</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold leading-tight">{title}</h2>
          <p className="text-xs sm:text-sm text-white/85 max-w-xl line-clamp-2 sm:line-clamp-none">{description}</p>
          <div className="grid grid-cols-3 gap-2 max-w-md text-center">
            {entry.parts.map(p => (
              <div key={p.part} className="rounded-lg bg-white/15 px-2 py-1.5">
                <span className="block text-sm font-extrabold tabular-nums leading-none">{p.items}</span>
                <span className="block text-xs font-semibold text-white/80 mt-1 leading-tight">{p.label}</span>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80"><ListChecks className="h-3 w-3" /> {fullPapers.length > 0 ? `${fullPapers.length} tests · ` : ''}{entry.availableItems} items</p>
        </div>
        <div className="relative flex flex-col justify-center gap-2 lg:items-end">
          {entry.latest?.headline != null && (
            <button type="button" onClick={() => onReport(entry.latest!.id)} className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-left hover:bg-white/25">
              <Trophy className="h-5 w-5" />
              <span>
                <span className="block text-xs uppercase tracking-wide text-white/75">Last overall</span>
                <span className="text-xl font-extrabold tabular-nums">{entry.latest.headline}</span>
              </span>
            </button>
          )}
          <Button onClick={onOpen} disabled={!entry.available && !entry.live} className="bg-white text-primary hover:bg-white/90 font-bold h-10 px-6 gap-2 shadow-md">
            {entry.live ? <RotateCcw className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {entry.live ? 'Resume full test' : 'Start full test'}
          </Button>
          <p className="hidden sm:block text-[11px] text-white/75">{costLabel(entry.cost)}</p>
        </div>
      </div>
    </Card>
  );
}

function SectionCard({
  entry,
  variant,
  onOpen,
  onReport,
}: {
  entry: PteCatalogEntry;
  variant: PteExamVariant;
  onOpen: () => void;
  onReport: (id: string) => void;
}) {
  const meta = pteMockMeta(entry.kind);
  const Icon = meta.icon;
  const { data: papers = [] } = useMockPapers('pte', entry.kind);
  const isCore = variant === 'core';

  let description = entry.description;
  let taskList = entry.tasks;
  if (isCore) {
    if (entry.kind === 'speaking') {
      description = 'Read Aloud, Repeat Sentence, Describe Image, Answer Short Question, and Respond to a Situation.';
      taskList = taskList.filter(t => t.code !== 'RL' && t.code !== 'SGD');
    } else if (entry.kind === 'writing') {
      description = 'Summarize Written Text and Write Email, timed and evaluated.';
      taskList = taskList.map(t => (t.code === 'WE' ? { ...t, code: 'EMAIL', name: 'Write Email' } : t));
    } else if (entry.kind === 'listening') {
      description = 'Summarize Spoken Text, dictation, blanks, and comprehension tasks (HCS excluded).';
      taskList = taskList.filter(t => t.code !== 'HCS');
    }
  }
  return (
    <Card className="p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.accent} text-white flex items-center justify-center shadow-sm`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          {papers.length > 0 && (
            <Badge variant="outline" className="font-semibold text-xs">
              {papers.length} {papers.length === 1 ? 'test' : 'tests'}
            </Badge>
          )}
          {entry.latest?.headline != null ? (
            <button type="button" onClick={() => onReport(entry.latest!.id)} className="text-right">
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">Last score</span>
              <span className="text-lg font-extrabold tabular-nums text-foreground">{entry.latest.headline}</span>
            </button>
          ) : entry.live ? (
            <Badge variant="indigo">In progress</Badge>
          ) : null}
        </div>
      </div>
      <div className="space-y-1 flex-1">
        <h3 className="font-display text-base font-bold text-foreground">
          {isCore ? `${entry.title} (Core)` : entry.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {taskList.map(t => (
          <Badge key={t.code} variant="outline" className={`font-mono text-xs ${t.available === 0 ? 'opacity-40 line-through' : ''}`}>
            {t.code}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatMinutes(entry.estimatedMinutes)}</span>
        <span>
          {entry.availableItems} items · {entry.cost.credits} sub-tests
          {entry.cost.gradings ? ` · ${entry.cost.gradings} gradings` : ''}
        </span>
      </div>
      <Button onClick={onOpen} disabled={!entry.available && !entry.live} variant={entry.live ? 'default' : 'outline'} className="w-full gap-1.5 font-bold">
        {entry.live ? 'Resume' : entry.available ? 'Start' : 'Not available yet'} {entry.available || entry.live ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
    </Card>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Award, CheckCircle2, Circle, CircleDot, Play, RefreshCw, XCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ReadingMockSession } from '@/lib/types';
import { limitLabel } from '@/lib/subscriptions';
import {
  FULL_MOCK_SECTIONS,
  FullMockSectionState,
  FullMockSession,
  FullMockSkill,
  fullMocksLeft,
  sectionLabel,
} from '@/lib/fullMock';
import { ListeningMockRunner, ListeningSession } from '@/components/practice/ListeningMockPanel';
import { SpeakingMockRunner, SpeakingSession } from '@/components/practice/SpeakingMockPanel';
import WritingMockPanel, { WritingMockSession } from '@/components/practice/WritingMockPanel';
import ReadingMockPanel from '@/components/reading/ReadingMockPanel';

interface ActiveSection {
  skill: FullMockSkill;
  paper: unknown;
}

/**
 * The IELTS full mock: Listening, Reading, Writing and Speaking in the order of
 * the test, each run by its own section mock, with the overall band at the end.
 * The server keeps where the learner is, so leaving and coming back resumes
 * the section they were on.
 */
export default function FullMockPanel({ header }: { header: React.ReactNode }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useApp();
  const [full, setFull] = useState<FullMockSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<ActiveSection | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Reads where the test stands; once all four sections are done, finishes it.
  const refresh = useCallback(
    async (id: string) => {
      try {
        let next = (await api.get<{ session: FullMockSession }>(`/full-mocks/${id}`)).session;
        if (next.status === 'in_progress' && !next.stage) {
          next = (await api.post<{ session: FullMockSession }>(`/full-mocks/${id}/finish`, {})).session;
          void refreshUser();
        }
        // Each finished section has its own score report.
        void queryClient.invalidateQueries({ queryKey: queryKeys.mockAttempts() });
        setFull(next);
      } catch (err) {
        toast.error('Could not update your full mock', errorMessage(err));
      }
    },
    [queryClient, refreshUser, toast],
  );

  // The learner's open full mock, finished first if its last section was
  // completed somewhere else (another tab, or the section's own page).
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ session: FullMockSession }>('/full-mocks/current')
      .then(async data => {
        if (cancelled) return;
        if (data.session.stage) setFull(data.session);
        else await refresh(data.session.id);
      })
      .catch(err => {
        if (!cancelled && !(err instanceof ApiError && err.status === 404)) {
          toast.error('Could not load your full mock', errorMessage(err));
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setBusy(true);
    try {
      const data = await api.post<{ session: FullMockSession }>('/full-mocks', {});
      setFull(data.session);
      void refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('No full mock tests left', errorMessage(err));
      } else {
        toast.error('Could not start the full mock', errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const openSection = async (skill: FullMockSkill) => {
    if (!full) return;
    setBusy(true);
    try {
      const data = await api.post<{ fullMock: FullMockSession; session: unknown }>(
        `/full-mocks/${full.id}/sections/${skill}`,
        {},
      );
      setFull(data.fullMock);
      setActive({ skill, paper: data.session });
    } catch (err) {
      toast.error(`Could not open the ${sectionLabel(skill)} section`, errorMessage(err));
      void refresh(full.id);
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!full) return;
    setBusy(true);
    try {
      await api.post(`/full-mocks/${full.id}/abandon`, {});
      setFull(null);
      setConfirmEnd(false);
      toast.info('Full mock ended', 'The sections you finished are in your score reports.');
    } catch (err) {
      toast.error('Could not end the full mock', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const backToLobby = () => {
    setActive(null);
    if (full) void refresh(full.id);
  };

  if (active && full) {
    const index = FULL_MOCK_SECTIONS.findIndex(section => section.skill === active.skill);
    return (
      <div className="w-full">
        <div className="px-3 sm:px-6 lg:px-8 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          IELTS full mock · Section {index + 1} of 4 · {sectionLabel(active.skill)}
        </div>
        {active.skill === 'listening' && (
          <ListeningMockRunner
            key={full.id + active.skill}
            session={active.paper as ListeningSession}
            title="Full mock: Listening"
            onDone={backToLobby}
            onClosed={backToLobby}
            onLeave={backToLobby}
          />
        )}
        {active.skill === 'reading' && (
          <ReadingMockPanel
            key={full.id + active.skill}
            section={{ session: active.paper as ReadingMockSession, onSubmitted: backToLobby, onLeave: backToLobby }}
          />
        )}
        {active.skill === 'writing' && (
          <WritingMockPanel
            key={full.id + active.skill}
            section={{ session: active.paper as WritingMockSession, onSubmitted: backToLobby, onLeave: backToLobby }}
          />
        )}
        {active.skill === 'speaking' && (
          <SpeakingMockRunner
            key={full.id + active.skill}
            session={active.paper as SpeakingSession}
            onDone={backToLobby}
            onClosed={backToLobby}
            onLeave={backToLobby}
          />
        )}
      </div>
    );
  }

  const left = fullMocksLeft(user?.subscription);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
      {header}
      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading your full mock…</Card>
      ) : full?.status === 'completed' ? (
        <FullMockResult
          session={full}
          onReports={() => navigate('/mocks?tab=reports')}
          onDone={() => setFull(null)}
        />
      ) : full ? (
        <div className="w-full flex justify-center">
          <Card className="w-full max-w-2xl p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <CardTitle className="text-xl">IELTS Full Mock Test</CardTitle>
              <CardDescription>
                Take the sections in order. Your place is kept, so you can stop between sections and come back.
              </CardDescription>
            </div>
            <ol className="space-y-2">
              {full.sections.map((section, i) => (
                <SectionRow key={section.skill} index={i} section={section} current={full.stage === section.skill} />
              ))}
            </ol>
            {full.stage && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <p className="text-sm text-foreground">
                  {FULL_MOCK_SECTIONS.find(section => section.skill === full.stage)?.about}{' '}
                  {full.stage === 'listening' && 'Use headphones.'}
                  {full.stage === 'speaking' && 'You will need a microphone and a quiet room.'}
                </p>
                <Button onClick={() => void openSection(full.stage!)} disabled={busy} className="font-bold gap-2">
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  {full.sections.find(section => section.skill === full.stage)?.status === 'in_progress'
                    ? `Continue ${sectionLabel(full.stage)}`
                    : `Start ${sectionLabel(full.stage)}`}
                </Button>
              </div>
            )}
            <div className="border-t border-border pt-3 text-xs text-muted-foreground">
              {confirmEnd ? (
                <span className="flex flex-wrap items-center gap-2">
                  End this full mock without an overall band? It is not returned to your allowance.
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => void end()}>
                    End it
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmEnd(false)}>
                    Keep going
                  </Button>
                </span>
              ) : (
                <button type="button" className="underline hover:text-foreground" onClick={() => setConfirmEnd(true)}>
                  End this full mock
                </button>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <Card className="w-full max-w-2xl p-6 sm:p-8 space-y-5 text-center">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="indigo">IELTS</Badge>
              <Badge variant="default">4 skills · overall band</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl sm:text-2xl">IELTS Full Mock Test</CardTitle>
              <CardDescription className="max-w-lg mx-auto">
                Listening, Reading and Writing in one sitting, as in the test, then Speaking. Your overall band is the
                mean of the four, rounded to the nearest half band.
              </CardDescription>
            </div>
            <ol className="text-left space-y-1.5 max-w-md mx-auto">
              {FULL_MOCK_SECTIONS.map((section, i) => (
                <li key={section.skill} className="text-sm text-foreground">
                  <span className="font-bold">
                    {i + 1}. {section.label}
                  </span>{' '}
                  <span className="text-muted-foreground">· {section.timing}</span>
                </li>
              ))}
            </ol>
            <Button
              onClick={() => void start()}
              disabled={busy || left <= 0}
              className="w-full sm:w-auto sm:min-w-[240px] mx-auto font-bold gap-2 h-11 shadow-md"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>Start full mock</span>
            </Button>
            <p className="text-[11px] text-muted-foreground">
              {left > 0
                ? `Uses one of your full mock tests (${limitLabel(left, !Number.isFinite(left))} left). The sections do not use your daily sub-tests.`
                : 'You have used the full mock tests in your plan.'}{' '}
              {left <= 0 && (
                <button type="button" className="underline font-semibold" onClick={() => navigate('/subscription')}>
                  See plans
                </button>
              )}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function SectionRow({ index, section, current }: { index: number; section: FullMockSectionState; current: boolean }) {
  const meta = FULL_MOCK_SECTIONS[index];
  const status =
    section.status === 'submitted'
      ? { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, text: 'Done' }
      : section.status === 'closed'
        ? { icon: <XCircle className="w-4 h-4 text-muted-foreground" />, text: 'Closed without a band' }
        : section.status === 'in_progress'
          ? { icon: <CircleDot className="w-4 h-4 text-primary" />, text: 'In progress' }
          : { icon: <Circle className="w-4 h-4 text-muted-foreground" />, text: current ? 'Next' : 'Not started' };
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
        current ? 'border-primary/40 bg-primary/5' : 'border-border'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {status.icon}
        {index + 1}. {meta.label}
        <span className="hidden sm:inline text-xs font-normal text-muted-foreground">· {meta.timing}</span>
      </span>
      <span className="text-xs text-muted-foreground">{status.text}</span>
    </li>
  );
}

function FullMockResult({
  session,
  onReports,
  onDone,
}: {
  session: FullMockSession;
  onReports: () => void;
  onDone: () => void;
}) {
  return (
    <div className="w-full flex justify-center">
      <Card className="w-full max-w-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-amber-400" />
          <h2 className="font-display text-2xl font-bold text-foreground">Full mock result</h2>
        </div>
        <div className="text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Estimated overall band</span>
          <div className="font-display text-5xl font-black text-foreground">
            {session.overallBand != null ? session.overallBand.toFixed(1) : '—'}
          </div>
          <p className="text-xs text-muted-foreground">
            {session.overallBand != null
              ? 'The mean of your four section bands, rounded to the nearest half band. A practice estimate, not an official result.'
              : 'A section ended without a band, so there is no overall band for this test.'}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {session.sections.map(section => (
            <Card key={section.skill} className="bg-background p-4 text-center space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">{sectionLabel(section.skill)}</span>
              <div className="font-display text-2xl font-black text-foreground">
                {section.band != null ? section.band.toFixed(1) : '—'}
              </div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Each section's marked answers and feedback are in your score reports.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onDone}>
            Back to Mock Center
          </Button>
          <Button onClick={onReports}>See score reports</Button>
        </div>
      </Card>
    </div>
  );
}

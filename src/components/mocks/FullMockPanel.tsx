import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Clock,
  FileText,
  ListChecks,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isInstitutionStudent, MockPaperItem, ReadingMockSession } from '@/lib/types';
import MockPaperList from '@/components/mocks/MockPaperList';
import { limitLabel } from '@/lib/subscriptions';
import {
  FULL_MOCK_SECTIONS,
  FullMockSectionState,
  FullMockSession,
  FullMockSkill,
  fullMocksLeft,
  IELTS_FULL_MOCK_CREDITS,
  sectionLabel,
} from '@/lib/fullMock';
import { ListeningMockRunner, ListeningOutcome, ListeningResult, ListeningSession } from '@/components/practice/ListeningMockPanel';
import { SpeakingMockRunner, SpeakingOutcome, SpeakingSession } from '@/components/practice/SpeakingMockPanel';
import WritingMockPanel, { WritingMockOutcome, WritingMockSession } from '@/components/practice/WritingMockPanel';
import TestFeedback from '@/components/mocks/TestFeedback';
import ReadingMockPanel from '@/components/reading/ReadingMockPanel';
import IeltsTestReport from '@/components/mocks/ielts/IeltsTestReport';
import PreTestChecks from '@/components/mocks/PreTestChecks';
import { TestLock } from '@/lib/hooks/useTestLock';
import MockSectionsCard, { SECTION_ICONS } from '@/components/mocks/MockSectionsCard';

interface ActiveSection {
  skill: FullMockSkill;
  paper: unknown;
}

/**
 * What each section came back with, kept in the page so the end of the test
 * can show the feedback and not only the bands. A section finished before the
 * page was reloaded has none here.
 */
interface SectionResults {
  listening?: ListeningOutcome;
  writing?: WritingMockOutcome;
  speaking?: SpeakingOutcome;
}

/**
 * The IELTS full mock: Listening, Reading, Writing and Speaking in the order of
 * the test, each run by its own section mock, with the overall band at the end.
 * The server keeps where the learner is, so leaving and coming back resumes
 * the section they were on.
 */
export default function FullMockPanel() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useApp();
  const [full, setFull] = useState<FullMockSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<ActiveSection | null>(null);
  const [results, setResults] = useState<SectionResults>({});
  // A new full mock goes through the equipment checks first; a resumed one does not.
  const [checking, setChecking] = useState<{ number?: number } | null>(null);
  // The numbered Full Mock Tests: Test N is each section's Test N.
  const [tests, setTests] = useState<MockPaperItem[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const loadTests = useCallback(async () => {
    try {
      setTests((await api.get<{ tests: MockPaperItem[] }>('/full-mocks/catalog')).tests ?? []);
    } catch {
      setTests([]); // no list: the single Start button still works
    } finally {
      setTestsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!full || full.status === 'completed') void loadTests();
  }, [full, loadTests]);

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

  // Starts Full Mock Test {number}; with none, a full mock whose papers are dealt one by one.
  const start = async (number?: number) => {
    setBusy(true);
    try {
      const data = await api.post<{ session: FullMockSession }>('/full-mocks', number ? { number } : {});
      setFull(data.session);
      setChecking(null);
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
      toast.info('Full mock ended', 'The sections you finished are in your score reports.');
    } catch (err) {
      toast.error('Could not end the full mock', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const backToLobby = (outcome?: unknown) => {
    // Only a section's own result object is kept, never a closing message.
    if (active && outcome && typeof outcome === 'object') setResults(previous => ({ ...previous, [active.skill]: outcome }));
    setActive(null);
    if (full) void refresh(full.id);
  };

  if (active && full) {
    return (
      // The test's own controls (its question bar is a <nav>) must not count as leaving it.
      <div data-practice-workspace className="w-full">
        {active.skill === 'listening' && (
          <ListeningMockRunner
            key={full.id + active.skill}
            session={active.paper as ListeningSession}
            title="Full mock: Listening"
            onDone={backToLobby}
            onClosed={() => backToLobby()}
            onLeave={() => backToLobby()}
          />
        )}
        {active.skill === 'reading' && (
          <ReadingMockPanel
            key={full.id + active.skill}
            section={{ session: active.paper as ReadingMockSession, onSubmitted: () => backToLobby(), onLeave: () => backToLobby() }}
          />
        )}
        {active.skill === 'writing' && (
          <WritingMockPanel
            key={full.id + active.skill}
            section={{ session: active.paper as WritingMockSession, onSubmitted: backToLobby, onLeave: () => backToLobby() }}
          />
        )}
        {active.skill === 'speaking' && (
          <SpeakingMockRunner
            key={full.id + active.skill}
            session={active.paper as SpeakingSession}
            onDone={backToLobby}
            onClosed={() => backToLobby()}
            onLeave={() => backToLobby()}
          />
        )}
      </div>
    );
  }

  const left = fullMocksLeft(user?.subscription);

  if (checking && !full) {
    return (
      <PreTestChecks
        exam="IELTS"
        title={`IELTS Full Mock Test${checking.number ? ` ${checking.number}` : ''}`}
        skills={FULL_MOCK_SECTIONS.map(section => section.skill)}
        sections={FULL_MOCK_SECTIONS.map(section => ({ label: section.label, timing: section.timing }))}
        beginning={busy}
        onBegin={() => void start(checking.number)}
        onCancel={() => setChecking(null)}
      />
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading your full mock…</Card>
      ) : full?.status === 'completed' ? (
        <FullMockResult
          session={full}
          results={results}
          onReports={() => navigate('/mocks?tab=reports')}
          onDone={() => {
            setFull(null);
            setResults({});
          }}
          onRedo={() => {
            setResults({});
            setFull(null);
            setChecking({ number: full.number });
          }}
          busy={busy}
        />
      ) : full ? (
        <div data-practice-workspace className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center">
          {/* Between sections the test is still on: no sidebar, Save and exit is the way out. */}
          <TestLock title={`IELTS Full Mock Test${full.number ? ` ${full.number}` : ''}`} onLeave={() => navigate('/mocks')} />
          <MockSectionsCard
            title={`Full Mock Test${full.number ? ` ${full.number}` : ''}`}
            sections={full.sections}
            current={full.stage ?? null}
            busy={busy}
            onOpen={skill => void openSection(skill)}
            onLeave={() => navigate('/mocks')}
            onEnd={() => void end()}
          />
        </div>
      ) : (
        <div className="w-full flex flex-col gap-6">
          <div className="-mx-4 -mt-6 bg-gradient-to-r from-primary to-primary/75 px-4 py-8 text-primary-foreground sm:-mx-6 sm:px-8 lg:-mx-8 lg:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/80">
                  <Award className="h-4 w-4" /> IELTS · Full mock test
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">IELTS Full Mock Test</h2>
                <p className="mt-2 max-w-3xl text-sm text-white/85 sm:text-base">
                  All four skills in one sitting, as in the test. Your overall band is the mean of the four, rounded to the
                  nearest half band.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                    <Clock className="h-3.5 w-3.5" /> About 3 hours
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                    <ListChecks className="h-3.5 w-3.5" /> 4 sections · overall band
                  </span>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate('/mocks?tab=reports')}
                className="shrink-0 gap-2 border-0 bg-white/15 font-semibold text-white hover:bg-white/25"
              >
                <FileText className="h-4 w-4" /> Score reports
              </Button>
            </div>
          </div>
          <section className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <ol className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-4">
              {FULL_MOCK_SECTIONS.map((section, i) => {
                const Icon = SECTION_ICONS[section.skill];
                return (
                  <li key={section.skill} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-foreground">
                        {i + 1}. {section.label}
                      </span>
                      <span className="block text-xs leading-snug text-muted-foreground first-letter:uppercase">{section.timing}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {user?.subscription?.fullMocksFromPool
                  ? `Uses ${IELTS_FULL_MOCK_CREDITS} AI credits from your monthly pool. The sections do not use your daily sub-tests.`
                  : left > 0
                  ? `Uses one of your full mock tests (${limitLabel(left, !Number.isFinite(left))} left). The sections do not use your daily sub-tests.`
                  : 'You have used the full mock tests in your plan.'}{' '}
                {left <= 0 && !isInstitutionStudent(user) && (
                  <button type="button" className="font-semibold underline" onClick={() => navigate('/subscription')}>
                    See plans
                  </button>
                )}
              </p>
              {/* With numbered tests the list below starts one; the button is the fallback. */}
              {!testsLoading && tests.length === 0 && (
                <Button onClick={() => setChecking({})} disabled={busy || left <= 0} className="h-10 shrink-0 gap-2 font-bold">
                  {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                  Start full mock
                </Button>
              )}
            </div>
          </section>
          {(testsLoading || tests.length > 0) && (
            <section className="w-full space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Numbered tests</h2>
              <MockPaperList
                variant="page"
                papers={tests}
                isLoading={testsLoading}
                exam="IELTS"
                section="full"
                onStart={test => setChecking({ number: test.number })}
                onResume={test => void start(test.number)}
                onRetake={test => setChecking({ number: test.number })}
                onReview={test => {
                  if (test.attemptId) navigate(`/mocks?review=${test.attemptId}`);
                }}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function FullMockResult({
  session,
  results,
  onReports,
  onDone,
  onRedo,
  busy,
}: {
  session: FullMockSession;
  results: SectionResults;
  onReports: () => void;
  onDone: () => void;
  // A new full mock goes through the normal start, so the plan's allowance applies.
  onRedo: () => void;
  busy: boolean;
}) {
  if (session.attemptId) {
    return (
      <IeltsTestReport
        attemptId={session.attemptId}
        embedded
        onBack={onDone}
        onRedo={busy ? undefined : onRedo}
        actions={<Button variant="outline" onClick={onReports}>See score reports</Button>}
      />
    );
  }
  // The sections whose feedback came back while this page was open, in the order of the test.
  const feedback = (['listening', 'writing', 'speaking'] as const).filter(skill => results[skill]);
  return (
    <div className="w-full flex flex-col items-center gap-5">
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
          {feedback.length > 0
            ? 'The feedback for each section is below.'
            : 'Each section has its own score report.'}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onDone}>
            Back to Mock Center
          </Button>
          <Button variant="outline" onClick={onReports}>See score reports</Button>
          <Button onClick={onRedo} disabled={busy} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Redo
          </Button>
        </div>
      </Card>

      {feedback.length > 0 && (
        <Tabs defaultValue={feedback[0]} className="w-full max-w-4xl space-y-4">
          <TabsList className="min-h-0 justify-start">
            {feedback.map(skill => (
              <TabsTrigger key={skill} value={skill}>
                {sectionLabel(skill)} feedback
              </TabsTrigger>
            ))}
          </TabsList>
          {results.listening && (
            <TabsContent value="listening">
              <ListeningResult outcome={results.listening} embedded />
            </TabsContent>
          )}
          {results.writing && (
            <TabsContent value="writing" className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-primary">Task 1</h3>
                <TestFeedback evaluation={results.writing.task1Evaluation} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-primary">Task 2</h3>
                <TestFeedback evaluation={results.writing.task2Evaluation} />
              </div>
            </TabsContent>
          )}
          {results.speaking && (
            <TabsContent value="speaking">
              <TestFeedback evaluation={results.speaking.evaluation} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

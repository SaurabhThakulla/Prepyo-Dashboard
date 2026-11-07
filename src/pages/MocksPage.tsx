import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { queryKeys } from '@/lib/queryKeys';
import { Award, BarChart3, FileText } from 'lucide-react';
import { MocksPageSkeleton } from '@/components/layout/PageSkeleton';
import { Card } from '@/components/ui/card';
import { EXAM_LABELS, Mock, MockAttempt } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useMocks, useMockAttempts } from '@/lib/hooks/useResources';
import { useMockExam } from '@/lib/hooks/useMockExam';
import MockStartPanel from '@/components/mocks/MockStartPanel';
import ScoreReportList, { PTE_MOCK_ATTEMPT_IDS } from '@/components/mocks/ScoreReportList';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';
import { READING_MOCK_HREF } from '@/components/layout/sidebar/navigation';

const MockExamRunner = lazy(() => import('@/components/mocks/MockExamRunner'));
const ScoreReport = lazy(() => import('@/components/mocks/ScoreReport'));
const FullMockPanel = lazy(() => import('@/components/mocks/FullMockPanel'));
const IeltsMockCenter = lazy(() => import('@/components/mocks/IeltsMockCenter'));
const PteMockCenter = lazy(() => import('@/components/pteMock/PteMockCenter'));
const PteMockHistory = lazy(() => import('@/components/pteMock/PteMockHistory'));

export default function MocksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeExam } = useApp();
  const toast = useToast();

  const activeTab = searchParams.get('tab') === 'reports' ? 'reports' : 'catalog';

  const [reviewAttempt, setReviewAttempt] = useState<MockAttempt | null>(null);

  const mocksQuery = useMocks(activeExam);
  const attemptsQuery = useMockAttempts();
  const queryClient = useQueryClient();

  const mocks = mocksQuery.data?.mocks ?? [];
  const pastAttempts = attemptsQuery.data?.attempts ?? [];
  const loading = mocksQuery.isPending || attemptsQuery.isPending;
  // PTE mock tests have their own history (PteMockHistory), with the full
  // report behind each row; their attempt rows are not listed a second time.
  const otherAttempts = pastAttempts.filter(a => !PTE_MOCK_ATTEMPT_IDS.has(a.mockId));
  const loadError = mocksQuery.error ?? attemptsQuery.error;

  const addAttempt = useCallback(
    (attempt: MockAttempt) => {
      queryClient.setQueryData(
        queryKeys.mockAttempts(),
        (previous: { attempts: MockAttempt[] } | undefined) => ({
          attempts: [attempt, ...(previous?.attempts ?? [])],
        }),
      );
    },
    [queryClient],
  );

  const exam = useMockExam(addAttempt);

  const startMock = useCallback(
    (mock: Mock) => (mock.isGenerated ? navigate(READING_MOCK_HREF) : exam.start(mock)),
    [exam, navigate],
  );

  const startableMock = mocks.find(mock => !mock.isDiagnostic) ?? mocks[0] ?? null;
  const isStartingMock = startableMock != null && exam.startingMockId === startableMock.id;

  useEffect(() => {
    if (loadError) toast.error('Could not load mock exams', errorMessage(loadError));
  }, [loadError]);

  const startParam = searchParams.get('start');
  useEffect(() => {
    if (!startParam || exam.activeMock || loading) return;
    const target = mocks.find(mock => mock.id === startParam);
    if (target?.isGenerated) {
      navigate(READING_MOCK_HREF, { replace: true });
      return;
    }
    if (target) {
      exam.start(target);
      navigate('/mocks', { replace: true });
      return;
    }
    // A link naming a paper this exam does not have would otherwise drop the
    // learner on the catalogue with no idea why.
    toast.warning('That mock is not available', `No ${activeExam} mock matches "${startParam}".`);
    navigate('/mocks', { replace: true });
  }, [startParam, exam, loading, mocks, navigate, toast, activeExam]);

  const reviewParam = searchParams.get('review');
  useEffect(() => {
    if (!reviewParam || reviewAttempt) return;
    const found = pastAttempts.find(a => a.id === reviewParam || a.mockId === reviewParam);
    if (found) {
      setReviewAttempt(found);
    } else {
      api.get<{ attempt: MockAttempt }>(`/mocks/attempts/${reviewParam}`)
        .then(data => {
          if (data?.attempt) setReviewAttempt(data.attempt);
        })
        .catch(err => {
          toast.error('Could not open that result', errorMessage(err));
          navigate('/mocks', { replace: true });
        });
    }
  }, [reviewParam, pastAttempts, reviewAttempt]);

  const leaveReport = () => {
    exam.exit();
    setReviewAttempt(null);
    // A report opened by link (?review=) would open again from the link.
    if (reviewParam) navigate('/mocks', { replace: true });
  };

  if (exam.outcome) {
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <ScoreReport
          attempt={exam.outcome.attempt}
          outcome={exam.outcome}
          onBack={leaveReport}
          onRedo={exam.activeMock ? () => void exam.start(exam.activeMock!) : undefined}
        />
      </Suspense>
    );
  }
  if (reviewAttempt) {
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <ScoreReport attempt={reviewAttempt} onBack={leaveReport} />
      </Suspense>
    );
  }

  // ── 3. Live exam ──
  if (exam.activeMock) {
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <MockExamRunner
          mock={exam.activeMock}
          questions={exam.questions}
          currentIndex={exam.currentIndex}
          currentQuestion={exam.currentQuestion}
          secondsLeft={exam.secondsLeft}
          answers={exam.answers}
          flaggedIds={exam.flaggedIds}
          isSubmitting={exam.isSubmitting}
          onAnswer={exam.answerQuestion}
          onToggleFlag={exam.toggleFlag}
          onGoToIndex={exam.goToIndex}
          onPrevious={exam.goToPrevious}
          onNext={exam.goToNext}
          onFinish={exam.finish}
          onExit={exam.exit}
        />
      </Suspense>
    );
  }

  const tabs = (
        <div role="tablist" aria-label="Mock exams" className="flex w-full sm:w-auto items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm shrink-0">
          <TabButton
            isActive={activeTab === 'catalog'}
            onClick={() => navigate('/mocks?tab=catalog')}
            icon={<Award className="w-3.5 h-3.5" />}
            label="Exam Catalog"
          />
          <TabButton
            isActive={activeTab === 'reports'}
            onClick={() => navigate('/mocks?tab=reports')}
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Score Reports"
            count={pastAttempts.length}
          />
        </div>
  );

  const header = (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{EXAM_LABELS[activeExam]} Mock Exam Center</h1>
          <p className="text-xs text-muted-foreground">Timed tests under real exam conditions.</p>
        </div>
        {tabs}
      </div>
  );

  // IELTS has a four-skill full mock with an overall band, plus sectional mock
  // tests. If view=full, run the full mock; otherwise show the IELTS Mock Test Centre.
  if (activeExam === 'IELTS' && activeTab === 'catalog') {
    if (searchParams.get('view') === 'full') {
      return (
        <Suspense fallback={<AppPageSkeleton />}>
          <FullMockPanel header={header} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <IeltsMockCenter header={header} />
      </Suspense>
    );
  }

  // PTE runs every mock — the full test and the four sectional tests — on its
  // own test player, which reports on the 10-90 scale.
  if (activeExam === 'PTE' && activeTab === 'catalog') {
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <PteMockCenter tabs={tabs} />
      </Suspense>
    );
  }

  return (
    <div className="w-full pb-10">
      {/* Score reports lead with a banner edge to edge, as the PTE catalogue does. */}
      {activeTab === 'reports' && (
        <div className="relative flex min-h-48 items-center overflow-hidden bg-gradient-to-r from-primary to-indigo-600 px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <div className="relative flex w-full items-center gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex">
              <BarChart3 className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <h1 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">My mock results</h1>
              <p className="text-xs text-white/85 sm:text-sm">Every {EXAM_LABELS[activeExam]} mock you have finished, each opening its full score report.</p>
            </div>
          </div>
        </div>
      )}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {activeTab === 'reports' || activeExam === 'PTE' ? <div className="flex justify-end">{tabs}</div> : header}

      {loading ? (
        <MocksPageSkeleton bare />
      ) : activeTab === 'reports' ? (
        <div className="space-y-6">
          {activeExam === 'PTE' && (
            <section className="space-y-2">
              <h2 className="font-display text-base font-bold text-foreground">PTE mock tests</h2>
              <Suspense fallback={<MocksPageSkeleton bare />}>
                <PteMockHistory />
              </Suspense>
            </section>
          )}
          {(activeExam !== 'PTE' || otherAttempts.length > 0) && (
            <section className="space-y-2">
              {activeExam === 'PTE' && (
                <h2 className="font-display text-base font-bold text-foreground">Other mock results</h2>
              )}
              <ScoreReportList
                attempts={otherAttempts}
                mocks={mocks}
                onReview={setReviewAttempt}
                onBrowseCatalog={() => navigate('/mocks?tab=catalog')}
              />
            </section>
          )}
        </div>
      ) : (
        <MockStartPanel
          mock={startableMock}
          exam={activeExam}
          isStarting={isStartingMock}
          onStart={startMock}
        />
      )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function TabButton({ isActive, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all [-webkit-tap-highlight-color:transparent] ${
        isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted'
      }`}
    >
      <span className={isActive ? '' : 'text-primary'}>{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
      {count != null && count > 0 && (
        <span
          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 ${
            isActive ? 'bg-white/25 text-primary-foreground' : 'bg-primary/10 text-primary'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}


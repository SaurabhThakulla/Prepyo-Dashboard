import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { queryKeys } from '@/lib/queryKeys';
import { Award, RefreshCw, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Mock, MockAttempt } from '@/lib/types';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useMocks, useMockAttempts } from '@/lib/hooks/useResources';
import { useMockExam } from '@/lib/hooks/useMockExam';
import { useReadingMock } from '@/lib/hooks/useReading';
import MockStartPanel from '@/components/mocks/MockStartPanel';
import ScoreReportList from '@/components/mocks/ScoreReportList';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';

const MockExamRunner = lazy(() => import('@/components/mocks/MockExamRunner'));
const ReadingMockRunner = lazy(() => import('@/components/reading/ReadingMockRunner'));
const ScoreReport = lazy(() => import('@/components/mocks/ScoreReport'));

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
  const readingMock = useReadingMock(activeExam, addAttempt);

  const startMock = useCallback(
    (mock: Mock) => (mock.isGenerated ? void readingMock.start() : exam.start(mock)),
    [exam, readingMock],
  );

  const startableMock = mocks.find(mock => !mock.isDiagnostic) ?? mocks[0] ?? null;
  const isStartingMock =
    readingMock.starting || (startableMock != null && exam.startingMockId === startableMock.id);

  useEffect(() => {
    if (loadError) toast.error('Could not load mock exams', errorMessage(loadError));
  }, [loadError]);

  const startParam = searchParams.get('start');
  useEffect(() => {
    if (!startParam || exam.activeMock || loading) return;
    const target = mocks.find(mock => mock.id === startParam);
    if (target) {
      startMock(target);
      navigate('/mocks', { replace: true });
    }
  }, [startParam, exam, loading, mocks, navigate, startMock]);

  const leaveReport = () => {
    exam.exit();
    setReviewAttempt(null);
  };

  if (readingMock.outcome) {
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <ScoreReport
          attempt={readingMock.outcome.attempt}
          outcome={readingMock.outcome}
          onBack={readingMock.exit}
        />
      </Suspense>
    );
  }
  if (exam.outcome) {
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <ScoreReport attempt={exam.outcome.attempt} outcome={exam.outcome} onBack={leaveReport} />
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
  if (readingMock.session) {
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <ReadingMockRunner session={readingMock.session} mock={readingMock} />
      </Suspense>
    );
  }
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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{activeExam} Mock Exam Center</h1>
          <p className="text-xs text-muted-foreground">Timed simulations graded on the server.</p>
        </div>

        <div className="flex items-center bg-card p-1 rounded-xl border border-border shrink-0">
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
      </div>

      {loading ? (
        <Card className="text-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        </Card>
      ) : activeTab === 'reports' ? (
        <ScoreReportList
          attempts={pastAttempts}
          mocks={mocks}
          onReview={setReviewAttempt}
          onBrowseCatalog={() => navigate('/mocks?tab=catalog')}
        />
      ) : (
        <MockStartPanel
          mock={startableMock}
          exam={activeExam}
          isStarting={isStartingMock}
          onStart={startMock}
        />
      )}
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
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
        isActive ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count != null && count > 0 && (
        <span className="text-[10px] bg-primary-foreground/20 px-1.5 rounded-full font-mono">{count}</span>
      )}
    </button>
  );
}


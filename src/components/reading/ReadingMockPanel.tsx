import React, { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { queryKeys } from '@/lib/queryKeys';
import { useReadingMock } from '@/lib/hooks/useReading';
import { ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';
import { READING_PRACTICE_HREF } from '@/components/layout/sidebar/navigation';
import ReadingMockRunner from '@/components/reading/ReadingMockRunner';
import { isPremiumUser } from '@/lib/types';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import PreTestBlurOverlay from '@/components/practice/PreTestBlurOverlay';

/** Mirrors billing.SectionMockSubTests on the server, which is what enforces it. */
const SECTION_MOCK_SUB_TESTS = 5;

const ScoreReport = lazy(() => import('@/components/mocks/ScoreReport'));

export default function ReadingMockPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, activeExam, refreshUser } = useApp();

  if (!isPremiumUser(user)) {
    return <PracticeMockPaywall skill="reading" exam={activeExam} />;
  }

  const mock = useReadingMock(activeExam, () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.mockAttempts() });
  });
  const [starting, setStarting] = useState(false);

  const subTestsRemaining = Math.max(
    0,
    (user?.subscription?.dailySubTestsLimit ?? 0) - (user?.subscription?.dailySubTestsUsed ?? 0),
  );

  // Starting costs sub-tests, so it waits for the learner to press Start rather
  // than firing the moment the page opens.
  const begin = async () => {
    setStarting(true);
    const started = await mock.start();
    setStarting(false);
    if (started) void refreshUser();
  };

  const leave = () => {
    mock.exit();
    navigate(READING_PRACTICE_HREF);
  };

  if (mock.outcome) {
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <ScoreReport attempt={mock.outcome.attempt} outcome={mock.outcome} onBack={leave} />
      </Suspense>
    );
  }

  if (mock.session) {
    return <ReadingMockRunner session={mock.session} mock={{ ...mock, exit: leave }} />;
  }

  if (mock.starting || starting) return <ReadingPracticeSkeleton />;

  return (
    <div className="relative w-full min-h-[calc(100dvh-4rem)] bg-background">
      <PreTestBlurOverlay
        title={`${activeExam} Reading mock test`}
        instructions={`A full, timed reading section. It uses ${SECTION_MOCK_SUB_TESTS} of your daily practice sub-tests. A paper you already started carries on at no extra cost.`}
        subTestsRemaining={subTestsRemaining}
        credits={SECTION_MOCK_SUB_TESTS}
        startLabel="Start mock test"
        isStarting={starting}
        onStart={() => void begin()}
      />
    </div>
  );
}

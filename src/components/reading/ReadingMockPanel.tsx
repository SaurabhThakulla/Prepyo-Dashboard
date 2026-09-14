import React, { lazy, Suspense, useEffect, useRef } from 'react';
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

const ScoreReport = lazy(() => import('@/components/mocks/ScoreReport'));

export default function ReadingMockPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, activeExam } = useApp();

  if (!isPremiumUser(user)) {
    return <PracticeMockPaywall skill="reading" exam={activeExam} />;
  }

  const mock = useReadingMock(activeExam, () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.mockAttempts() });
  });
  const { start } = mock;

  const mounted = useRef(false);
  const requested = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void start().then(started => {
      if (!started && mounted.current) navigate(READING_PRACTICE_HREF, { replace: true });
    });
  }, [start, navigate]);

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

  return <ReadingPracticeSkeleton />;
}

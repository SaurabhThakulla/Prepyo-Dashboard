import { subTestsLeft } from '@/lib/subscriptions';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { queryKeys } from '@/lib/queryKeys';
import { useReadingMock } from '@/lib/hooks/useReading';
import { ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';
import { READING_PRACTICE_HREF } from '@/components/layout/sidebar/navigation';
import ReadingMockRunner from '@/components/reading/ReadingMockRunner';
import { isPremiumUser, ReadingMockSession } from '@/lib/types';
import { FullMockSection } from '@/lib/fullMock';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import SectionMockIntro from '@/components/mocks/SectionMockIntro';

/** Mirrors billing.SectionMockSubTests on the server, which is what enforces it. */
const SECTION_MOCK_SUB_TESTS = 5;

const ScoreReport = lazy(() => import('@/components/mocks/ScoreReport'));

export default function ReadingMockPanel({ section }: { section?: FullMockSection<ReadingMockSession> } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, activeExam, refreshUser } = useApp();

  if (!section && !isPremiumUser(user)) {
    return <PracticeMockPaywall skill="reading" exam={activeExam} />;
  }

  const mock = useReadingMock(activeExam, () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.mockAttempts() });
  });
  const [starting, setStarting] = useState(false);

  // Inside a full mock the paper has already been dealt, and the results come
  // at the end of the test rather than after each section.
  const dealt = section?.session;
  const { open } = mock;
  useEffect(() => {
    if (dealt) open(dealt);
  }, [dealt, open]);
  const sectionOver = Boolean(section && (mock.outcome || mock.closed));
  useEffect(() => {
    if (sectionOver) section?.onSubmitted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionOver]);

  const subTestsRemaining = subTestsLeft(user?.subscription);

  // Starting costs sub-tests, so it waits for the learner to press Start rather
  // than firing the moment the page opens.
  const begin = async (chosen?: string) => {
    setStarting(true);
    const paperParam = chosen ?? (searchParams.get('paper') || undefined);
    const started = await mock.start(paperParam);
    setStarting(false);
    if (started) void refreshUser();
  };

  const leave = () => {
    mock.exit();
    if (section) section.onLeave();
    else navigate(READING_PRACTICE_HREF);
  };

  if (section && !mock.session) return null;

  if (mock.outcome) {
    // Inside another test the section hands back (above) instead of showing its own report.
    if (section) return null;
    return (
      <Suspense fallback={<AppPageSkeleton />}>
        <ScoreReport
          attempt={mock.outcome.attempt}
          outcome={mock.outcome}
          onBack={leave}
          onRedo={section ? undefined : () => { mock.exit(); void begin(); }}
        />
      </Suspense>
    );
  }

  if (mock.session) {
    return <ReadingMockRunner session={mock.session} mock={{ ...mock, exit: leave }} />;
  }

  if (mock.starting || starting) return <ReadingPracticeSkeleton />;

  return (
    <SectionMockIntro
      exam={activeExam}
      skill="reading"
      title="Reading Sectional Test"
      description="A full, timed reading section: three passages and forty questions, marked on the server."
      duration="60 min"
      items="40 questions"
      parts={[
        { name: 'Passage 1', detail: '13–14 questions' },
        { name: 'Passage 2', detail: '13–14 questions' },
        { name: 'Passage 3', detail: '13–14 questions' },
      ]}
      rules={[
        'One clock of 60 minutes covers all three passages.',
        'Your answers are saved as you go.',
        'When the time runs out, what you have answered is marked.',
      ]}
      equipment="This test has no audio. You only need a keyboard."
      credits={SECTION_MOCK_SUB_TESTS}
      subTestsRemaining={subTestsRemaining}
      isStarting={starting}
      onStart={paperId => void begin(paperId)}
    />
  );
}

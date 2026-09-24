import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import PteMockIntro from '@/components/pteMock/PteMockIntro';
import PteTestRunner from '@/components/pteMock/PteTestRunner';
import PteScoreReport, { PteScoringProgress } from '@/components/pteMock/PteScoreReport';
import { usePteMockCatalog, usePteMockReport } from '@/lib/hooks/usePteMock';
import { TestMicrophone } from '@/lib/pteMock/audio';
import { isPteMockKind, pteMockHref, pteReportHref } from '@/lib/pteMock/catalog';
import { PteSession } from '@/lib/pteMock/types';
import { isPremiumUser } from '@/lib/types';

/**
 * /mocks/pte/:kind — one kind of PTE mock test: the check before it, then the
 * test. /mocks/pte/report/:sessionId — a test's score report.
 *
 * A page decides what to show. The test itself is PteTestRunner; the timing
 * and state of a paper are the server's.
 */
export default function PteMockPage() {
  const { kind, sessionId } = useParams();
  const { activeExam } = useApp();

  if (activeExam !== 'PTE') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16">
        <Card className="p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
          <h1 className="font-display text-lg font-bold text-foreground">PTE mock tests are for PTE learners</h1>
          <p className="text-sm text-muted-foreground">Switch your exam to PTE to take one, or open the IELTS mock centre.</p>
          <Button asChild variant="outline"><Link to="/mocks">Mock tests</Link></Button>
        </Card>
      </div>
    );
  }
  if (sessionId) return <ReportScreen sessionId={sessionId} />;
  if (!isPteMockKind(kind)) return <Navigate to="/mocks" replace />;
  return <TestScreen key={kind} kind={kind} />;
}

function TestScreen({ kind }: { kind: Parameters<typeof pteMockHref>[0] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useApp();
  const catalog = usePteMockCatalog();
  const [session, setSession] = useState<PteSession | null>(null);
  const [mic, setMic] = useState<TestMicrophone | null>(null);
  const [starting, setStarting] = useState(false);

  // The microphone belongs to the test; it is released when the page goes.
  useEffect(() => () => mic?.close(), [mic]);

  useEffect(() => {
    if (catalog.error) toast.error('Could not load this test', errorMessage(catalog.error));
  }, [catalog.error]);

  const start = async (checkedMic: TestMicrophone | null, paperId?: string) => {
    setStarting(true);
    try {
      const payload: { kind: Parameters<typeof pteMockHref>[0]; paperId?: string } = { kind };
      if (paperId) payload.paperId = paperId;
      const data = await api.post<{ session: PteSession }>('/pte/mocks', payload);
      setMic(checkedMic);
      if (data.session.status !== 'in_progress') {
        navigate(pteReportHref(data.session.id), { replace: true });
        return;
      }
      setSession(data.session);
      void refreshUser();
      void queryClient.invalidateQueries({ queryKey: ['pte-mocks'] });
      void queryClient.invalidateQueries({ queryKey: ['mock-papers'] });
    } catch (err) {
      checkedMic?.close();
      if (err instanceof ApiError && err.isLimitReached) toast.warning('Not enough left on your plan', errorMessage(err));
      else toast.error('Could not start the test', errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const abandon = async (id: string) => {
    try {
      await api.post(`/pte/mocks/${id}/abandon`);
      await queryClient.invalidateQueries({ queryKey: ['pte-mocks'] });
      void queryClient.invalidateQueries({ queryKey: ['mock-papers'] });
      toast.success('Attempt discarded', 'You can start a fresh test.');
    } catch (err) {
      toast.error('Could not discard the attempt', errorMessage(err));
    }
  };

  const finished = useCallback(
    (id: string) => {
      mic?.close();
      void queryClient.invalidateQueries({ queryKey: ['pte-mocks'] });
      void queryClient.invalidateQueries({ queryKey: ['mock-papers'] });
      void queryClient.invalidateQueries({ queryKey: ['mocks', 'attempts'] });
      navigate(pteReportHref(id), { replace: true });
    },
    [mic, navigate, queryClient],
  );

  const leave = useCallback(() => {
    mic?.close();
    void queryClient.invalidateQueries({ queryKey: ['pte-mocks'] });
    void queryClient.invalidateQueries({ queryKey: ['mock-papers'] });
    navigate('/mocks');
  }, [mic, navigate, queryClient]);

  if (session) return <PteTestRunner initial={session} mic={mic} onFinished={finished} onLeave={leave} />;

  const entry = catalog.data?.mocks.find(m => m.kind === kind);
  if (catalog.isPending) return <AppPageSkeleton />;
  if (!entry) return <Navigate to="/mocks" replace />;
  // Sectional tests are a paid feature, as the IELTS section mocks are; the
  // full test is governed by the plan's own allowance on the server.
  if (kind !== 'full' && !entry.live && !isPremiumUser(user)) {
    return <PracticeMockPaywall skill={entry.skills[0]} exam="PTE" />;
  }
  return (
    <PteMockIntro
      entry={entry}
      serverTranscription={catalog.data?.serverTranscription ?? false}
      starting={starting}
      onStart={(checked, paperId) => void start(checked, paperId)}
      onAbandon={entry.live ? () => void abandon(entry.live!.id) : undefined}
    />
  );
}

function ReportScreen({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshUser } = useApp();
  const { data, isPending, error } = usePteMockReport(sessionId);
  const status = data?.report.status;

  // Finishing a test awards XP and may extend the streak; show it.
  useEffect(() => {
    if (status === 'completed') void refreshUser();
  }, [status]);

  useEffect(() => {
    if (error) toast.error('Could not load this report', errorMessage(error));
  }, [error]);

  if (isPending) return <AppPageSkeleton />;
  const report = data?.report;
  if (!report) return <Navigate to="/mocks?tab=reports" replace />;
  if (report.status === 'scoring') return <PteScoringProgress report={report} onBack={() => navigate('/mocks')} />;
  return (
    <PteScoreReport
      report={report}
      onBack={() => navigate('/mocks')}
      onRetake={() => navigate(pteMockHref(report.kind))}
    />
  );
}

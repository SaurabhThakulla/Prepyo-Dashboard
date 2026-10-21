import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, LogOut, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useRefreshMockPapers } from '@/lib/hooks/useMockPapers';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Evaluation, IELTS_MODULE_LABEL, IELTSModule, MockAttempt, Question, isPremiumUser } from '@/lib/types';
import { subTestsLeft } from '@/lib/subscriptions';
import { writingWordCount, writingWordTarget } from '@/lib/writing';
import { FullMockSection } from '@/lib/fullMock';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import SectionMockIntro from '@/components/mocks/SectionMockIntro';
import PracticeResultCard from '@/components/practice/PracticeResultCard';

/** Mirrors billing.SectionMockSubTests on the server, which is what enforces it. */
const SECTION_MOCK_SUB_TESTS = 5;

export interface WritingMockSession {
  id: string;
  status: string;
  module: IELTSModule;
  durationMinutes: number;
  secondsRemaining: number;
  task1: Question;
  task2: Question;
  task1Draft: string;
  task2Draft: string;
}

interface WritingMockOutcome {
  attempt: MockAttempt | null;
  writingBand: number | null;
  task1Evaluation: Evaluation;
  task2Evaluation: Evaluation;
  xpAwarded: number;
}

type TaskKey = 'task1' | 'task2';

/**
 * The IELTS Writing mock: both tasks in one 60-minute sitting.
 *
 * The server keeps the time and the drafts, so a paper that is closed and
 * reopened comes back as it was left, and one that runs out of time is graded
 * from what was written in time. The result is a Writing band in which Task 2
 * counts twice as much as Task 1, as it does in IELTS.
 */
export default function WritingMockPanel({ section }: { section?: FullMockSection<WritingMockSession> } = {}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, activeExam, refreshUser } = useApp();

  const [session, setSession] = useState<WritingMockSession | null>(null);
  const [drafts, setDrafts] = useState<Record<TaskKey, string>>({ task1: '', task2: '' });
  const [active, setActive] = useState<TaskKey>('task1');
  const [outcome, setOutcome] = useState<WritingMockOutcome | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saved = useRef('');

  const open = useCallback((paper: WritingMockSession) => {
    setSession(paper);
    const restored = { task1: paper.task1Draft ?? '', task2: paper.task2Draft ?? '' };
    setDrafts(restored);
    saved.current = JSON.stringify(restored);
    setOutcome(null);
  }, []);

  // Inside a full mock the paper has already been dealt.
  const dealt = section?.session;
  useEffect(() => {
    if (dealt) open(dealt);
  }, [dealt, open]);

  const [searchParams] = useSearchParams();
  const refreshPapers = useRefreshMockPapers();

  const start = useCallback(async (chosen?: string) => {
    setStarting(true);
    try {
      const paperId = chosen ?? searchParams.get('paper');
      const body = paperId ? { paperId } : {};
      const data = await api.post<{ session: WritingMockSession }>('/writing/mocks', body);
      open(data.session);
      void refreshUser();
      refreshPapers();
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Not enough sub-tests left today', errorMessage(err));
      } else {
        toast.error('Could not start the writing mock', errorMessage(err));
      }
    } finally {
      setStarting(false);
    }
  }, [open, refreshPapers, refreshUser, searchParams, toast]);

  // Drafts are saved a few seconds after the learner stops typing.
  const saveDrafts = useCallback(async (paper: WritingMockSession, current: Record<TaskKey, string>) => {
    const body = JSON.stringify(current);
    if (body === saved.current) return;
    try {
      await api.put(`/writing/mocks/${paper.id}/drafts`, current);
      saved.current = body;
    } catch {
      // Retried with the next change or on submission; the text is still here.
    }
  }, []);

  useEffect(() => {
    if (!session || outcome) return;
    const timer = setTimeout(() => void saveDrafts(session, drafts), 3000);
    return () => clearTimeout(timer);
  }, [drafts, session, outcome, saveDrafts]);

  const submit = useCallback(async () => {
    if (!session || submitting) return;
    setSubmitting(true);
    try {
      const data = await api.post<WritingMockOutcome>(`/writing/mocks/${session.id}/submit`, drafts);
      setSession(null);
      void refreshUser();
      refreshPapers();
      // In a full mock the results come at the end, as in the test.
      if (section) section.onSubmitted();
      else setOutcome(data);
    } catch (err) {
      if (section && err instanceof ApiError && err.status === 409) {
        // Submitted or closed already; the full mock reads which.
        section.onSubmitted();
        return;
      }
      toast.error('Could not submit the writing mock', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [drafts, refreshPapers, refreshUser, section, session, submitting, toast]);

  const leave = () => {
    if (session) void saveDrafts(session, drafts);
    if (section) section.onLeave();
    else navigate('/practice?skill=writing');
  };

  if (!section && !isPremiumUser(user)) {
    return <PracticeMockPaywall skill="writing" exam={activeExam} />;
  }

  if (outcome) {
    return <WritingMockResult outcome={outcome} onBack={() => navigate('/practice?skill=writing')} onRedo={() => { setOutcome(null); void start(); }} />;
  }

  if (session) {
    return (
      <WritingMockRunner
        key={session.id}
        session={session}
        drafts={drafts}
        active={active}
        submitting={submitting}
        onSelect={setActive}
        onChange={(key, text) => setDrafts(previous => ({ ...previous, [key]: text }))}
        onSubmit={() => void submit()}
        onLeave={leave}
      />
    );
  }

  if (section) return null;

  return (
    <SectionMockIntro
      exam="IELTS"
      skill="writing"
      title="Writing Sectional Test"
      description="Task 1 and Task 2 in 60 minutes, as in the test."
      duration="60 min"
      items="2 tasks"
      parts={[
        { name: 'Task 1', detail: '150+ words, about 20 min' },
        { name: 'Task 2: Essay', detail: '250+ words, about 40 min' },
      ]}
      rules={[
        'One clock of 60 minutes covers both tasks.',
        'Your writing is saved as you go.',
        'Task 2 counts twice as much as Task 1 in your Writing band.',
      ]}
      equipment="This test has no audio. You only need a keyboard."
      credits={SECTION_MOCK_SUB_TESTS}
      subTestsRemaining={subTestsLeft(user?.subscription)}
      isStarting={starting}
      onStart={paperId => void start(paperId)}
    />
  );
}

interface RunnerProps {
  session: WritingMockSession;
  drafts: Record<TaskKey, string>;
  active: TaskKey;
  submitting: boolean;
  onSelect: (key: TaskKey) => void;
  onChange: (key: TaskKey, text: string) => void;
  onSubmit: () => void;
  onLeave: () => void;
}

function WritingMockRunner({ session, drafts, active, submitting, onSelect, onChange, onSubmit, onLeave }: RunnerProps) {
  // Counting down to the server's deadline, not a fresh hour, so a reopened
  // paper resumes with the time it has left.
  const [deadline] = useState(() => Date.now() + session.secondsRemaining * 1000);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, deadline]);

  // Time is up: submit once. A failure is left to the Submit button rather
  // than retried in a loop, which would ask for a rating again and again.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (secondsLeft === 0 && !submitting && !autoSubmitted.current) {
      autoSubmitted.current = true;
      onSubmit();
    }
  }, [secondsLeft, submitting, onSubmit]);

  const task = active === 'task1' ? session.task1 : session.task2;
  const text = drafts[active];
  const words = writingWordCount(text);
  const target = writingWordTarget(task) ?? 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const tabs: { key: TaskKey; label: string; hint: string }[] = [
    { key: 'task1', label: 'Task 1', hint: 'about 20 minutes · 150+ words' },
    { key: 'task2', label: 'Task 2', hint: 'about 40 minutes · 250+ words' },
  ];

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] px-3 sm:px-6 lg:px-8 py-3 space-y-3 bg-background">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border pb-2.5">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            IELTS {IELTS_MODULE_LABEL[session.module]} Writing Mock
          </h1>
          <p className="text-xs text-muted-foreground">2 tasks • 60 minutes • Task 2 counts twice as much as Task 1</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={secondsLeft <= 300 ? 'warning' : 'outline'} className="gap-1 font-mono">
            <Clock className="w-3 h-3" />
            {minutes}:{String(seconds).padStart(2, '0')}
          </Badge>
          <Button variant="outline" size="sm" onClick={onLeave} className="gap-1.5 font-bold">
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-2" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => onSelect(tab.key)}
            className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
              active === tab.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            }`}
          >
            {tab.label}
            <span className="block font-medium text-[10px] opacity-70">
              {tab.hint} · {writingWordCount(drafts[tab.key])} written
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 space-y-3">
          <h2 className="font-display font-bold text-base text-foreground">{task.title}</h2>
          <p className="text-xs sm:text-[13px] text-foreground leading-relaxed whitespace-pre-line">{task.prompt}</p>
          {task.imageUrl && (
            <div className="mx-auto w-full overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-white p-3">
              {/* Squeezed to a phone's width the labels are too small to read,
                  so there the figure keeps a readable width and scrolls sideways. */}
              <img src={task.imageUrl} alt={task.title} className="h-auto w-[520px] max-w-none object-contain sm:w-full sm:max-w-full" />
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-sm font-bold text-foreground">Your {active === 'task1' ? 'Task 1' : 'Task 2'} response</span>
            <Badge variant={words >= target ? 'success' : 'warning'}>{`${words} / ${target} words`}</Badge>
          </div>
          <Textarea
            rows={16}
            value={text}
            disabled={submitting}
            onChange={event => onChange(active, event.target.value)}
            placeholder="Write your response here…"
            className="border-2 border-primary bg-background px-4 py-3 text-[15px] leading-7 text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label={`${active === 'task1' ? 'Task 1' : 'Task 2'} response`}
          />
          <p className="text-xs leading-relaxed text-foreground/75">
            Your writing is saved as you go. When time runs out, the paper is submitted with what you have written.
          </p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSubmit} disabled={submitting} className="font-bold gap-1.5 shadow-md">
          {submitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Rating both tasks…</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Finish and submit</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function WritingMockResult({ outcome, onBack, onRedo }: { outcome: WritingMockOutcome; onBack: () => void; onRedo?: () => void }) {
  const t1 = outcome.task1Evaluation.estimatedScore;
  const t2 = outcome.task2Evaluation.estimatedScore;
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <Card className="p-5 text-center space-y-1.5">
        <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Writing band</span>
        <div className="font-display text-4xl font-black text-foreground">
          {outcome.writingBand != null ? outcome.writingBand.toFixed(1) : '—'}
        </div>
        <p className="text-xs text-muted-foreground">
          {outcome.writingBand != null
            ? `Task 1 ${t1?.toFixed(1)} and Task 2 ${t2?.toFixed(1)}, with Task 2 counting twice as much. A practice estimate, not an official result.`
            : 'One of the tasks could not be rated, so there is no Writing band for this paper. The feedback below says why.'}
        </p>
        {outcome.xpAwarded > 0 && <Badge variant="default">+{outcome.xpAwarded} XP</Badge>}
      </Card>

      <div className="space-y-2">
        <h2 className="font-display text-sm font-bold text-foreground">Task 1</h2>
        <PracticeResultCard result={{ evaluation: outcome.task1Evaluation, xpAwarded: 0 }} />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-sm font-bold text-foreground">Task 2</h2>
        <PracticeResultCard result={{ evaluation: outcome.task2Evaluation, xpAwarded: 0 }} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack}>Back to writing practice</Button>
        {onRedo && (
          <Button onClick={onRedo} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Redo
          </Button>
        )}
      </div>
    </div>
  );
}

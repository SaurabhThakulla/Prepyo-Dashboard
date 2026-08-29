'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Clock,
  Play,
  Award,
  RefreshCw,
  Flag,
  RotateCcw,
  FileText,
  Calendar,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AnswerSubmission, Mock, MockAttempt, Question } from '@/lib/types';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import mockTestsData from '@/data/mock-tests.json';

interface SubmitOutcome {
  attempt: MockAttempt;
  xpAwarded: number;
  scoredQuestions: number;
  ungradedQuestions: number;
  scoreConfidence: string;
}

function MocksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeExam, refreshUser } = useApp();
  const toast = useToast();

  const activeTab = searchParams.get('tab') === 'reports' ? 'reports' : 'catalog';

  const [mocks, setMocks] = useState<Mock[]>(() =>
    mockTestsData.availableMockTests.map(m => ({
      id: m.id,
      examVersionId: 'v1',
      exam: m.exam as any,
      title: m.title,
      description: m.description,
      totalDurationMinutes: m.durationMinutes,
      totalQuestions: m.totalQuestions,
      isDiagnostic: false,
      sections: m.sections.map((s, idx) => ({
        id: `sec-${m.id}-${idx}`,
        name: s.name,
        skill: s.name.toLowerCase().includes('speaking') ? 'speaking' : s.name.toLowerCase().includes('writing') ? 'writing' : s.name.toLowerCase().includes('reading') ? 'reading' : 'listening' as any,
        durationMinutes: s.durationMinutes,
        questionIds: Array.from({ length: s.questions }, (_, qIdx) => `q-${m.id}-${idx}-${qIdx}`),
      })),
    }))
  );
  const [pastAttempts, setPastAttempts] = useState<MockAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  // Live simulation state.
  const [activeMock, setActiveMock] = useState<Mock | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<MockAttempt | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get<{ mocks: Mock[] }>('/mocks', { exam: activeExam }),
      api.get<{ attempts: MockAttempt[] }>('/mocks/attempts'),
    ])
      .then(([mockData, attemptData]) => {
        if (cancelled) return;
        if (mockData.mocks?.length) setMocks(mockData.mocks);
        if (attemptData.attempts?.length) setPastAttempts(attemptData.attempts);
      })
      .catch(() => {
        // Fallback provided by mock-tests.json
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam]);

  const currentQuestion = examQuestions[currentIndex] ?? null;

  const handleFinishMock = useCallback(async () => {
    if (!activeMock || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const elapsed = activeMock.totalDurationMinutes * 60 - timerSeconds;
      const data = await api.post<SubmitOutcome>(`/mocks/${activeMock.id}/submit`, {
        answers: Object.values(answers),
        durationSeconds: Math.max(0, elapsed),
      });
      setOutcome(data);
      setPastAttempts(prev => [data.attempt, ...prev]);
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Mock limit reached', errorMessage(err));
      } else {
        toast.error('Could not submit your mock', errorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [activeMock, isSubmitting, timerSeconds, answers, refreshUser, toast]);

  // Exam countdown. Submitting on zero mirrors a real timed test.
  useEffect(() => {
    if (!activeMock || outcome || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          handleFinishMock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMock, outcome, timerSeconds, handleFinishMock]);

  const handleStartMock = useCallback(async (mock: Mock) => {
    setStarting(mock.id);
    try {
      // Fetch the mock's real questions rather than improvising a prompt.
      const data = await api.get<{ mock: Mock; questions: Question[] }>(`/mocks/${mock.id}`);
      setActiveMock(data.mock);
      setExamQuestions(data.questions ?? []);
      setCurrentIndex(0);
      setTimerSeconds(mock.totalDurationMinutes * 60);
      setAnswers({});
      setFlagged([]);
      setOutcome(null);
    } catch (err) {
      toast.error('Could not start that mock', errorMessage(err));
    } finally {
      setStarting(null);
    }
  }, [toast]);

  // /diagnostic hands off here with ?start=<mockId> so there is only one exam
  // runner in the app.
  const startParam = searchParams.get('start');
  useEffect(() => {
    if (!startParam || activeMock || loading) return;
    const target = mocks.find(m => m.id === startParam);
    if (target) {
      handleStartMock(target);
      router.replace('/mocks');
    }
  }, [startParam, activeMock, loading, mocks, handleStartMock, router]);

  const setAnswerFor = (question: Question, patch: Partial<AnswerSubmission>) => {
    setAnswers(prev => ({
      ...prev,
      [question.id]: { ...prev[question.id], questionId: question.id, ...patch },
    }));
  };

  const exitExam = () => {
    setActiveMock(null);
    setExamQuestions([]);
    setOutcome(null);
    setAnswers({});
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scoreCard = (attempt: MockAttempt, extra?: SubmitOutcome) => (
    <Card className="border-primary/40 p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="font-display text-2xl font-bold text-foreground">Score Report</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(attempt.completedAt).toLocaleString()} • {attempt.exam}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            exitExam();
            setReviewAttempt(null);
          }}
          className="gap-1.5 font-bold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Back to Mock Center</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Overall</span>
          <div className="font-display text-4xl font-black text-foreground">{attempt.userScore}</div>
          <Badge variant="success">Practice estimate</Badge>
        </Card>

        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Correct</span>
          <div className="font-display text-4xl font-black text-primary">
            {attempt.totalCorrect}
            <span className="text-xs font-bold text-muted-foreground"> / {attempt.totalQuestions}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Auto-graded questions</p>
        </Card>

        <Card className="bg-background p-5 text-center space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Duration</span>
          <div className="font-display text-4xl font-black text-amber-400">
            {Math.round(attempt.durationSeconds / 60)}
            <span className="text-xs font-bold text-muted-foreground"> min</span>
          </div>
          {extra && <p className="text-[10px] text-muted-foreground">+{extra.xpAwarded} XP awarded</p>}
        </Card>
      </div>

      {/* The API is explicit about what the score does and does not cover. */}
      {extra && extra.ungradedQuestions > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-medium flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            This score covers {extra.scoredQuestions} auto-graded question
            {extra.scoredQuestions === 1 ? '' : 's'}. {extra.ungradedQuestions} speaking/writing question
            {extra.ungradedQuestions === 1 ? ' was' : 's were'} left out rather than guessed at.
            Confidence: {extra.scoreConfidence}.
          </span>
        </div>
      )}

      {Object.keys(attempt.skillScores ?? {}).length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-display text-sm font-bold text-foreground">Skill breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(attempt.skillScores).map(([skill, score]) => (
              <div key={skill} className="p-3.5 rounded-xl bg-card border border-border text-center space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase capitalize">{skill}</span>
                <div className="font-display text-xl font-black text-foreground">{score}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  // ── Report views ──
  if (outcome) return <div className="space-y-6">{scoreCard(outcome.attempt, outcome)}</div>;
  if (reviewAttempt) return <div className="space-y-6">{scoreCard(reviewAttempt)}</div>;

  // ── Live exam ──
  if (activeMock) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 sticky top-20 z-30 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Badge variant="default">{activeMock.exam}</Badge>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">{activeMock.title}</h3>
              <p className="text-[11px] text-muted-foreground">
                Question {currentIndex + 1} of {examQuestions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-xl border border-border text-amber-400 font-mono font-bold text-sm">
              <Clock className="w-4 h-4" />
              <span>{formatTime(timerSeconds)}</span>
            </div>
            <Button onClick={handleFinishMock} disabled={isSubmitting} variant="destructive" size="sm" className="font-bold">
              {isSubmitting ? 'Scoring…' : 'Finish & Submit'}
            </Button>
          </div>
        </div>

        {!currentQuestion ? (
          <Card className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <CardTitle className="text-base">This mock has no questions attached</CardTitle>
            <CardDescription>Nothing to sit yet. Try another exam from the catalog.</CardDescription>
            <Button variant="outline" size="sm" onClick={exitExam} className="font-bold text-xs">Back</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-8 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{currentQuestion.typeName}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{currentQuestion.skill}</span>
                </div>
                <Button
                  size="sm"
                  variant={flagged.includes(currentQuestion.id) ? ('warning' as any) : 'outline'}
                  onClick={() =>
                    setFlagged(prev =>
                      prev.includes(currentQuestion.id)
                        ? prev.filter(id => id !== currentQuestion.id)
                        : [...prev, currentQuestion.id],
                    )
                  }
                  className="font-bold text-xs gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flagged.includes(currentQuestion.id) ? 'Flagged' : 'Flag'}</span>
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-display font-bold text-base text-foreground">{currentQuestion.title}</h4>
                <div className="p-4 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground leading-relaxed">
                  {currentQuestion.prompt}
                </div>

                {currentQuestion.contextPassage && (
                  <div className="p-4 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed max-h-56 overflow-y-auto">
                    {currentQuestion.contextPassage}
                  </div>
                )}

                {currentQuestion.audioTranscript && !currentQuestion.audioUrl && (
                  <div className="p-3 rounded-xl bg-background border border-border text-[11px] text-muted-foreground italic">
                    Transcript (no audio file yet): &ldquo;{currentQuestion.audioTranscript}&rdquo;
                  </div>
                )}

                {/* Options */}
                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="space-y-2">
                    {currentQuestion.options.map(opt => {
                      const selected = answers[currentQuestion.id]?.selectedOptions ?? [];
                      const checked = selected.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                            checked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e =>
                              setAnswerFor(currentQuestion, {
                                selectedOptions: e.target.checked
                                  ? [...selected, opt.id]
                                  : selected.filter(id => id !== opt.id),
                              })
                            }
                            className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="text-foreground font-medium leading-relaxed">{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Blanks */}
                {currentQuestion.blanks && currentQuestion.blanks.length > 0 && (
                  <div className="space-y-2">
                    {currentQuestion.blanks.map((b, idx) => {
                      const current = answers[currentQuestion.id]?.blankResponses ?? {};
                      return (
                        <div key={b.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border text-xs">
                          <span className="font-bold text-primary shrink-0">Blank {idx + 1}:</span>
                          {b.options && b.options.length > 0 ? (
                            <select
                              value={current[b.id] || ''}
                              onChange={e =>
                                setAnswerFor(currentQuestion, {
                                  blankResponses: { ...current, [b.id]: e.target.value },
                                })
                              }
                              className="bg-card border border-border text-xs font-medium text-foreground px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                            >
                              <option value="">— Choose —</option>
                              {b.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={current[b.id] || ''}
                              onChange={e =>
                                setAnswerFor(currentQuestion, {
                                  blankResponses: { ...current, [b.id]: e.target.value },
                                })
                              }
                              className="bg-card border border-border text-xs font-medium text-foreground px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Free text for writing/speaking sections */}
                {(currentQuestion.skill === 'writing' || currentQuestion.skill === 'speaking') && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground">Your response</span>
                    <Textarea
                      rows={7}
                      value={answers[currentQuestion.id]?.textResponse ?? ''}
                      onChange={e => setAnswerFor(currentQuestion, { textResponse: e.target.value })}
                      placeholder="Type your response…"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Recorded with your attempt. {currentQuestion.skill === 'speaking' ? 'Speaking' : 'Writing'} answers
                      are not auto-scored, so they are excluded from the overall estimate.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  className="font-bold text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (currentIndex < examQuestions.length - 1) setCurrentIndex(prev => prev + 1);
                    else handleFinishMock();
                  }}
                  className="font-bold text-xs"
                >
                  {currentIndex < examQuestions.length - 1 ? 'Next Question ➔' : 'Finish & Submit'}
                </Button>
              </div>
            </Card>

            <Card className="lg:col-span-4 p-5 space-y-4">
              <CardTitle className="text-xs uppercase">Question palette</CardTitle>
              <div className="grid grid-cols-4 gap-2">
                {examQuestions.map((q, idx) => {
                  const answered = Boolean(answers[q.id]);
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${
                        currentIndex === idx
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                          : flagged.includes(q.id)
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                            : answered
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ── Catalog / reports hub ──
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{activeExam} Mock Exam Center</h1>
          <p className="text-xs text-muted-foreground">Timed simulations graded on the server.</p>
        </div>

        <div className="flex items-center bg-card p-1 rounded-xl border border-border shrink-0">
          <button
            type="button"
            onClick={() => router.push('/mocks?tab=catalog')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'catalog' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Exam Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/mocks?tab=reports')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'reports' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Score Reports</span>
            {pastAttempts.length > 0 && (
              <span className="text-[10px] bg-primary-foreground/20 px-1.5 rounded-full font-mono">
                {pastAttempts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-4">
          {pastAttempts.length > 0 ? (
            pastAttempts.map(attempt => (
              <Card key={attempt.id} className="p-5 border-border hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo">{attempt.exam}</Badge>
                    <span className="text-xs font-bold text-foreground">
                      {mocks.find(m => m.id === attempt.mockId)?.title ?? attempt.mockId}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(attempt.completedAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{Math.round(attempt.durationSeconds / 60)} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase">Score</div>
                    <div className="font-display text-2xl font-black text-foreground">{attempt.userScore}</div>
                  </div>
                  <Button size="sm" onClick={() => setReviewAttempt(attempt)} className="font-bold text-xs gap-1.5 shadow-sm">
                    <span>Review</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="text-center py-16 p-6 border-dashed border-border space-y-3">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-foreground">No score reports yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Complete a mock exam and its scorecard will appear here.
                </p>
              </div>
              <Button onClick={() => router.push('/mocks?tab=catalog')} size="sm" className="font-bold text-xs gap-1.5 mt-2">
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Browse catalog</span>
              </Button>
            </Card>
          )}
        </div>
      ) : mocks.length === 0 ? (
        <Card className="text-center py-16 p-6 border-dashed border-border space-y-2">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="font-display text-base font-bold text-foreground">No {activeExam} mocks available</h3>
          <p className="text-xs text-muted-foreground">Switch exam or check back later.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mocks.map(mock => (
            <Card key={mock.id} className="p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="indigo">{mock.exam} • {mock.totalDurationMinutes} min</Badge>
                  {mock.isDiagnostic && <Badge variant="warning">Diagnostic</Badge>}
                </div>
                <CardTitle className="text-base">{mock.title}</CardTitle>
                <CardDescription>{mock.description}</CardDescription>
                <p className="text-[11px] text-muted-foreground">
                  {mock.totalQuestions} question{mock.totalQuestions === 1 ? '' : 's'} across {mock.sections.length} section
                  {mock.sections.length === 1 ? '' : 's'}
                </p>
              </div>
              <Button
                onClick={() => handleStartMock(mock)}
                disabled={starting === mock.id}
                className="w-full font-bold gap-2 shadow-md"
              >
                {starting === mock.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>{starting === mock.id ? 'Loading…' : 'Start exam'}</span>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MocksPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20 bg-card rounded-2xl border border-border">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
      </div>
    }>
      <MocksContent />
    </Suspense>
  );
}

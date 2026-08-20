'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Clock,
  Play,
  CheckCircle2,
  Award,
  Sparkles,
  RefreshCw,
  Flag,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MockExamBlueprint, MockAttemptResult } from '@/lib/types';

export default function MocksPage() {
  const { activeExam, awardLocalXP } = useApp();
  const [mocks, setMocks] = useState<MockExamBlueprint[]>([]);
  const [pastAttempts, setPastAttempts] = useState<MockAttemptResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Simulation State
  const [activeMock, setActiveMock] = useState<MockExamBlueprint | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptReport, setAttemptReport] = useState<MockAttemptResult | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/mocks?exam=${activeExam}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMocks(data.mocks || []);
          setPastAttempts(data.pastAttempts || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeExam]);

  useEffect(() => {
    let interval: any = null;
    if (activeMock && !attemptReport && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            handleFinishMock();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeMock, attemptReport, timerSeconds]);

  const handleStartMock = (mock: MockExamBlueprint) => {
    setActiveMock(mock);
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setTimerSeconds(mock.totalDurationMinutes * 60);
    setAnswers({});
    setFlaggedQuestions([]);
    setAttemptReport(null);
  };

  const handleFinishMock = async () => {
    if (!activeMock || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/mocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockId: activeMock.id,
          answers,
          durationSeconds: activeMock.totalDurationMinutes * 60 - timerSeconds,
        }),
      });

      const data = await res.json();
      if (data.success && data.attempt) {
        setAttemptReport(data.attempt);
        setPastAttempts(prev => [data.attempt, ...prev]);
        awardLocalXP(300, `Completed Full Mock: ${activeMock.title}`);
      }
    } catch (err) {
      console.error('Failed to submit mock:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isPTE = activeExam === 'PTE';

  return (
    <div className="space-y-6">
      
      {/* Simulation Room View */}
      {activeMock && !attemptReport && (
        <div className="space-y-6">
          <div className="bg-card border border-border p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 sticky top-20 z-30 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Badge variant="default">{activeMock.exam}</Badge>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">{activeMock.title}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {activeMock.sections[currentSectionIndex]?.name} • Section {currentSectionIndex + 1} of {activeMock.sections.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-xl border border-border text-amber-400 font-mono font-bold text-sm">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>{formatTime(timerSeconds)}</span>
              </div>

              <Button onClick={handleFinishMock} disabled={isSubmitting} variant="destructive" size="sm" className="font-bold">
                {isSubmitting ? 'Scoring...' : 'Finish & Submit'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-8 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-bold text-foreground">
                  Question {currentQuestionIndex + 1} of {activeMock.totalQuestions}
                </span>
                <Button
                  size="sm"
                  variant={flaggedQuestions.includes(`q-${currentQuestionIndex}`) ? 'warning' as any : 'outline'}
                  onClick={() => {
                    const qId = `q-${currentQuestionIndex}`;
                    if (flaggedQuestions.includes(qId)) {
                      setFlaggedQuestions(flaggedQuestions.filter(id => id !== qId));
                    } else {
                      setFlaggedQuestions([...flaggedQuestions, qId]);
                    }
                  }}
                  className="font-bold text-xs gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flaggedQuestions.includes(`q-${currentQuestionIndex}`) ? 'Flagged' : 'Flag for Review'}</span>
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-display font-bold text-base text-foreground">
                  {isPTE ? 'Read Aloud / Academic Argumentative Task' : 'Reading Comprehension & Writing Task'}
                </h4>
                <div className="p-4 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground leading-relaxed">
                  {isPTE
                    ? 'The transition towards decarbonized energy systems necessitates robust policy intervention and strategic investments in grid storage technologies.'
                    : 'Analyze the primary socioeconomic factors influencing urbanization rates in South Asia over the past two decades.'}
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground">Your Exam Response:</span>
                  <Textarea
                    rows={7}
                    value={answers[`q-${currentQuestionIndex}`] || ''}
                    onChange={(e) => setAnswers({ ...answers, [`q-${currentQuestionIndex}`]: e.target.value })}
                    placeholder="Type or dictate your official exam response..."
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  className="font-bold text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (currentQuestionIndex < activeMock.totalQuestions - 1) {
                      setCurrentQuestionIndex(prev => prev + 1);
                    } else {
                      handleFinishMock();
                    }
                  }}
                  className="font-bold text-xs"
                >
                  {currentQuestionIndex < activeMock.totalQuestions - 1 ? 'Next Question ➔' : 'Complete Section'}
                </Button>
              </div>
            </Card>

            <Card className="lg:col-span-4 p-5 space-y-4">
              <CardTitle className="text-xs uppercase">Question Palette</CardTitle>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: activeMock.totalQuestions }).map((_, idx) => {
                  const isCurrent = currentQuestionIndex === idx;
                  const isAnswered = !!answers[`q-${idx}`];
                  const isFlagged = flaggedQuestions.includes(`q-${idx}`);

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                          : isFlagged
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                          : isAnswered
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
        </div>
      )}

      {/* Score Report */}
      {attemptReport && (
        <Card className="border-primary/40 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                <h2 className="font-display text-2xl font-bold text-foreground">Simulation Score Report</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Completed on {new Date(attemptReport.completedAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setActiveMock(null); setAttemptReport(null); }}
              className="gap-1.5 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to Catalog</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-background p-5 text-center space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Overall</span>
              <div className="font-display text-4xl font-black text-foreground">
                {attemptReport.userScore} <span className="text-xs text-muted-foreground font-bold">/ {isPTE ? '90' : '9.0'}</span>
              </div>
              <Badge variant="success">Practice Estimate</Badge>
            </Card>

            <Card className="bg-background p-5 text-center space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Target Gap</span>
              <div className="font-display text-4xl font-black text-amber-400">
                {attemptReport.targetGap} <span className="text-xs font-bold text-muted-foreground">{isPTE ? 'pts' : 'Band'}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Points to official goal</p>
            </Card>

            <Card className="bg-background p-5 text-center space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Readiness Boost</span>
              <div className="font-display text-4xl font-black text-primary">+{attemptReport.readinessImpact}%</div>
              <p className="text-[10px] text-muted-foreground">Profile updated</p>
            </Card>
          </div>
        </Card>
      )}

      {/* Catalog */}
      {!activeMock && !attemptReport && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{activeExam} Mock Exam Center</h1>
            <p className="text-xs text-muted-foreground">Full-length simulations under real exam conditions</p>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mocks.map(mock => (
                <Card key={mock.id} className="p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="indigo">{mock.exam} • {mock.totalDurationMinutes} Min</Badge>
                      {mock.isDiagnostic && <Badge variant="warning">Diagnostic</Badge>}
                    </div>
                    <CardTitle className="text-base">{mock.title}</CardTitle>
                    <CardDescription>{mock.description}</CardDescription>
                  </div>
                  <Button onClick={() => handleStartMock(mock)} className="w-full font-bold gap-2 shadow-md">
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Launch Exam Simulation</span>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

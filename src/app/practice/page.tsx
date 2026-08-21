'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  RefreshCw,
  Clock,
  Bot,
  AlertCircle,
  Volume2,
  Award,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Evaluation, PracticeAttempt, Question, SkillType } from '@/lib/types';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

/**
 * How each skill is graded, which decides what this page can offer.
 *
 * - reading / listening are graded deterministically by POST /practice/attempts
 * - writing goes to the AI evaluator at POST /evaluations/writing
 * - speaking has no scoring path in the API yet, so it is not offered
 */
const GRADING: Record<SkillType, 'deterministic' | 'ai' | 'unavailable'> = {
  reading: 'deterministic',
  listening: 'deterministic',
  writing: 'ai',
  speaking: 'unavailable',
};

interface SubmitResult {
  attempt?: PracticeAttempt;
  review?: Question;
  evaluation?: Evaluation;
  xpAwarded: number;
}

function PracticeContent() {
  const { activeExam, refreshUser, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const toast = useToast();
  const searchParams = useSearchParams();

  const [selectedSkill, setSelectedSkill] = useState<SkillType>(
    (searchParams.get('skill') as SkillType) || 'reading',
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  const [textAnswer, setTextAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [blankResponses, setBlankResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());

  const grading = GRADING[selectedSkill];

  useEffect(() => {
    const skillParam = searchParams.get('skill') as SkillType;
    if (skillParam && ['speaking', 'writing', 'reading', 'listening'].includes(skillParam)) {
      setSelectedSkill(skillParam);
    }
  }, [searchParams]);

  const resetAnswer = useCallback(() => {
    setResult(null);
    setTextAnswer('');
    setBlankResponses({});
    setSelectedOptions([]);
    setStartedAt(Date.now());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resetAnswer();

    api
      .get<{ questions: Question[] }>('/questions', { exam: activeExam, skill: selectedSkill })
      .then(data => {
        if (cancelled) return;
        const list = data.questions ?? [];
        setQuestions(list);
        setCurrentQuestion(list[0] ?? null);
      })
      .catch(err => {
        if (cancelled) return;
        setQuestions([]);
        setCurrentQuestion(null);
        toast.error('Could not load questions', errorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam, selectedSkill]);

  const wordCount = textAnswer.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || submitting) return;
    setSubmitting(true);

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    try {
      if (grading === 'ai') {
        const data = await api.post<{ evaluation: Evaluation; xpAwarded: number }>('/evaluations/writing', {
          questionId: currentQuestion.id,
          text: textAnswer,
        });
        setResult({ evaluation: data.evaluation, xpAwarded: data.xpAwarded });
      } else {
        const data = await api.post<{ attempt: PracticeAttempt; review: Question; xpAwarded: number }>(
          '/practice/attempts',
          {
            questionId: currentQuestion.id,
            textResponse: textAnswer || undefined,
            selectedOptions: selectedOptions.length ? selectedOptions : undefined,
            blankResponses: Object.keys(blankResponses).length ? blankResponses : undefined,
            timeSpentSeconds,
          },
        );
        setResult({ attempt: data.attempt, review: data.review, xpAwarded: data.xpAwarded });
      }
      // XP, streak and mission progress all changed server-side.
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.isAIUnavailable) {
        toast.error('Evaluation unavailable', 'The AI evaluator is not configured. Your response was not lost.');
      } else if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily limit reached', err.message);
      } else {
        toast.error('Could not submit your answer', errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAITutor = () => {
    if (!currentQuestion) return;
    setTutorContextPrompt(
      `Question: ${currentQuestion.title}\nTask type: ${currentQuestion.typeName}\nPrompt: ${currentQuestion.prompt}`,
    );
    setIsTutorOpen(true);
  };

  const canSubmit =
    grading !== 'unavailable' &&
    (textAnswer.trim().length > 0 ||
      selectedOptions.length > 0 ||
      Object.values(blankResponses).some(Boolean));

  return (
    <div className="space-y-6">

      {/* Skill Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {activeExam} Practice Studio
          </h1>
          <p className="text-xs text-muted-foreground">
            Answers are graded on the server — nothing is scored in your browser.
          </p>
        </div>

        <div className="flex bg-muted/60 p-1 rounded-xl border border-border overflow-x-auto no-scrollbar">
          {[
            { id: 'reading', label: 'Reading', icon: BookOpen },
            { id: 'listening', label: 'Listening', icon: Headphones },
            { id: 'writing', label: 'Writing', icon: PenTool },
            { id: 'speaking', label: 'Speaking', icon: Mic },
          ].map(tab => {
            const Icon = tab.icon;
            const active = selectedSkill === tab.id;
            return (
              <Button
                key={tab.id}
                size="sm"
                variant={active ? 'default' : 'ghost'}
                onClick={() => {
                  setSelectedSkill(tab.id as SkillType);
                  window.history.pushState(null, '', `/practice?skill=${tab.id}`);
                }}
                className="font-bold text-xs gap-1.5"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading questions…</p>
        </div>
      ) : grading === 'unavailable' ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border space-y-3 max-w-lg mx-auto">
          <Mic className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Speaking practice isn&apos;t scored yet</h3>
          <p className="text-xs text-muted-foreground px-6 leading-relaxed">
            Speaking responses need audio capture and a pronunciation model, neither of which is wired up.
            Rather than show you a made-up score, this section stays closed until it can grade properly.
          </p>
          <Button asChild variant="outline" size="sm" className="font-bold text-xs">
            <Link href="/practice?skill=reading">Practise reading instead</Link>
          </Button>
        </div>
      ) : !currentQuestion ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No {selectedSkill} questions for {activeExam} yet</h3>
          <p className="text-xs text-muted-foreground">Try another skill or switch exam.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Question & response */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{currentQuestion.typeName}</Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {currentQuestion.difficulty.toUpperCase()} • {currentQuestion.points} Points
                  </span>
                </div>

                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3 text-primary" />
                  {Math.round(currentQuestion.timeLimitSeconds / 60)} min
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-lg text-foreground">{currentQuestion.title}</h3>
                <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed font-medium">
                  {currentQuestion.prompt}
                </div>
              </div>

              {currentQuestion.imageUrl && (
                <div className="p-3 bg-background rounded-xl border border-border flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentQuestion.imageUrl} alt={currentQuestion.title} className="rounded-lg max-h-60 object-cover w-full" />
                </div>
              )}

              {/* Real audio when the question has a file; otherwise the
                  transcript, labelled as a stand-in rather than dressed up as a
                  player. */}
              {currentQuestion.audioUrl ? (
                <div className="p-4 rounded-xl bg-background border border-border space-y-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Volume2 className="w-4 h-4 text-primary" /> Audio
                  </span>
                  <audio controls src={currentQuestion.audioUrl} className="w-full">
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : currentQuestion.audioTranscript ? (
                <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Volume2 className="w-4 h-4 text-muted-foreground" /> Transcript
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    No audio file for this question yet, so the script is shown instead.
                  </p>
                  <p className="text-xs text-foreground italic leading-relaxed">
                    &ldquo;{currentQuestion.audioTranscript}&rdquo;
                  </p>
                </div>
              ) : null}

              {currentQuestion.contextPassage && (
                <div className="p-4 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed max-h-56 overflow-y-auto">
                  {currentQuestion.contextPassage}
                </div>
              )}
            </Card>

            {/* Answer form */}
            <Card className="p-6 space-y-4">
              {grading === 'ai' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Your response</span>
                    <Badge variant={wordCount >= 20 ? 'success' : 'warning'}>{wordCount} words</Badge>
                  </div>
                  <Textarea
                    rows={8}
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    placeholder="Write your response here…"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    At least 20 words so the evaluator has something to work with.
                  </p>
                </div>
              )}

              {currentQuestion.options && currentQuestion.options.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground">Choose your answer:</h4>
                  {currentQuestion.options.map(opt => {
                    const checked = selectedOptions.includes(opt.id);
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
                            setSelectedOptions(prev =>
                              e.target.checked ? [...prev, opt.id] : prev.filter(id => id !== opt.id),
                            )
                          }
                          className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-foreground font-medium leading-relaxed">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQuestion.blanks && currentQuestion.blanks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground">Fill each blank:</h4>
                  {currentQuestion.blanks.map((b, idx) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border text-xs">
                      <span className="font-bold text-primary shrink-0">Blank {idx + 1}:</span>
                      {b.options && b.options.length > 0 ? (
                        <select
                          value={blankResponses[b.id] || ''}
                          onChange={e => setBlankResponses({ ...blankResponses, [b.id]: e.target.value })}
                          className="bg-card border border-border text-xs font-medium text-foreground px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                        >
                          <option value="">— Choose —</option>
                          {b.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={blankResponses[b.id] || ''}
                          onChange={e => setBlankResponses({ ...blankResponses, [b.id]: e.target.value })}
                          className="bg-card border border-border text-xs font-medium text-foreground px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                          placeholder="Type your answer"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={handleAskAITutor} className="gap-1.5 font-bold">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  <span>Ask AI Coach</span>
                </Button>

                {result ? (
                  <Button
                    onClick={() => {
                      resetAnswer();
                      const next = questions[questions.findIndex(q => q.id === currentQuestion.id) + 1];
                      if (next) setCurrentQuestion(next);
                    }}
                    size="default"
                    className="font-bold gap-1.5 shadow-md"
                  >
                    <span>Next question</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={submitting || !canSubmit}
                    size="default"
                    className="font-bold gap-1.5 shadow-md"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{grading === 'ai' ? 'Evaluating…' : 'Checking…'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Answer</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Navigator & result */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-5 space-y-3">
              <CardTitle className="text-sm">{selectedSkill.toUpperCase()} ({questions.length})</CardTitle>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentQuestion(q);
                      resetAnswer();
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      currentQuestion.id === q.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="font-bold truncate">{idx + 1}. {q.typeName}</div>
                    <div className="text-[10px] opacity-75 truncate">{q.difficulty}</div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Deterministic result */}
            {result?.attempt && (
              <Card className="border-primary/40 p-6 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.attempt.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                    <CardTitle className="text-base">
                      {result.attempt.isCorrect ? 'Correct' : 'Not quite'}
                    </CardTitle>
                  </div>
                  {result.xpAwarded > 0 && <Badge variant="warning">+{result.xpAwarded} XP</Badge>}
                </div>

                <div className="bg-background p-4 rounded-xl border border-border text-center space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Score</span>
                  <div className="font-display text-4xl font-black text-foreground">
                    {result.attempt.score}
                    <span className="text-xs text-muted-foreground font-bold"> / {result.attempt.maxScore}</span>
                  </div>
                  <p className="text-xs text-foreground pt-1">{result.attempt.feedback}</p>
                </div>

                {result.review?.explanation && (
                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Explanation</span>
                    <p className="text-[11px] text-foreground leading-relaxed">{result.review.explanation}</p>
                  </div>
                )}
              </Card>
            )}

            {/* AI evaluation result */}
            {result?.evaluation && (
              <Card className="border-primary/40 p-6 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <CardTitle className="text-base">Evaluation</CardTitle>
                  </div>
                  {result.xpAwarded > 0 && <Badge variant="warning">+{result.xpAwarded} XP</Badge>}
                </div>

                <div className="bg-background p-4 rounded-xl border border-border text-center space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Practice estimate</span>
                  <div className="font-display text-4xl font-black text-foreground">
                    {result.evaluation.estimatedScore ?? '—'}
                  </div>
                  <p className="text-xs text-foreground pt-1">{result.evaluation.summary}</p>
                </div>

                {result.evaluation.criteria.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Rubric</span>
                    {result.evaluation.criteria.map(c => (
                      <div key={c.name} className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
                        <div className="flex justify-between font-bold text-foreground">
                          <span>{c.name}</span>
                          <span className="text-primary">{c.score}/{c.maxScore}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{c.feedback}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20 bg-card rounded-2xl border border-border">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}

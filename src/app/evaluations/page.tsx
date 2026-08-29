'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Bot,
  RefreshCw,
  AlertCircle,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Evaluation, Question } from '@/lib/types';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { fixtureEvaluations, fixtureWritingQuestions, seed } from '@/lib/fixtures';

export default function EvaluationsPage() {
  const { activeExam, user, refreshUser } = useApp();
  const toast = useToast();

  const [questions, setQuestions] = useState<Question[]>(() =>
    seed(() => fixtureWritingQuestions(activeExam), []),
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    () => seed(() => fixtureWritingQuestions(activeExam)[0].id, ''),
  );
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [history, setHistory] = useState<Evaluation[]>(() => seed(fixtureEvaluations, []));
  const [unavailable, setUnavailable] = useState(false);

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId) ?? null;
  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  const subscription = user?.subscription;
  const quotaExhausted =
    subscription != null && subscription.dailyEvaluationsUsed >= subscription.dailyEvaluationsLimit;

  // Only writing has an evaluator endpoint, so only writing questions are offered.
  useEffect(() => {
    let cancelled = false;

    api
      .get<{ questions: Question[] }>('/questions', { exam: activeExam, skill: 'writing' })
      .then(data => {
        if (cancelled) return;
        const list = data.questions ?? [];
        setQuestions(list);
        setSelectedQuestionId(list[0]?.id ?? '');
      })
      .catch(err => !cancelled && toast.error('Could not load writing tasks', errorMessage(err)));

    api
      .get<{ evaluations: Evaluation[] }>('/evaluations', { limit: 5 })
      .then(data => !cancelled && setHistory(data.evaluations ?? []))
      .catch(() => !cancelled && setHistory([]));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam]);

  const handleEvaluate = async () => {
    if (!selectedQuestionId || !inputText.trim() || loading) return;
    setLoading(true);
    setUnavailable(false);

    try {
      const data = await api.post<{ evaluation: Evaluation }>('/evaluations/writing', {
        questionId: selectedQuestionId,
        text: inputText,
      });
      setResult(data.evaluation);
      setHistory(prev => [data.evaluation, ...prev].slice(0, 5));
      // The evaluation consumed part of today's quota and awarded XP.
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.isAIUnavailable) {
        setUnavailable(true);
        toast.error('Scoring is unavailable right now', errorMessage(err));
      } else if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily limit reached', errorMessage(err));
      } else {
        toast.error('Could not score your response', errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">AI Writing Evaluator</h1>
          <p className="text-xs text-muted-foreground">
            Pick a writing task, submit your response, and get rubric feedback from the model.
          </p>
        </div>

        {subscription && (
          <Badge variant={quotaExhausted ? 'destructive' : 'outline'} className="text-xs px-3 py-1">
            {subscription.dailyEvaluationsUsed} / {subscription.dailyEvaluationsLimit} used today
          </Badge>
        )}
      </div>

      {unavailable && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">The evaluator is not available right now.</p>
            <p className="leading-relaxed">
              The backend needs an <code className="font-mono">OPENROUTER_API_KEY</code> to reach the model.
              It deliberately returns an error rather than inventing a score. Your text is still here — retry once it&apos;s configured.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Writing task</label>
              {questions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No {activeExam} writing tasks in the question bank yet.
                </p>
              ) : (
                <select
                  value={selectedQuestionId}
                  onChange={e => {
                    setSelectedQuestionId(e.target.value);
                    setResult(null);
                  }}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
                >
                  {questions.map(q => (
                    <option key={q.id} value={q.id}>{q.typeName} — {q.title}</option>
                  ))}
                </select>
              )}
            </div>

            {selectedQuestion && (
              <div className="p-3.5 rounded-xl bg-background border border-border space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Prompt</span>
                <p className="text-xs text-foreground leading-relaxed">{selectedQuestion.prompt}</p>
                {selectedQuestion.contextPassage && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border">
                    {selectedQuestion.contextPassage}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-foreground">Your response</label>
                <Badge variant={wordCount >= 20 ? 'success' : 'outline'}>{wordCount} words</Badge>
              </div>
              <Textarea
                rows={12}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Write your full response here…"
              />
              <p className="text-[11px] text-muted-foreground">At least 20 words.</p>
            </div>

            <Button
              onClick={handleEvaluate}
              disabled={loading || wordCount < 20 || !selectedQuestionId || quotaExhausted}
              className="w-full font-bold text-xs shadow-md"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Evaluating…</span>
                </>
              ) : quotaExhausted ? (
                <span>Daily evaluation limit reached</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  <span>Run AI Evaluation</span>
                </>
              )}
            </Button>
          </Card>

          {/* Past evaluations */}
          {history.length > 0 && (
            <Card className="p-5 space-y-3">
              <CardTitle className="text-xs uppercase flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-muted-foreground" /> Recent evaluations
              </CardTitle>
              <div className="space-y-2">
                {history.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => setResult(ev)}
                    className="w-full text-left p-2.5 rounded-lg bg-background border border-border hover:border-primary/40 transition-colors text-xs"
                  >
                    <div className="flex justify-between font-bold text-foreground">
                      <span className="capitalize">{ev.skill}</span>
                      <span className="text-primary">{ev.estimatedScore ?? '—'}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {new Date(ev.createdAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          {!result ? (
            <Card className="p-8 text-center space-y-3 py-16">
              <Bot className="w-10 h-10 text-primary mx-auto" />
              <CardTitle className="text-sm">Your report will appear here</CardTitle>
              <CardDescription>Write a response and run the evaluation.</CardDescription>
            </Card>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Card className="p-5 text-center space-y-1 border-primary/40">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Practice estimate</span>
                <div className="font-display text-4xl font-black text-foreground">
                  {result.estimatedScore ?? '—'}
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">
                  {result.scoreConfidence} confidence
                </p>
                <p className="text-xs text-foreground pt-1 leading-relaxed">{result.summary}</p>
              </Card>

              {result.criteria.length > 0 && (
                <Card className="p-5 space-y-2.5">
                  <CardTitle className="text-xs uppercase">Rubric breakdown</CardTitle>
                  <div className="space-y-2">
                    {result.criteria.map(c => (
                      <div key={c.name} className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
                        <div className="flex justify-between font-bold text-foreground">
                          <span>{c.name}</span>
                          <span className="text-primary">{c.score}/{c.maxScore}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{c.feedback}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
                <Card className="p-5 space-y-3">
                  {result.strengths.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Strengths</span>
                      <ul className="space-y-1">
                        {result.strengths.map(s => (
                          <li key={s} className="text-[11px] text-foreground leading-relaxed">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.weaknesses.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">To work on</span>
                      <ul className="space-y-1">
                        {result.weaknesses.map(s => (
                          <li key={s} className="text-[11px] text-foreground leading-relaxed">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              {result.sentenceFeedback.length > 0 && (
                <Card className="p-5 space-y-2.5">
                  <CardTitle className="text-xs uppercase">Sentence notes</CardTitle>
                  {result.sentenceFeedback.map((s, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-background border border-border text-[11px] space-y-1">
                      <p className="text-rose-600 dark:text-rose-400 line-through">{s.original}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">{s.correction}</p>
                      <p className="text-muted-foreground">{s.explanation}</p>
                    </div>
                  ))}
                </Card>
              )}

              {result.modelRewrite && (
                <Card className="p-5 space-y-2 border-primary/20">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Model rewrite</span>
                  </div>
                  <p className="p-3 bg-background rounded-lg border border-border text-xs text-foreground leading-relaxed italic">
                    {result.modelRewrite}
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

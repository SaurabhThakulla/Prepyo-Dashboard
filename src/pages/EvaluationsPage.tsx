import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Bot,
  RefreshCw,
  AlertCircle,
  History,
  Check,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Evaluation, Question } from '@/lib/types';
import { writingWordTarget } from '@/lib/writing';
import { cn } from '@/lib/utils';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useEvaluationHistory, useQuestions } from '@/lib/hooks/useResources';
import { queryKeys } from '@/lib/queryKeys';
import { usagePercent } from '@/lib/subscriptions';
import { useQueryClient } from '@tanstack/react-query';
import { EvaluationsPageSkeleton } from '@/components/layout/PageSkeleton';
import QuestionFigure from '@/components/practice/QuestionFigure';

const HISTORY_LIMIT = 5;
/** How many tasks the picker lists at once; searching narrows the rest. */
const TASK_LIST_LIMIT = 60;

export default function EvaluationsPage() {
  const { activeExam, user, refreshUser } = useApp();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Only writing has an evaluator endpoint, so only writing questions are
  // offered. Same query key as the practice page uses for writing, so the two
  // pages share one request.
  const questionsQuery = useQuestions(activeExam, 'writing');
  const historyQuery = useEvaluationHistory(HISTORY_LIMIT);

  const questions = questionsQuery.data?.questions ?? [];
  const history = historyQuery.data?.evaluations ?? [];

  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // Default to the first task once the list arrives, without clobbering a
  // choice the learner has already made.
  useEffect(() => {
    if (!selectedQuestionId && questions.length > 0) setSelectedQuestionId(questions[0].id);
  }, [questions, selectedQuestionId]);

  useEffect(() => {
    if (questionsQuery.error) {
      toast.error('Could not load writing tasks', errorMessage(questionsQuery.error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsQuery.error]);

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId) ?? null;
  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  // What the task itself asks for, shown beside the count. Running the
  // evaluation still needs only 20 words.
  const wordTarget = selectedQuestion ? writingWordTarget(selectedQuestion) : null;

  // On a phone the report sits under the form, so it is brought into view
  // when it arrives. On a wide screen it is already beside the form.
  const reportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!result || window.matchMedia?.('(min-width: 1024px)').matches) return;
    reportRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [result]);
  const subscription = user?.subscription;
  const quotaExhausted =
    subscription != null && !subscription.unlimited && subscription.dailySubTestsUsed >= subscription.dailySubTestsLimit;

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

      // Push the new evaluation onto the cached history so it appears at once.
      queryClient.setQueryData(
        queryKeys.evaluations(HISTORY_LIMIT),
        (previous: { evaluations: Evaluation[] } | undefined) => ({
          evaluations: [data.evaluation, ...(previous?.evaluations ?? [])].slice(0, HISTORY_LIMIT),
        }),
      );

      // The evaluation consumed part of today's quota and awarded XP.
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.isAIUnavailable) {
        setUnavailable(true);
        toast.error(
          'Internet connection issue',
          'Your internet connection seems slow or disconnected. Your answer is preserved, and you can check your Mistake Bank to retry once your connection is restored.',
        );
      } else if (err instanceof ApiError && (err.code === 'network_error' || err.status === 0)) {
        toast.error(
          'Network connection error',
          'Could not reach the server due to a network interruption. Please check your connection or retry from your Mistake Bank later.',
        );
      } else if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily limit reached', errorMessage(err));
      } else {
        toast.error(
          'Internet connection issue',
          'Could not score your response due to a connection issue. You can check your Mistake Bank to retry once your connection is restored.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (questionsQuery.isPending) {
    return <EvaluationsPageSkeleton />;
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-10">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">AI Writing Evaluator</h1>
          <p className="text-xs text-muted-foreground">
            Pick a writing task, submit your response, and get rubric feedback from the model.
          </p>
        </div>

        {subscription && (
          <Badge variant={quotaExhausted ? 'destructive' : 'outline'} className="self-start sm:self-auto text-[11px] sm:text-xs px-3 py-1">
            {subscription.unlimited
              ? 'Unlimited sub-tests today'
              : `${usagePercent(subscription.dailySubTestsUsed, subscription.dailySubTestsLimit)}% of today's sub-tests used`}
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

      {/* Form, report, history: in that order down a phone. On a wide screen
          the report takes the right-hand column beside the other two. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        <Card className="lg:col-span-7 p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-foreground">Writing task</span>
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No {activeExam} writing tasks in the question bank yet.
              </p>
            ) : (
              <TaskPicker
                questions={questions}
                selected={selectedQuestion}
                onSelect={id => {
                  setSelectedQuestionId(id);
                  setResult(null);
                }}
              />
            )}
          </div>

          {selectedQuestion && (
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Prompt</span>
              <p className="text-[13px] sm:text-xs text-foreground leading-relaxed">{selectedQuestion.prompt}</p>
              {/* The figure a Task 1 answer describes. */}
              {selectedQuestion.imageUrl && (
                <QuestionFigure src={selectedQuestion.imageUrl} alt={selectedQuestion.title} />
              )}
              {selectedQuestion.contextPassage && (
                <p className="text-xs sm:text-[11px] text-muted-foreground leading-relaxed pt-1.5 border-t border-border">
                  {selectedQuestion.contextPassage}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="evaluation-response" className="font-bold text-foreground">Your response</label>
              <Badge variant={wordCount >= (wordTarget ?? 20) ? 'success' : 'outline'}>
                {wordTarget ? `${wordCount} / ${wordTarget} words` : `${wordCount} words`}
              </Badge>
            </div>
            <Textarea
              id="evaluation-response"
              rows={10}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Write your full response here…"
              // 16px on a phone: easier to read, and iOS does not zoom the page on focus.
              className="text-base sm:text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              {wordTarget
                ? `The task asks for at least ${wordTarget} words. You can run the evaluation from 20.`
                : 'At least 20 words.'}
            </p>
          </div>

          <Button
            onClick={handleEvaluate}
            disabled={loading || wordCount < 20 || !selectedQuestionId || quotaExhausted}
            className="h-12 w-full rounded-xl text-sm font-bold shadow-md sm:h-9 sm:rounded-lg sm:text-xs"
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

        <div
          ref={reportRef}
          className={cn('lg:col-span-5 lg:row-span-2 space-y-4 scroll-mt-20', !result && 'hidden lg:block')}
        >
          {!result ? (
            <Card className="p-8 text-center space-y-3 py-16">
              <Bot className="w-10 h-10 text-primary mx-auto" />
              <CardTitle className="text-sm">Your report will appear here</CardTitle>
              <CardDescription>Write a response and run the evaluation.</CardDescription>
            </Card>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Card className="p-4 sm:p-5 text-center space-y-1 border-primary/40">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Practice estimate</span>
                <div className="font-display text-4xl font-black text-foreground">
                  {result.estimatedScore ?? '—'}
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">
                  {result.scoreConfidence} confidence
                </p>
                <p className="text-[13px] sm:text-xs text-foreground pt-1 leading-relaxed">{result.summary}</p>
              </Card>

              {result.criteria.length > 0 && (
                <Card className="p-4 sm:p-5 space-y-2.5">
                  <CardTitle className="text-xs uppercase">Rubric breakdown</CardTitle>
                  <div className="space-y-2">
                    {result.criteria.map(c => (
                      <div key={c.name} className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
                        <div className="flex justify-between gap-3 font-bold text-foreground">
                          <span>{c.name}</span>
                          <span className="shrink-0 text-primary">{c.score}/{c.maxScore}</span>
                        </div>
                        <p className="text-xs sm:text-[11px] text-muted-foreground leading-relaxed">{c.feedback}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
                <Card className="p-4 sm:p-5 space-y-3">
                  {result.strengths.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Strengths</span>
                      <ul className="space-y-1">
                        {result.strengths.map(s => (
                          <li key={s} className="text-xs sm:text-[11px] text-foreground leading-relaxed">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.weaknesses.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">To work on</span>
                      <ul className="space-y-1">
                        {result.weaknesses.map(s => (
                          <li key={s} className="text-xs sm:text-[11px] text-foreground leading-relaxed">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              {result.sentenceFeedback.length > 0 && (
                <Card className="p-4 sm:p-5 space-y-2.5">
                  <CardTitle className="text-xs uppercase">Sentence notes</CardTitle>
                  {result.sentenceFeedback.map((s, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-background border border-border text-xs sm:text-[11px] space-y-1 break-words">
                      <p className="text-rose-600 dark:text-rose-400 line-through">{s.original}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">{s.correction}</p>
                      <p className="text-muted-foreground">{s.explanation}</p>
                    </div>
                  ))}
                </Card>
              )}

              {result.modelRewrite && (
                <Card className="p-4 sm:p-5 space-y-2 border-primary/20">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Model rewrite</span>
                  </div>
                  <p className="p-3 bg-background rounded-lg border border-border text-[13px] sm:text-xs text-foreground leading-relaxed italic">
                    {result.modelRewrite}
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <Card className="lg:col-span-7 p-4 sm:p-5 space-y-3">
            <CardTitle className="text-xs uppercase flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-muted-foreground" /> Recent evaluations
            </CardTitle>
            <div className="space-y-2">
              {history.map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setResult(ev)}
                  className={cn(
                    'flex w-full items-center gap-3 text-left p-3 rounded-xl bg-background border transition-colors text-xs [-webkit-tap-highlight-color:transparent]',
                    result?.id === ev.id ? 'border-primary/50' : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold capitalize text-foreground">{ev.skill}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {new Date(ev.createdAt).toLocaleString()}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-base font-black text-primary">{ev.estimatedScore ?? '—'}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Chooses the task to write on. The bank holds hundreds of them, which a plain
 * drop-down cannot show on a phone: this opens a list that can be searched and
 * narrowed to one task type.
 */
function TaskPicker({
  questions,
  selected,
  onSelect,
}: {
  questions: Question[];
  selected: Question | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const types = useMemo(() => [...new Set(questions.map(q => q.typeName))], [questions]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter(
      item =>
        (type === 'all' || item.typeName === type) &&
        (!q || item.title.toLowerCase().includes(q) || item.typeName.toLowerCase().includes(q)),
    );
  }, [questions, query, type]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-input bg-card px-3.5 py-3 text-left shadow-sm transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [-webkit-tap-highlight-color:transparent]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary">
            {selected?.typeName ?? 'No task chosen'}
          </span>
          <span className="mt-0.5 block text-sm font-semibold leading-snug text-foreground">
            {selected?.title ?? 'Choose a writing task'}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">Change</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          // Left alone, focus lands in the search box and a phone's keyboard
          // covers the list before the learner has seen it.
          onOpenAutoFocus={event => event.preventDefault()}
          className="flex max-w-lg flex-col gap-0 overflow-hidden p-0 max-sm:h-[85dvh] max-sm:pb-0 sm:max-h-[80vh] sm:p-0"
        >
          <div className="space-y-3 border-b border-border px-4 pb-3 sm:pt-5">
            <div className="pr-10">
              <DialogTitle className="text-base">Choose a writing task</DialogTitle>
              <DialogDescription>
                {matches.length} of {questions.length} tasks
              </DialogDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search by topic…"
                aria-label="Search writing tasks"
                className="h-11 rounded-xl pl-9 text-base sm:h-9 sm:text-xs"
              />
            </div>
            {types.length > 1 && (
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar">
                {['all', ...types].map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setType(name)}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      type === name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {name === 'all' ? 'All types' : name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {matches.slice(0, TASK_LIST_LIMIT).map(item => {
              const active = item.id === selected?.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors [-webkit-tap-highlight-color:transparent]',
                      active ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-primary/40',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-foreground">{item.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.typeName}</span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
            {matches.length === 0 && (
              <li className="px-3 py-8 text-center text-xs text-muted-foreground">No task matches that search.</li>
            )}
            {matches.length > TASK_LIST_LIMIT && (
              <li className="px-3 py-2 text-center text-[11px] text-muted-foreground">
                Showing the first {TASK_LIST_LIMIT}. Search or pick a type to narrow the list.
              </li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

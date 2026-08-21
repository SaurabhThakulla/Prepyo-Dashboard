'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Mistake, Pagination } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function MistakesPage() {
  const { activeExam, refreshUser } = useApp();
  const toast = useToast();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [activeReplayItem, setActiveReplayItem] = useState<Mistake | null>(null);
  const [replayAnswer, setReplayAnswer] = useState('');
  const [replaySuccess, setReplaySuccess] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get<{ mistakes: Mistake[]; pagination: Pagination }>('/mistakes', {
        exam: activeExam,
        skill: selectedSkill === 'all' ? undefined : selectedSkill,
        unresolved: unresolvedOnly ? 'true' : undefined,
      })
      .then(data => !cancelled && setMistakes(data.mistakes ?? []))
      .catch(err => {
        if (cancelled) return;
        setMistakes([]);
        toast.error('Could not load your mistake bank', errorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // toast is stable from context; excluding it keeps this from refetching on
    // every toast render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam, selectedSkill, unresolvedOnly]);

  const handleResolve = async (id: string) => {
    try {
      await api.post(`/mistakes/${id}/resolve`);
      setMistakes(prev => prev.map(m => (m.id === id ? { ...m, resolved: true } : m)));
      // XP is awarded server-side; pull the new total rather than guessing it.
      await refreshUser();
    } catch (err) {
      toast.error('Could not resolve that mistake', errorMessage(err));
    }
  };

  const handleCheckReplay = () => {
    if (!activeReplayItem) return;
    const isCorrect = replayAnswer.trim().toLowerCase() === activeReplayItem.correctResponse.trim().toLowerCase();
    setReplaySuccess(isCorrect);
    if (isCorrect) {
      handleResolve(activeReplayItem.id);
    }
  };

  // The API filters by skill, so these are the filters that actually work.
  const skillFilters = ['all', 'speaking', 'writing', 'reading', 'listening'];

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Mistake Bank & Spaced Review</h1>
          <p className="text-xs text-muted-foreground">
            Review errors made during practice tasks and replay them to achieve mastery.
          </p>
        </div>

        <Badge variant="outline" className="text-xs px-3 py-1">
          {mistakes.filter(m => !m.resolved).length} Unresolved Mistakes
        </Badge>
      </div>

      {/* Filter Tag Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {skillFilters.map(t => (
            <Button
              key={t}
              size="sm"
              variant={selectedSkill === t ? 'default' : 'ghost'}
              onClick={() => setSelectedSkill(t)}
              className="text-xs font-bold whitespace-nowrap h-8"
            >
              {t.toUpperCase()}
            </Button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={unresolvedOnly}
            onChange={(e) => setUnresolvedOnly(e.target.checked)}
            className="rounded bg-background border-border text-primary focus:ring-0"
          />
          <span>Show Unresolved Only</span>
        </label>
      </div>

      {/* Replay Modal */}
      {activeReplayItem && (
        <Card className="border-primary/40 p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <CardTitle className="text-sm">Replay: {activeReplayItem.questionTitle}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveReplayItem(null)} className="h-7 text-xs">
              Close ✕
            </Button>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed">
              {activeReplayItem.prompt}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Type the correct answer:</label>
              <Input
                value={replayAnswer}
                onChange={(e) => setReplayAnswer(e.target.value)}
                placeholder="Type the corrected answer..."
              />
            </div>

            {replaySuccess !== null && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                replaySuccess ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-destructive/20 text-rose-600 dark:text-rose-400 border border-destructive/30'
              }`}>
                {replaySuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Correct! Mistake resolved (+30 XP).</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Incorrect. Hint: &quot;{activeReplayItem.correctResponse}&quot;</span>
                  </>
                )}
              </div>
            )}

            <Button onClick={handleCheckReplay} size="sm" className="font-bold text-xs">
              Verify Answer
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      ) : mistakes.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-nepal-emerald mx-auto" />
          <CardTitle className="text-base">Nothing here</CardTitle>
          <CardDescription>
            Questions you get wrong in practice and mock exams are collected here automatically.
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-3">
          {mistakes.map(item => (
            <Card key={item.id} className={`p-5 space-y-3 ${item.resolved ? 'opacity-70 border-border/50' : 'hover:border-primary/40'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{item.typeName}</Badge>
                  <Badge variant="warning">{item.errorTag}</Badge>
                  {item.resolved && <Badge variant="success">Resolved</Badge>}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setActiveReplayItem(item); setReplayAnswer(''); setReplaySuccess(null); }}
                    className="font-bold text-xs gap-1.5 h-8"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay</span>
                  </Button>
                  {!item.resolved && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResolve(item.id)}
                      className="font-bold text-xs gap-1.5 h-8"
                    >
                      <Check className="w-3.5 h-3.5 text-nepal-emerald" />
                      <span>Resolve</span>
                    </Button>
                  )}
                </div>
              </div>

              <h4 className="font-display font-bold text-sm text-foreground">{item.questionTitle}</h4>
              <p className="text-xs text-muted-foreground bg-background p-3 rounded-xl border border-border leading-relaxed">
                {item.prompt}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Your Wrong Attempt:</span>
                  <div className="text-rose-700 dark:text-rose-200 font-semibold">{item.userResponse}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Correct Answer:</span>
                  <div className="text-emerald-700 dark:text-emerald-200 font-semibold">{item.correctResponse}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border text-xs text-muted-foreground space-y-1">
                <span className="text-[10px] font-bold text-foreground uppercase">Examiner Explanation:</span>
                <p className="leading-relaxed text-foreground">{item.explanation}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

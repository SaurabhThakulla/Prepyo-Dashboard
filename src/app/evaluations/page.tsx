'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  PenTool,
  Mic,
  Award,
  Sparkles,
  Bot,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AIEvaluationResult } from '@/lib/types';

export default function EvaluationsPage() {
  const { activeExam, awardLocalXP } = useApp();
  const [evalMode, setEvalMode] = useState<'writing' | 'speaking'>('writing');
  const [inputText, setInputText] = useState('');
  const [promptText, setPromptText] = useState(
    activeExam === 'PTE'
      ? 'Some people argue that technological automation will displace human labor completely. Discuss both views and give your opinion.'
      : 'In many nations, the proportion of elderly citizens is steadily increasing. Do the advantages of this demographic shift outweigh the disadvantages?'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIEvaluationResult | null>(null);

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;

  const handleEvaluate = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/v1/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: evalMode,
          exam: activeExam,
          skill: evalMode,
          typeId: evalMode === 'writing' ? (activeExam === 'PTE' ? 'write-essay' : 'ielts-writing-task2') : (activeExam === 'PTE' ? 'read-aloud' : 'ielts-speaking-part2'),
          prompt: promptText,
          userText: inputText,
          audioDurationSeconds: 32,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setResult(data.evaluation);
        awardLocalXP(50, `AI ${evalMode.toUpperCase()} Evaluation Completed`);
      }
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPTE = activeExam === 'PTE';

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">AI Rubric Evaluator Lab</h1>
          <p className="text-xs text-muted-foreground">
            Submit custom essays or spoken transcripts for instant examiner-level scoring and model rewrites.
          </p>
        </div>

        <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
          <Button
            size="sm"
            variant={evalMode === 'writing' ? 'default' : 'ghost'}
            onClick={() => setEvalMode('writing')}
            className="font-bold text-xs gap-1.5"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Writing Evaluation</span>
          </Button>
          <Button
            size="sm"
            variant={evalMode === 'speaking' ? 'default' : 'ghost'}
            onClick={() => setEvalMode('speaking')}
            className="font-bold text-xs gap-1.5"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Speaking Acoustic</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Exam Prompt / Topic</label>
              <Input value={promptText} onChange={(e) => setPromptText(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-foreground">
                  {evalMode === 'writing' ? 'Your Essay / Report Draft' : 'Spoken Response Transcript'}
                </label>
                <Badge variant="outline">{wordCount} Words</Badge>
              </div>
              <Textarea
                rows={12}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste or write your full response here..."
              />
            </div>

            <Button onClick={handleEvaluate} disabled={loading || !inputText.trim()} className="w-full font-bold text-xs shadow-md">
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Analyzing with Prepyo AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  <span>Run Complete AI Evaluation</span>
                </>
              )}
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {!result ? (
            <Card className="p-8 text-center space-y-3 py-16">
              <Bot className="w-10 h-10 text-primary mx-auto" />
              <CardTitle className="text-sm">Evaluation Report Will Appear Here</CardTitle>
              <CardDescription>Enter your draft and click Run AI Evaluation.</CardDescription>
            </Card>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Card className="p-5 text-center space-y-1 border-primary/40">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Practice Estimate</span>
                <div className="font-display text-4xl font-black text-foreground">
                  {result.estimatedScore} <span className="text-xs text-muted-foreground font-bold">/ {isPTE ? '90' : '9.0'}</span>
                </div>
                <p className="text-xs text-foreground pt-1 leading-relaxed">{result.summary}</p>
              </Card>

              <Card className="p-5 space-y-2.5">
                <CardTitle className="text-xs uppercase">Rubric Performance Breakdown</CardTitle>
                <div className="space-y-2">
                  {result.criteria.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
                      <div className="flex justify-between font-bold text-foreground">
                        <span>{c.name}</span>
                        <span className="text-primary">{c.score}/{c.maxScore}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{c.feedback}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {result.modelRewrite && (
                <Card className="p-5 space-y-2 border-primary/20">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Band 8.0+ / PTE 79+ Model Sample</span>
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

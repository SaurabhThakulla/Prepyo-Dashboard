'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Activity,
  Plus,
  RefreshCw,
  Sparkles,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function AdminPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Question State
  const [exam, setExam] = useState<'PTE' | 'IELTS'>('PTE');
  const [skill, setSkill] = useState<'speaking' | 'writing' | 'reading' | 'listening'>('writing');
  const [typeId, setTypeId] = useState('write-essay');
  const [typeName, setTypeName] = useState('Write Essay');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/v1/admin')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMetrics(data.metrics);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreateQuestion = async () => {
    if (!title || !prompt || creating) return;
    setCreating(true);
    setSuccess(false);

    try {
      const payload = {
        exam,
        skill,
        typeId,
        typeName,
        title,
        prompt,
        modelAnswer,
        timeLimitSeconds: 1200,
        difficulty: 'medium',
        points: 20,
        tags: [exam, typeName],
      };

      const res = await fetch('/api/v1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTitle('');
        setPrompt('');
        setModelAnswer('');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Admin CMS & AI Observability</h1>
            <Badge variant="destructive">Internal Portal</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Monitor AI token expenditure, evaluate gateway latencies, and inject curriculum items.</p>
        </div>
      </div>

      {/* Observability KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Total Questions</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="font-display text-3xl font-black text-foreground">{metrics?.totalQuestions || 24}</div>
          <p className="text-[10px] text-muted-foreground">PTE & IELTS Curated Items</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>AI Token Invocations</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-display text-3xl font-black text-amber-500">
            {metrics?.totalTokensUsed?.toLocaleString() || '5,400'}
          </div>
          <p className="text-[10px] text-muted-foreground">Across LLM Evaluators</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Estimated Token Cost</span>
            <Zap className="w-4 h-4 text-nepal-emerald" />
          </div>
          <div className="font-display text-3xl font-black text-nepal-emerald">
            NPR {metrics?.totalAICostNPR || '34.50'}
          </div>
          <p className="text-[10px] text-muted-foreground">Unit Cost: ~NPR 1.85 / Essay</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>AI Gateway Latency</span>
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="font-display text-3xl font-black text-foreground">
            {metrics?.averageLatencyMs || 450} <span className="text-xs text-muted-foreground font-bold">ms</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Healthy P95 Latency</p>
        </Card>
      </div>

      {/* Curriculum Injection Form */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Plus className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Inject Curriculum Question to Live Bank</CardTitle>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Exam</label>
            <select
              value={exam}
              onChange={(e) => setExam(e.target.value as any)}
              className="w-full h-9 rounded-xl border border-input bg-card px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="PTE">PTE Academic</option>
              <option value="IELTS">IELTS Academic</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Skill</label>
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value as any)}
              className="w-full h-9 rounded-xl border border-input bg-card px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Task Type</label>
            <Input value={typeName} onChange={(e) => { setTypeName(e.target.value); setTypeId(e.target.value.toLowerCase().replace(/\s+/g, '-')); }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Question Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Urban Green Spaces and Mental Health" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Prompt Instructions</label>
          <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Full test taker prompt..." />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Model Answer / Benchmark</label>
          <Textarea rows={3} value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} placeholder="Exemplary 90/90 or Band 9 answer..." />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          {success ? (
            <span className="text-xs text-emerald-400 font-bold">Question published directly to repository!</span>
          ) : <span />}

          <Button onClick={handleCreateQuestion} disabled={creating || !title || !prompt} size="sm" className="font-bold text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>{creating ? 'Publishing...' : 'Publish Question'}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

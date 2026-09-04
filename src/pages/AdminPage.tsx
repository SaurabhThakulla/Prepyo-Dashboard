import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Activity,
  RefreshCw,
  Sparkles,
  Bot,
  Users,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { api, ApiError, errorMessage } from '@/lib/api';

interface AdminMetrics {
  questions: number;
  mocks: number;
  learners: number;
  activeLast7Days: number;
  practiceAttempts: number;
  mockAttempts: number;
  evaluations: number;
  evaluationsToday: number;
  promptTokens: number;
  completionTokens: number;
  medianLatencyMs: number;
}

interface ModelUsage {
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [usageByModel, setUsageByModel] = useState<ModelUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ metrics: AdminMetrics; usageByModel: ModelUsage[] }>('/admin/metrics')
      .then(data => {
        if (cancelled) return;
        setMetrics(data.metrics);
        setUsageByModel(data.usageByModel ?? []);
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(errorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <Card className="p-12 text-center space-y-3 max-w-lg mx-auto">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <CardTitle className="text-base">Admin access only</CardTitle>
        <CardDescription>
          This area is limited to accounts with the admin role.
        </CardDescription>
        <Button asChild variant="outline" size="sm" className="font-bold text-xs">
          <Link to="/dashboard">Back to home</Link>
        </Button>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="p-12 text-center space-y-3 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <CardTitle className="text-base">Could not load metrics</CardTitle>
        <CardDescription>{error}</CardDescription>
      </Card>
    );
  }

  const totalTokens = metrics.promptTokens + metrics.completionTokens;

  const cards = [
    {
      label: 'Published questions',
      value: metrics.questions.toLocaleString(),
      note: `${metrics.mocks} mock exam${metrics.mocks === 1 ? '' : 's'}`,
      icon: Activity,
      color: 'text-primary',
    },
    {
      label: 'Learners',
      value: metrics.learners.toLocaleString(),
      note: `${metrics.activeLast7Days} active in last 7 days`,
      icon: Users,
      color: 'text-foreground',
    },
    {
      label: 'AI tokens used',
      value: totalTokens.toLocaleString(),
      note: `${metrics.promptTokens.toLocaleString()} prompt / ${metrics.completionTokens.toLocaleString()} completion`,
      icon: Sparkles,
      color: 'text-amber-500',
    },
    {
      label: 'Median AI latency',
      value: `${metrics.medianLatencyMs} ms`,
      note: `${metrics.evaluations} evaluation${metrics.evaluations === 1 ? '' : 's'} recorded`,
      icon: Bot,
      color: 'text-indigo-400',
    },
  ];

  return (
    <div className="space-y-6">

      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Observability</h1>
            <Badge variant="destructive">Internal</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Live counts straight from the database. Everything here is measured, nothing is estimated.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, note, icon: Icon, color }) => (
          <Card key={label} className="p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`font-display text-3xl font-black ${color}`}>{value}</div>
            <p className="text-[10px] text-muted-foreground">{note}</p>
          </Card>
        ))}
      </div>

      {/* Activity */}
      <Card className="p-6 space-y-4">
        <CardTitle className="text-base">Learner activity</CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Practice attempts', value: metrics.practiceAttempts },
            { label: 'Mock attempts', value: metrics.mockAttempts },
            { label: 'Evaluations (all time)', value: metrics.evaluations },
            { label: 'Evaluations today', value: metrics.evaluationsToday },
          ].map(item => (
            <div key={item.label} className="p-3.5 rounded-xl bg-background border border-border text-center space-y-1">
              <div className="font-display text-xl font-black text-foreground">{item.value.toLocaleString()}</div>
              <span className="text-[10px] text-muted-foreground font-semibold">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Usage by model */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Usage by model</CardTitle>
        </div>
        {usageByModel.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No AI evaluations have run yet, so there is nothing to report.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {usageByModel.map(row => (
              <div key={row.model} className="flex items-center justify-between py-2.5 text-xs">
                <span className="font-mono font-bold text-foreground">{row.model}</span>
                <div className="flex gap-6 text-right">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Requests</span>
                    <span className="font-bold text-foreground">{row.requests}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Tokens</span>
                    <span className="font-bold text-primary">
                      {(row.promptTokens + row.completionTokens).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* The question bank is seeded through migrations; there is no write API. */}
      <Card className="p-6 space-y-2">
        <CardTitle className="text-base">Question bank</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Questions are managed through database migrations in{' '}
          <code className="font-mono">backend/migrations</code>, not through this page. The API exposes no
          endpoint for creating questions, so there is no authoring form here yet.
        </CardDescription>
      </Card>
    </div>
  );
}

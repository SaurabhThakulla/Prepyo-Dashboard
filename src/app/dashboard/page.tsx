'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  TrendingUp,
  Target,
  Flame,
  Sparkles,
  Zap,
  ArrowRight,
  AlertTriangle,
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Award,
  Calendar,
  Clock,
  Bot,
  Play,
  RotateCcw,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function DashboardPage() {
  const { user, activeExam, setIsTutorOpen } = useApp();

  const isPTE = activeExam === 'PTE';
  const targetScore = user?.targetScore || (isPTE ? 79 : 7.5);
  const estimatedScore = user?.estimatedScore || (isPTE ? 68 : 6.5);
  const targetGap = Math.max(0, targetScore - estimatedScore);
  const readiness = user?.readinessPercentage || 72;

  return (
    <div className="space-y-5">

      {/* ── STACK 1: Top Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-bold text-foreground">
              Namaste, {user?.name || 'Learner'} 👋
            </h1>
            <Badge variant="indigo">{activeExam} Candidate</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isPTE
              ? 'Aiming for PTE 79+ · Australia / UK / Canada'
              : 'Targeting IELTS Band 7.5+ · Global University Admissions'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-background px-3 py-1.5 rounded-xl border border-border text-right">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary" /> Exam Date
            </div>
            <div className="text-xs font-bold text-foreground">{user?.examDate || 'Oct 15, 2026'}</div>
          </div>
          <Button asChild size="sm" className="font-bold gap-1.5 shadow-md shadow-primary/20">
            <Link href="/practice">
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Practice</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── STACK 2: 4 KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Target vs Estimate */}
        <Card className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" /> Target Gap
            </span>
            <Badge variant={targetGap === 0 ? 'success' : 'warning'} className="text-[9px]">
              {targetGap === 0 ? 'Met!' : `${targetGap} pts`}
            </Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-black text-foreground">{estimatedScore}</span>
            <span className="text-xs text-muted-foreground">/ {targetScore}</span>
          </div>
          <Progress value={Math.min(100, Math.round((estimatedScore / targetScore) * 100))} />
          <p className="text-[10px] text-muted-foreground">Based on recent practice & diagnostic results.</p>
        </Card>

        {/* Exam Readiness */}
        <Card className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> Readiness
            </span>
            <Badge variant={readiness >= 75 ? 'success' : 'outline'} className="text-[9px]">
              {readiness >= 75 ? 'Ready' : 'In Progress'}
            </Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-black text-emerald-400">{readiness}%</span>
            <span className="text-xs text-muted-foreground">/ 100%</span>
          </div>
          <Progress value={readiness} indicatorClassName="bg-emerald-400" />
          <p className="text-[10px] text-muted-foreground">Complete 1 more mock to reach 80% readiness.</p>
        </Card>

        {/* Daily Streak */}
        <Card className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Streak
            </span>
            <Badge variant="warning" className="text-[9px]">Active 🔥</Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-black text-amber-400">{user?.streakDays || 6}</span>
            <span className="text-xs text-muted-foreground">Days</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <div
                key={idx}
                className={`flex-1 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                  idx <= 5 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-background text-muted-foreground border border-border'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Practice today for your 7-day milestone!</p>
        </Card>

        {/* Nepal Rank */}
        <Card className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" /> Nepal Rank
            </span>
            <Badge variant="indigo" className="text-[9px]">{user?.nepalRegion || 'Kathmandu'}</Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-black text-foreground">#4</span>
            <span className="text-xs text-muted-foreground">District · Level {user?.level || 5}</span>
          </div>
          <Progress value={((user?.xp || 1450) % 400) / 4} />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{user?.xp || 1450} XP earned</span>
            <Link href="/leaderboard" className="text-primary hover:underline font-semibold">Board ➔</Link>
          </div>
        </Card>
      </div>

      {/* ── STACK 3: Quick Launch + Weak Skill ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Quick Practice Launchers (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-foreground">Practice Studio</h2>
            <Button asChild variant="link" className="text-xs font-bold text-primary p-0 h-auto">
              <Link href="/practice">View All Tasks ➔</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/practice?skill=speaking', icon: Mic, color: 'text-indigo-400', bg: 'bg-indigo-500/10', label: 'Speaking', sub: isPTE ? 'Read Aloud / DI' : 'Part 1–3' },
              { href: '/practice?skill=writing', icon: PenTool, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Writing', sub: isPTE ? 'Essay / Summary' : 'Task 1 & 2' },
              { href: '/practice?skill=reading', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Reading', sub: isPTE ? 'FIB R&W' : 'Passages' },
              { href: '/practice?skill=listening', icon: Headphones, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Listening', sub: isPTE ? 'Dictation' : 'Section 1–4' },
            ].map(({ href, icon: Icon, color, bg, label, sub }) => (
              <Link
                key={label}
                href={href}
                className="rounded-xl border border-border bg-card p-4 flex flex-col items-center text-center gap-2 hover:border-primary/50 hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">{label}</div>
                  <div className="text-[10px] text-muted-foreground">{sub}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Action Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/diagnostic"
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:border-primary/50 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Diagnostic Test</div>
                <div className="text-[10px] text-muted-foreground">15-min adaptive test</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
            </Link>

            <Link
              href="/mocks"
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:border-primary/50 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Full Mock Exam</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 2 Hours
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
            </Link>

            <Link
              href="/mistakes"
              className="rounded-xl border border-amber-500/30 bg-card p-4 flex items-center gap-3 hover:border-amber-500/60 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Mistake Bank</div>
                <div className="text-[10px] text-amber-400 font-semibold">3 Pending</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
            </Link>
          </div>
        </div>

        {/* Priority Weak Skill (1 col) */}
        <Card className="p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-destructive/10 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm">Priority Weak Skill</CardTitle>
                <CardDescription className="text-[11px]">From recent performance</CardDescription>
              </div>
            </div>

            <div className="bg-background p-3.5 rounded-xl border border-destructive/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400">
                  {isPTE ? 'PTE Summarize Written Text' : 'IELTS Writing Task 2 Cohesion'}
                </span>
                <Badge variant="destructive" className="text-[9px]">{isPTE ? '68/90' : '6.5/9.0'}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isPTE
                  ? 'Your single-sentence grammar constraint was broken. Keep sentences under 75 words.'
                  : 'Paragraph transitions need more academic discourse markers.'}
              </p>
            </div>

            <div className="p-3 bg-background rounded-xl border border-border flex items-center justify-between">
              <span className="text-xs text-foreground font-medium">
                {isPTE ? 'Practice 2 Writing Summaries' : 'Write 2 Task 2 Responses'}
              </span>
              <Link href="/practice?skill=writing" className="text-xs font-bold text-primary hover:underline">
                Start ➔
              </Link>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTutorOpen(true)}
            className="w-full gap-1.5 font-bold text-xs border-primary/30 text-primary"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask AI Coach for Strategy</span>
          </Button>
        </Card>
      </div>

      {/* ── STACK 4: AI Evaluator CTA ── */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">Try AI Evaluator Lab</div>
            <div className="text-xs text-muted-foreground">Submit a writing or speaking response. Get instant sentence-level feedback.</div>
          </div>
        </div>
        <Button asChild size="sm" className="font-bold gap-1.5 shrink-0">
          <Link href="/evaluations">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Open Evaluator</span>
          </Link>
        </Button>
      </div>

    </div>
  );
}

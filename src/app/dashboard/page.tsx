'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Award,
  Calendar,
  Clock,
  ChevronRight,
  Bot,
  Play,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DailyMission } from '@/lib/types';

export default function DashboardPage() {
  const { user, activeExam, setIsTutorOpen, awardLocalXP } = useApp();
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);

  useEffect(() => {
    fetch('/api/v1/gamification')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.dailyMissions) {
          setMissions(data.dailyMissions);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingMissions(false));
  }, []);

  const handleClaimMission = async (missionId: string, xpReward: number) => {
    try {
      const res = await fetch('/api/v1/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete-mission', missionId }),
      });
      const data = await res.json();
      if (data.success) {
        setMissions(prev => prev.map(m => m.id === missionId ? { ...m, completed: true, completedCount: m.targetCount } : m));
        awardLocalXP(xpReward, 'Daily Mission Reward Claimed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isPTE = activeExam === 'PTE';
  const targetScore = user?.targetScore || (isPTE ? 79 : 7.5);
  const estimatedScore = user?.estimatedScore || (isPTE ? 68 : 6.5);
  const targetGap = Math.max(0, targetScore - estimatedScore);
  const readiness = user?.readinessPercentage || 72;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">
              Namaste, {user?.name || 'Learner'} 👋
            </h1>
            <Badge variant="indigo">{activeExam} Candidate</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isPTE
              ? 'Aiming for PTE 79+ for Australia / UK / Canada Visa qualification.'
              : 'Targeting IELTS Band 7.5+ for Global University Admissions.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-background px-4 py-2 rounded-xl border border-border text-right">
            <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary" /> Exam Date
            </div>
            <div className="text-xs font-bold text-white">
              {user?.examDate || 'Oct 15, 2026'}
            </div>
          </div>
          <Button asChild size="default" className="font-bold gap-1.5 shadow-md shadow-primary/20">
            <Link href="/practice">
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Practice</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Target Gap Card */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" /> Target vs Estimate
            </span>
            <Badge variant="outline" className="text-[9px]">Practice Estimate</Badge>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="font-display text-3xl font-black text-white">{estimatedScore}</span>
              <span className="text-xs font-bold text-muted-foreground"> / {targetScore}</span>
            </div>
            <Badge variant="warning">{targetGap === 0 ? 'Target Met!' : `${targetGap} Gap`}</Badge>
          </div>
          <Progress value={Math.min(100, Math.round((estimatedScore / targetScore) * 100))} />
          <p className="text-[10px] text-muted-foreground">
            Based on recent practice tasks and diagnostic results.
          </p>
        </Card>

        {/* 2. Readiness Card */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-nepal-emerald" /> Exam Readiness
            </span>
            <Badge variant="success">{readiness >= 75 ? 'Ready' : 'In Progress'}</Badge>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-display text-3xl font-black text-nepal-emerald">{readiness}%</span>
            <span className="text-xs text-muted-foreground">Goal: 85%+</span>
          </div>
          <Progress value={readiness} indicatorClassName="bg-nepal-emerald" />
          <p className="text-[10px] text-muted-foreground">
            Complete 1 more full mock exam to reach 80% readiness.
          </p>
        </Card>

        {/* 3. Streak Card */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" /> Daily Habit
            </span>
            <Badge variant="warning">Active</Badge>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div className="flex items-center gap-1">
              <span className="font-display text-3xl font-black text-amber-400">{user?.streakDays || 6}</span>
              <span className="text-xs font-bold text-muted-foreground">Days</span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {user?.streakFrozen ? '🛡️ Freeze Active' : '🔥 Fire On'}
            </span>
          </div>
          <div className="flex justify-between items-center gap-1 pt-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <div
                key={idx}
                className={`flex-1 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  idx <= 5 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-background text-muted-foreground border border-border'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Practice today to hit your 7-day streak milestone!
          </p>
        </Card>

        {/* 4. Nepal Rank Card */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary" /> Nepal Rank
            </span>
            <Badge variant="indigo">{user?.nepalRegion || 'Kathmandu'}</Badge>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="font-display text-3xl font-black text-white">#4</span>
              <span className="text-xs text-muted-foreground ml-1">District</span>
            </div>
            <Badge variant="secondary">Level {user?.level || 5}</Badge>
          </div>
          <Progress value={((user?.xp || 1450) % 400) / 4} />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{user?.xp || 1450} XP earned</span>
            <Link href="/leaderboard" className="text-primary hover:underline font-semibold">
              View Board ➔
            </Link>
          </div>
        </Card>
      </div>

      {/* Middle Grid: Today's Mission & Weak Skill */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Mission (2 Cols) */}
        <Card className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base">Today’s Study Mission</CardTitle>
                <CardDescription>Daily exercises to build continuous score progression</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {missions.filter(m => m.completed).length} / {missions.length} Done
            </Badge>
          </div>

          <div className="space-y-2.5 pt-1">
            {missions.map(mission => (
              <div
                key={mission.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  mission.completed
                    ? 'bg-background/40 border-border opacity-70'
                    : 'bg-card border-border hover:border-primary/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {mission.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-nepal-emerald shrink-0" />
                    ) : (
                      <span className="flex h-2 w-2 rounded-full bg-primary" />
                    )}
                    <h4 className="text-xs font-bold text-white">{mission.title}</h4>
                    <Badge variant="warning" className="text-[9px] px-1 py-0">+{mission.xpReward} XP</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">{mission.description}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {mission.completed ? (
                    <Badge variant="success" className="text-xs">Completed</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleClaimMission(mission.id, mission.xpReward)}
                      className="font-bold text-xs"
                    >
                      <span>Complete & Claim</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Priority Weak Skill Card (1 Col) */}
        <Card className="p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-destructive/10 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base">Priority Weak Skill</CardTitle>
                <CardDescription>Identified from recent performance</CardDescription>
              </div>
            </div>

            <div className="bg-background p-4 rounded-xl border border-destructive/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400">
                  {isPTE ? 'PTE Summarize Written Text' : 'IELTS Writing Task 2 Cohesion'}
                </span>
                <Badge variant="destructive">{isPTE ? '68/90' : '6.5/9.0'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isPTE
                  ? 'Your single-sentence grammar constraint was broken. Keep sentences strictly under 75 words.'
                  : 'Paragraph transitions and topic sentences need more academic discourse markers.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Recommended Drill:</span>
              <div className="p-3 bg-background rounded-xl border border-border flex items-center justify-between">
                <span className="text-xs text-slate-200 font-medium">Practice 2 Writing Summaries</span>
                <Link href="/practice?skill=writing" className="text-xs font-bold text-primary hover:underline">
                  Start Drill ➔
                </Link>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTutorOpen(true)}
            className="w-full gap-1.5 font-bold text-xs border-primary/30 text-primary"
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI Coach for Strategy</span>
          </Button>
        </Card>
      </div>

      {/* 4 Communicative Skills Quick Launcher */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Interactive Practice Studio</h3>
            <p className="text-xs text-muted-foreground">Select a skill to begin timed practice</p>
          </div>
          <Button asChild variant="link" className="text-xs font-bold text-primary p-0">
            <Link href="/practice">View All Tasks ➔</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 hover:border-primary/50 transition-all">
            <Link href="/practice?skill=speaking" className="space-y-2 block">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Mic className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="text-[9px]">{isPTE ? 'Read Aloud' : 'Cue Card'}</Badge>
              </div>
              <h4 className="font-display font-bold text-sm text-white">Speaking Studio</h4>
              <p className="text-xs text-muted-foreground">Mic recorder & oral fluency scoring.</p>
            </Link>
          </Card>

          <Card className="p-4 hover:border-primary/50 transition-all">
            <Link href="/practice?skill=writing" className="space-y-2 block">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <PenTool className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="text-[9px]">{isPTE ? 'Essay' : 'Task 2'}</Badge>
              </div>
              <h4 className="font-display font-bold text-sm text-white">Writing Lab</h4>
              <p className="text-xs text-muted-foreground">Draft editor & sentence rewrites.</p>
            </Link>
          </Card>

          <Card className="p-4 hover:border-primary/50 transition-all">
            <Link href="/practice?skill=reading" className="space-y-2 block">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="text-[9px]">{isPTE ? 'FIB R&W' : 'Passages'}</Badge>
              </div>
              <h4 className="font-display font-bold text-sm text-white">Reading Precision</h4>
              <p className="text-xs text-muted-foreground">Collocation blanks & sequencing.</p>
            </Link>
          </Card>

          <Card className="p-4 hover:border-primary/50 transition-all">
            <Link href="/practice?skill=listening" className="space-y-2 block">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Headphones className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="text-[9px]">{isPTE ? 'Dictation' : 'Section 1-4'}</Badge>
              </div>
              <h4 className="font-display font-bold text-sm text-white">Listening Engine</h4>
              <p className="text-xs text-muted-foreground">Audio playback & dictation drills.</p>
            </Link>
          </Card>
        </div>
      </div>

      {/* Bottom Hub Cards: Full Mock Launcher & Mistake Bank Replay */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* Full Mock Exam Launcher */}
        <Card className="p-6 space-y-4 border-primary/30 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="indigo">Official Simulation</Badge>
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 2 Hours
              </span>
            </div>
            <h4 className="font-display font-bold text-lg text-white">
              {isPTE ? 'PTE Academic Full Mock Exam #1' : 'IELTS Academic Full Mock #1'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Experience the pressure of real test timing, question sequences, and receive an instant examiner score breakdown.
            </p>
          </div>
          <Button asChild className="w-full font-bold text-xs gap-1.5 shadow-md">
            <Link href="/mocks">
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Launch Mock Exam Simulator</span>
            </Link>
          </Button>
        </Card>

        {/* Mistake Bank Quick Replay */}
        <Card className="p-6 space-y-4 border-amber-500/30 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="warning">Spaced Repetition</Badge>
              <span className="text-xs text-rose-400 font-bold">3 Pending Errors</span>
            </div>
            <h4 className="font-display font-bold text-lg text-white">
              Mistake Bank Replay Drill
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Review and retry failed vocabulary, spelling, and sentence summary questions to reinforce your memory.
            </p>
          </div>
          <Button asChild variant="secondary" className="w-full font-bold text-xs gap-1.5">
            <Link href="/mistakes">
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Open Mistake Bank (Replay Mode)</span>
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}

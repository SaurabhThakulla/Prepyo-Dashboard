'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  ArrowRight,
  Check,
  TrendingUp,
  Users,
  Award,
  ChevronDown,
  User,
  Zap,
  X,
  Bot,
  BarChart3,
  FileText,
  Star,
  CheckCircle2,
  PlayCircle,
  Target,
  Flame,
  BookOpen,
  Globe2,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { activeExam } = useApp();

  return (
    <div className="w-full max-w-[80vw] mx-auto transition-colors duration-200">

      {/* ─── HERO SECTION ─── */}
      <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-between pt-6 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center w-full py-8 sm:py-12">

          {/* Left Column */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>AI-POWERED EXAM PREP</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[4rem] font-extrabold tracking-[-0.03em] text-foreground leading-[1.08]">
              Know your <span className="text-primary">real score</span> <br />
              before the real test.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
              Prepare for PTE, IELTS &amp; Duolingo with AI practice and exam simulations so accurate, your mock score mirrors your actual result. Plus a Personal AI Tutor and AI Pre-CAS Interview to take you all the way to your offer.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
                <Users className="w-4 h-4 text-primary" />
                <span>10,000+ learners</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>98% score improvement</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>AI-powered feedback</span>
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button asChild size="lg" className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm px-8 h-12 shadow-md hover:-translate-y-0.5 transition-all">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                  <span>Start your free mock test</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl font-bold text-sm px-8 h-12 hover:-translate-y-0.5 transition-all">
                <Link href="/subscription" className="flex items-center gap-2.5">
                  <span>View Plans (NPR)</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Score Report Card */}
          <div className="relative flex justify-center py-6">
            <div className="animate-float absolute -top-2 right-4 sm:right-8 z-20 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-hero">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>AI-scored in seconds</span>
            </div>

            <div className="animate-float-delay absolute -bottom-3 left-4 sm:left-8 z-20 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-card px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-hero">
              <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
              <span>Matched real result</span>
            </div>

            <div className="w-full max-w-[400px] rounded-[28px] bg-card border border-border p-5 shadow-hero transform-gpu md:rotate-[3deg] transition-all hover:rotate-0 duration-300 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-display text-base font-bold text-foreground">Score Report</h3>
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="rounded-[20px] bg-primary p-4 text-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-base font-extrabold">
                    A
                  </div>
                  <div>
                    <div className="font-bold text-sm">Aprapya Rana</div>
                    <div className="text-[10px] text-white/80">aprapya.r@example.com · Mock Test-1</div>
                    <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                      TUE, 28 APR 2026
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/15 px-3 py-2 text-center">
                  <span className="block text-[8px] font-bold uppercase tracking-wider text-white/80">OVERALL SCORE</span>
                  <span className="font-display text-2xl font-black leading-tight">78</span>
                  <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full bg-white rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                {[
                  { name: 'Speaking', score: 78, pct: 86 },
                  { name: 'Writing', score: 82, pct: 91 },
                  { name: 'Reading', score: 75, pct: 83 },
                  { name: 'Listening', score: 80, pct: 88 },
                ].map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="relative mx-auto h-14 w-14 flex items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted" strokeWidth="3.5" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          className="stroke-primary" strokeWidth="3.5"
                          strokeDasharray="94.2"
                          strokeDashoffset={94.2 - (94.2 * item.pct) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-xs font-black text-foreground leading-none">{item.score}</span>
                        <span className="text-[7px] text-muted-foreground font-semibold uppercase">Score</span>
                      </div>
                    </div>
                    <span className="block text-[10px] font-semibold text-foreground">{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-1">
                <span className="block text-xs font-bold text-foreground px-1">Analytics</span>
                {[
                  { label: 'Individual Performance', sub: 'Breakdown of recent task results' },
                  { label: 'Skill Profile', sub: 'Sectional score distribution' },
                  { label: 'Video Lessons', sub: 'Recommended learning material' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl bg-muted/50 p-3 hover:bg-muted transition-colors cursor-pointer border border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{row.label}</div>
                        <div className="text-[10px] text-muted-foreground">{row.sub}</div>
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Marquee */}
        <div className="w-full overflow-hidden pt-4 pb-2 border-t border-border">
          <div className="flex items-center justify-between gap-4 text-xs font-bold text-foreground overflow-x-auto no-scrollbar py-2">
            {[
              { icon: Zap, label: 'Authentic Exam Experience' },
              { icon: Zap, label: 'AI Powered Evaluation' },
              { icon: Zap, label: 'Real-Time Performance Insights' },
              { icon: Zap, label: 'Live & Recorded Classes' },
              { icon: Zap, label: 'Smart Study Plans' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm shrink-0">
                <Icon className="w-4 h-4 text-amber-500" />
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── FEATURE HIGHLIGHTS ─── */}
      <section className="py-20 border-t border-border">
        <div className="text-center space-y-3 mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Everything you need
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground">
            One platform. All four skills.
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Prepyo covers every task type in PTE Academic and IELTS Academic — backed by real exam blueprints and an AI engine trained on thousands of scored responses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: BarChart3,
              color: 'text-primary',
              bg: 'bg-primary/10',
              title: 'AI Full Mock Exams',
              description: 'Replicate the exact PTE / IELTS experience — same timing, question types, and interface. Get an instant examiner-level score breakdown the moment you finish.',
              bullets: ['5 Full-length PTE Academic Mocks', 'IELTS Academic Sections 1–4', 'Instant skill-band breakdown', 'Predicted score with confidence interval'],
            },
            {
              icon: Bot,
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
              title: 'AI Evaluation Engine',
              description: 'Submit a Writing Task or Speaking response and receive sentence-by-sentence feedback — grammar, cohesion, vocabulary, and pronunciation — in under 10 seconds.',
              bullets: ['30 Speaking & Writing evals/day (Pro)', 'Sentence-level error rewrites', 'IELTS & PTE scoring rubrics', 'Vocabulary upgrade suggestions'],
            },
            {
              icon: Sparkles,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
              title: 'Personal AI Tutor',
              description: 'Ask Prepyo AI Coach anything — from "how do I improve my fluency?" to "explain PTE Summarize Written Text constraints." Available 24/7, context-aware.',
              bullets: ['Adaptive coaching strategy', 'Exam-specific drill recommendations', 'Mistake Bank analysis', 'Pre-CAS interview prep (coming soon)'],
            },
          ].map(({ icon: Icon, color, bg, title, description, bullets }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 space-y-4 hover:border-primary/40 transition-all hover:-translate-y-1 duration-200">
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
              </div>
              <ul className="space-y-1.5">
                {bullets.map(b => (
                  <li key={b} className="flex items-center gap-2 text-xs text-foreground font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 border-t border-border">
        <div className="text-center space-y-3 mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <Target className="w-3.5 h-3.5 text-amber-500" /> Simple process
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground">
            From zero to target score in 4 steps
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-12 left-[calc(12.5%+1.5rem)] right-[calc(12.5%+1.5rem)] h-px bg-border z-0" />

          {[
            {
              step: '01',
              icon: FileText,
              color: 'text-primary',
              bg: 'bg-primary/10',
              title: 'Take the Diagnostic',
              desc: 'A fast 15-min adaptive test identifies your current level and exact weak points across all 4 skills.',
            },
            {
              step: '02',
              icon: BookOpen,
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
              title: 'Targeted Practice',
              desc: 'Work through skill-specific tasks with AI feedback after each response. Build consistency daily.',
            },
            {
              step: '03',
              icon: PlayCircle,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
              title: 'Run Full Mock Exams',
              desc: 'Simulate the real exam under timed conditions. AI scores each section instantly after submission.',
            },
            {
              step: '04',
              icon: TrendingUp,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              title: 'Hit Your Target Score',
              desc: 'Track score progression, fix mistake patterns, and walk into exam day with full confidence.',
            },
          ].map(({ step, icon: Icon, color, bg, title, desc }) => (
            <div key={step} className="relative z-10 text-center space-y-4 flex flex-col items-center">
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center border border-border shadow-sm`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-foreground text-background text-[9px] font-black flex items-center justify-center">
                  {step.replace('0', '')}
                </span>
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[180px] mx-auto">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STATS BAND ─── */}
      <section className="py-12 border-t border-b border-border my-4 bg-card rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center px-8">
          {[
            { value: '10,000+', label: 'Active Learners', icon: Users, color: 'text-primary' },
            { value: '98%', label: 'Score Improvement Rate', icon: TrendingUp, color: 'text-amber-500' },
            { value: '50,000+', label: 'AI Evaluations Done', icon: Sparkles, color: 'text-purple-400' },
            { value: '4.9★', label: 'Student Satisfaction', icon: Star, color: 'text-emerald-400' },
          ].map(({ value, label, icon: Icon, color }) => (
            <div key={label} className="space-y-2">
              <Icon className={`w-6 h-6 mx-auto ${color}`} />
              <div className="font-display text-3xl font-black text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-20 border-t border-border">
        <div className="text-center space-y-3 mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <Star className="w-3.5 h-3.5 text-amber-500" /> Student stories
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground">
            Real scores. Real Nepali students.
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Thousands of students from Kathmandu to Pokhara are hitting their visa and university targets with Prepyo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Aprapya Rana',
              region: 'Kathmandu',
              exam: 'PTE Academic',
              before: 62,
              after: 79,
              quote: 'The AI gave me feedback on every single sentence of my writing. I went from 62 to 79 in just 6 weeks. Prepyo literally got me my Australia visa.',
              initials: 'AR',
            },
            {
              name: 'Sanjay Shrestha',
              region: 'Pokhara',
              exam: 'IELTS Academic',
              before: 6.0,
              after: 7.5,
              quote: "The mock exams felt exactly like the real thing. When I sat for IELTS I wasn't nervous at all. I already knew how I would score. Ended up with 7.5 — exactly what I needed for my UK Masters.",
              initials: 'SS',
            },
            {
              name: 'Priya Adhikari',
              region: 'Lalitpur',
              exam: 'PTE Academic',
              before: 55,
              after: 83,
              quote: 'I tried 3 other platforms. Prepyo is the only one that told me WHY my answers were wrong, not just that they were. The AI tutor is like having a personal coach on call.',
              initials: 'PA',
            },
          ].map(({ name, region, exam, before, after, quote, initials }) => (
            <div key={name} className="rounded-2xl border border-border bg-card p-6 space-y-4 hover:border-primary/30 transition-all">
              {/* Stars */}
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-sm text-foreground leading-relaxed italic">"{quote}"</p>

              {/* Score pill */}
              <div className="flex items-center gap-2">
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-lg font-mono font-bold">{before}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-mono font-bold">{after}</span>
                <span className="text-[10px] text-muted-foreground">{exam}</span>
              </div>

              <div className="flex items-center gap-2.5 pt-1 border-t border-border">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black text-xs">
                  {initials}
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">{name}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Globe2 className="w-3 h-3" /> {region}, Nepal
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TRUST BADGES ─── */}
      <section className="py-12 border-t border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, color: 'text-primary', bg: 'bg-primary/10', title: 'Secure Nepal Payments', desc: 'Pay via eSewa, Khalti, or Fonepay. No international credit card. Instant activation.' },
            { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', title: '24/7 AI Coach Access', desc: 'No waiting for a teacher. Ask Prepyo AI Coach any question at any hour — in Nepali or English.' },
            { icon: Flame, color: 'text-rose-400', bg: 'bg-rose-500/10', title: 'Daily Streak System', desc: 'Build consistent study habits with daily missions, XP rewards, and streak milestones.' },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA BANNER ─── */}
      <section className="py-16 border-t border-border">
        <div className="rounded-3xl bg-primary p-10 sm:p-14 text-white text-center space-y-6 relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Free to start
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-black">
              Ready to hit your target score?
            </h2>
            <p className="text-sm text-white/80 max-w-md mx-auto leading-relaxed">
              Join 10,000+ Nepali students preparing smarter with AI. No credit card required. Start your free diagnostic today.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Button asChild size="lg" className="rounded-2xl bg-white text-primary hover:bg-white/90 font-extrabold text-sm px-8 h-12 shadow-md hover:-translate-y-0.5 transition-all">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <span>Start Free — No Card Needed</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="rounded-2xl text-white hover:bg-white/10 font-bold text-sm px-6 h-12">
              <Link href="/subscription">
                See Pricing →
              </Link>
            </Button>
          </div>

          <p className="relative z-10 text-[11px] text-white/60">
            Free tier includes 3 AI evaluations/day · 1 Full Mock Exam · Mistake Bank tracking
          </p>
        </div>
      </section>

      {/* Bottom Spacer */}
      <div className="pb-8" />
    </div>
  );
}

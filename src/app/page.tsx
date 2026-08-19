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
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { activeExam } = useApp();

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-between pt-6 pb-2 w-full max-w-[80vw] mx-auto transition-colors duration-200">
      
      {/* Main Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center w-full py-8 sm:py-12">
        
        {/* Left Column: Hero Copy & CTA */}
        <div className="space-y-6 text-center lg:text-left">
          
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>AI-POWERED EXAM PREP</span>
          </div>

          {/* Main Headline (Solid Colors, No Gradients) */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[4rem] font-extrabold tracking-[-0.03em] text-foreground leading-[1.08]">
            Know your <span className="text-primary">real score</span> <br />
            before the real test.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
            Prepare for PTE, IELTS &amp; Duolingo with AI practice and exam simulations so accurate, your mock score mirrors your actual result. Plus a Personal AI Tutor and AI Pre-CAS Interview to take you all the way to your offer.
          </p>

          {/* 3 Social Proof Pills */}
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

          {/* Primary CTA Button */}
          <div className="pt-2 flex justify-center lg:justify-start">
            <Button asChild size="lg" className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm px-8 h-12 shadow-md hover:-translate-y-0.5 transition-all">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <span>Start your free mock test</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Right Column: Tilted Interactive Score Report Card */}
        <div className="relative flex justify-center py-6">
          
          {/* Top Floating Badge */}
          <div className="animate-float absolute -top-2 right-4 sm:right-8 z-20 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-hero">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI-scored in seconds</span>
          </div>

          {/* Bottom Floating Badge */}
          <div className="animate-float-delay absolute -bottom-3 left-4 sm:left-8 z-20 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-card px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-hero">
            <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
            <span>Matched real result</span>
          </div>

          {/* Solid Score Report Card */}
          <div className="w-full max-w-[400px] rounded-[28px] bg-card border border-border p-5 shadow-hero transform-gpu md:rotate-[3deg] transition-all hover:rotate-0 duration-300 space-y-4">
            
            {/* Card Header */}
            <div className="flex items-center justify-between px-1">
              <h3 className="font-display text-base font-bold text-foreground">Score Report</h3>
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Student Score Header Banner (Solid Navy/Green, No Gradients) */}
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

            {/* 4 Circular Skill Gauges */}
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
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        className="stroke-muted"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        className="stroke-primary"
                        strokeWidth="3.5"
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

            {/* Analytics Accordion Items */}
            <div className="space-y-2 pt-1">
              <span className="block text-xs font-bold text-foreground px-1">Analytics</span>
              
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 hover:bg-muted transition-colors cursor-pointer border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Individual Performance</div>
                    <div className="text-[10px] text-muted-foreground">Breakdown of recent task results</div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 hover:bg-muted transition-colors cursor-pointer border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Skill Profile</div>
                    <div className="text-[10px] text-muted-foreground">Sectional score distribution</div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 hover:bg-muted transition-colors cursor-pointer border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Video Lessons</div>
                    <div className="text-[10px] text-muted-foreground">Recommended learning material</div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Pill Marquee */}
      <div className="w-full overflow-hidden pt-4 pb-2 border-t border-border">
        <div className="flex items-center justify-between gap-4 text-xs font-bold text-foreground overflow-x-auto no-scrollbar py-2">
          
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm shrink-0">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Authentic Exam Experience</span>
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm shrink-0">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>AI Powered Evaluation</span>
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm shrink-0">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Real-Time Performance Insights</span>
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm shrink-0">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Live &amp; Recorded Classes</span>
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm shrink-0">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Smart Study Plans</span>
          </span>
        </div>
      </div>
    </div>
  );
}

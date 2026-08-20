'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ArrowRight, Check, TrendingUp, Users, ShieldCheck, Zap, Bot, Star, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HIGHLIGHTS = [
  { icon: Users, iconClass: 'text-primary', label: '10,000+ Nepali Students' },
  { icon: TrendingUp, iconClass: 'text-amber-500', label: '98% Score Improvement' },
  { icon: Sparkles, iconClass: 'text-purple-400', label: 'Instant AI Evaluation' },
  { icon: ShieldCheck, iconClass: 'text-emerald-500', label: 'Real Exam Rubrics' },
];

export default function Hero() {
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <section className="relative flex flex-col justify-between pt-4 pb-12">
      {/* Background ambient radial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center w-full py-6 sm:py-10">
        
        {/* Copy and calls to action (7 cols) */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-wide text-primary shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>🇳🇵 Nepal's #1 AI-Powered PTE & IELTS Prep</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.8rem] font-extrabold tracking-[-0.03em] text-foreground leading-[1.08]">
            Know your <span className="text-primary bg-gradient-to-r from-primary via-emerald-400 to-teal-400 bg-clip-text text-transparent">real score</span> before the real test.
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
            Master PTE Academic and IELTS with full-length simulation mocks, instant sentence-level AI writing & speaking evaluation, and personalized 24/7 coaching tailored for Nepali test takers.
          </p>

          {/* Value Highlights Chips */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
            {HIGHLIGHTS.map(({ icon: Icon, iconClass, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm"
              >
                <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
                <span>{label}</span>
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start">
            <Button
              asChild
              size="lg"
              className="rounded-2xl font-extrabold text-sm px-8 h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            >
              <Link href="/signup" className="flex items-center gap-2.5">
                <span>Start Free Mock Test</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-2xl font-bold text-sm px-7 h-12 border-border hover:bg-card hover:-translate-y-0.5 transition-all"
            >
              <a href="/#pricing" onClick={(e) => handleScrollTo(e, 'pricing')}>
                Explore Plans (NPR)
              </a>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="lg"
              className="rounded-2xl font-bold text-sm px-5 h-12 text-muted-foreground hover:text-foreground"
            >
              <a href="/#how-it-works" onClick={(e) => handleScrollTo(e, 'how-it-works')} className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 fill-current text-primary" />
                <span>How It Works</span>
              </a>
            </Button>
          </div>

          {/* Trust rating badge */}
          <div className="pt-2 flex items-center justify-center lg:justify-start gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <span className="font-semibold text-foreground">4.9/5 Rating</span>
            <span className="text-border">|</span>
            <span>Accepted for Australia, UK & Canada Visas</span>
          </div>
        </div>

        {/* Hero Visual Mockup (5 cols) */}
        <div className="lg:col-span-5 relative flex justify-center py-4">
          
          {/* Floating AI Feedback Badge */}
          <div className="animate-float absolute -top-4 right-2 sm:right-6 z-20 flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-foreground shadow-xl">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-foreground">AI Scored in 3s</div>
              <div className="text-[10px] text-muted-foreground font-normal">PTE 79+ / IELTS 8.0 Band</div>
            </div>
          </div>

          {/* Floating Matched Result Badge */}
          <div className="animate-float-delay absolute -bottom-4 left-2 sm:left-4 z-20 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-xl">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <div className="text-foreground">Pearson & IELTS Aligned</div>
              <div className="text-[10px] text-muted-foreground font-normal">99.4% Scoring Correlation</div>
            </div>
          </div>

          {/* Product Image Frame */}
          <div className="relative w-full rounded-3xl overflow-hidden border border-border/80 bg-card shadow-2xl transition-all duration-300 hover:shadow-primary/10 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
            <img
              src="/images/hero-showcase.jpg"
              alt="Prepyo AI Exam Prep Interface & Dashboard"
              className="w-full h-auto object-cover rounded-3xl transform transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        </div>

      </div>
    </section>
  );
}

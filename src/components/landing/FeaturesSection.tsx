'use client';

import React from 'react';
import { Sparkles, Bot, BarChart3, CheckCircle2, ShieldCheck, Flame, Zap, Award } from 'lucide-react';
import SectionHeading from './SectionHeading';

const FEATURES = [
  {
    icon: BarChart3,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    title: 'Full Mock Simulations',
    description:
      'The exact timing, question sequencing, and UI as the real Pearson PTE and British Council / IDP IELTS test centers.',
    bullets: [
      'Full-length PTE Academic & Core mocks',
      'IELTS Academic & General sections',
      'Instant AI sub-skill score breakdown',
      'Precise score prediction with confidence band',
    ],
  },
  {
    icon: Bot,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    title: 'AI Sentence-Level Rubrics',
    description:
      'Submit essay or spoken responses and get instant, sentence-by-sentence rewrites, grammar analysis, and vocabulary upgrades.',
    bullets: [
      'Detailed grammar & lexical error detection',
      'Band 8.0 / PTE 79+ rewrite suggestions',
      'Speaking pronunciation and fluency feedback',
      'Aligned to official Pearson & IELTS marking scales',
    ],
  },
  {
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    title: '24/7 AI Personal Coach',
    description:
      'Stuck on Summarize Spoken Text or True/False/Not Given? Ask your AI tutor anytime for custom drill advice and strategy.',
    bullets: [
      'Context-aware question hints & strategies',
      'Mistake bank remediation drills',
      'Exam-specific templates and tips',
      'Unlimited instant answers round the clock',
    ],
  },
  {
    icon: Flame,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    title: 'Mistake Bank & Habit Streaks',
    description:
      'Every question you miss is automatically filed into your personal Mistake Bank until you master it and clear the flaw.',
    bullets: [
      'Categorized by Grammar, Spelling, Collocations',
      'Spaced repetition retry schedule',
      'Daily study streak multipliers',
      'Nepal regional XP leaderboards',
    ],
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 border-t border-border">
      <SectionHeading
        eyebrow="AI Capabilities"
        eyebrowIcon={Sparkles}
        title="Everything you need to hit your target score"
        description="Built specifically for Nepali students preparing for Australian, UK, Canadian, and USA study and migration visas."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map(({ icon: Icon, color, bg, border, title, description, bullets }) => (
          <div
            key={title}
            className={`rounded-2xl border ${border} bg-card/80 backdrop-blur-sm p-6 space-y-4 hover:border-primary/40 hover:shadow-lg transition-all hover:-translate-y-1 duration-200 flex flex-col justify-between`}
          >
            <div className="space-y-4">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
              </div>
            </div>

            <ul className="space-y-2 pt-4 border-t border-border/60">
              {bullets.map(bullet => (
                <li key={bullet} className="flex items-start gap-2 text-xs text-foreground font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

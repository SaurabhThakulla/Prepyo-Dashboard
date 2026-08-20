'use client';

import React from 'react';
import { Target, FileText, BookOpen, PlayCircle, TrendingUp } from 'lucide-react';
import SectionHeading from './SectionHeading';

const STEPS = [
  {
    icon: FileText,
    color: 'text-primary',
    bg: 'bg-primary/10',
    title: '1. Take Free Diagnostic Mock',
    desc: 'Complete a quick baseline mock across all four skills (Speaking, Writing, Reading, Listening) to benchmark your starting score.',
  },
  {
    icon: BookOpen,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    title: '2. Targeted AI Drills',
    desc: 'Target your exact weak areas with instant sentence-level feedback, native pronunciation waveforms, and daily habit missions.',
  },
  {
    icon: PlayCircle,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    title: '3. Full Mock Under Time',
    desc: 'Experience the real exam pressure with realistic timers, official score scales, and automated instant report generation.',
  },
  {
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    title: '4. Hit 79+ / Band 8.0',
    desc: 'Clear out all items in your Mistake Bank, verify your predicted score confidence, and sit the official exam with 100% confidence.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 border-t border-border">
      <SectionHeading
        eyebrow="Step-by-Step Path"
        eyebrowIcon={Target}
        eyebrowIconClass="text-amber-500"
        title="Your roadmap from baseline to dream score"
        description="A structured, data-driven preparation flow designed to maximize score improvements in minimal time."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {/* Connector line, desktop only */}
        <div
          className="hidden lg:block absolute top-12 left-[calc(12.5%+1.5rem)] right-[calc(12.5%+1.5rem)] h-px bg-border z-0"
          aria-hidden="true"
        />

        {STEPS.map(({ icon: Icon, color, bg, title, desc }, index) => (
          <div key={title} className="relative z-10 text-center space-y-4 flex flex-col items-center">
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center border border-border shadow-sm`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background text-[10px] font-black flex items-center justify-center shadow">
                {index + 1}
              </span>
            </div>

            <div>
              <h3 className="font-display font-bold text-base text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-[220px] mx-auto">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

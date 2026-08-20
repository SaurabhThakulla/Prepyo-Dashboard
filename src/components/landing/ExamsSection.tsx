'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, ArrowRight, GraduationCap } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { ExamType } from '@/lib/types';
import SectionHeading from './SectionHeading';

interface ExamCard {
  exam: ExamType;
  name: string;
  targetLabel: string;
  scaleLabel: string;
  description: string;
  skills: string[];
  accent: string;
  accentBg: string;
}

const EXAMS: ExamCard[] = [
  {
    exam: 'PTE',
    name: 'PTE Academic',
    targetLabel: '79+',
    scaleLabel: 'Scored 10 – 90',
    description:
      'Computer-based, AI-scored, and accepted for Australian, New Zealand and UK visas. Results usually arrive within 48 hours.',
    skills: ['Read Aloud & Repeat Sentence', 'Summarize Written Text', 'Re-order Paragraphs', 'Write from Dictation'],
    accent: 'text-primary',
    accentBg: 'bg-primary/10',
  },
  {
    exam: 'IELTS',
    name: 'IELTS Academic',
    targetLabel: 'Band 8.0',
    scaleLabel: 'Scored 0 – 9 in half bands',
    description:
      'The most widely accepted English test for universities and immigration across the UK, Canada, Australia and Europe.',
    skills: ['Writing Task 1 & Task 2', 'True / False / Not Given', 'Matching Headings', 'Speaking Parts 1 – 3'],
    accent: 'text-amber-500',
    accentBg: 'bg-amber-500/10',
  },
];

/**
 * The "Products" entry in the nav, as a section on the page.
 *
 * Picking an exam here sets it as the active exam, so the rest of the site
 * (practice, mocks, dashboard) opens on the one the visitor chose.
 */
export default function ExamsSection() {
  const { activeExam, setActiveExam } = useApp();

  return (
    <section id="products" className="py-20 border-t border-border">
      <SectionHeading
        eyebrow="Products"
        eyebrowIcon={GraduationCap}
        title="Choose your exam"
        description="One engine, two exams. Every task type, timing rule and scoring scale is configured per exam, so practice matches the test you are actually sitting."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {EXAMS.map(({ exam, name, targetLabel, scaleLabel, description, skills, accent, accentBg }) => {
          const isActive = activeExam === exam;

          return (
            <div
              key={exam}
              className={`rounded-2xl border bg-card p-6 space-y-5 transition-all hover:-translate-y-1 duration-200 ${
                isActive ? 'border-primary/50 shadow-card' : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${accentBg} flex items-center justify-center`}>
                    <BookOpen className={`w-5 h-5 ${accent}`} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">{name}</h3>
                    <p className="text-[11px] text-muted-foreground">{scaleLabel}</p>
                  </div>
                </div>

                <span className={`rounded-full ${accentBg} ${accent} px-3 py-1 text-xs font-black font-mono shrink-0`}>
                  {targetLabel}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {skills.map(skill => (
                  <li key={skill} className="flex items-center gap-2 text-xs text-foreground font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {skill}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={() => setActiveExam(exam)}
                  variant={isActive ? 'outline' : 'default'}
                  size="sm"
                  className="rounded-xl font-bold text-xs h-9 px-4"
                >
                  {isActive ? 'Selected' : `Prepare for ${exam}`}
                </Button>

                <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold text-xs h-9 px-3">
                  <Link href="/diagnostic" className="flex items-center gap-1.5">
                    Free diagnostic
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

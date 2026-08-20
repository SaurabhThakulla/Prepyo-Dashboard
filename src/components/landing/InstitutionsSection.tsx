'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Users, BarChart3, FileSpreadsheet, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionHeading from './SectionHeading';

const CAPABILITIES = [
  {
    icon: Users,
    title: 'Class rosters',
    desc: 'Enrol a batch, assign target scores and see who has practised this week.',
  },
  {
    icon: BarChart3,
    title: 'Cohort analytics',
    desc: 'Score trends by skill across a whole class, not one learner at a time.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Question management',
    desc: 'Publish your own tasks alongside the shared bank, versioned per exam.',
  },
];

/**
 * The "Industrial Login" entry in the nav, as a section on the page.
 *
 * The consultancy-facing tooling is not built yet, so this describes what the
 * admin area covers today and sends people to the existing login rather than
 * advertising features that do not exist.
 */
export default function InstitutionsSection() {
  return (
    <section id="institutions" className="py-20 border-t border-border">
      <SectionHeading
        eyebrow="For institutes"
        eyebrowIcon={Building2}
        title="Running a language institute?"
        description="Consultancies and test-prep centres in Nepal use Prepyo to give every student mock exams and AI feedback without hiring another examiner."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-6 items-stretch">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">Institute access</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Already partnered with us? Sign in to the admin console for content management and usage reporting.
            </p>
          </div>

          <div className="space-y-2">
            <Button asChild className="w-full rounded-xl font-bold text-xs h-10">
              <Link href="/admin" className="flex items-center justify-center gap-2">
                Institute login
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              Not a partner yet? Email{' '}
              <a href="mailto:institutes@prepyo.np" className="font-semibold text-primary hover:underline">
                institutes@prepyo.np
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { Star, ArrowRight, Globe2, Quote } from 'lucide-react';
import SectionHeading from './SectionHeading';

const TESTIMONIALS = [
  {
    name: 'Aprapya Rana',
    region: 'Kathmandu',
    exam: 'PTE Academic',
    target: 'Australia PR / Master of IT',
    before: 62,
    after: 79,
    quote:
      'The AI gave me feedback on every single sentence of my essay and speech. I went from 62 to 79 in just 6 weeks, which secured the 20 immigration points I needed for Australia.',
    initials: 'AR',
    verified: 'Verified PTE 79+ Achiever',
  },
  {
    name: 'Sanjay Shrestha',
    region: 'Pokhara',
    exam: 'IELTS Academic',
    target: 'UK Masters in Data Science',
    before: 6.0,
    after: 7.5,
    quote:
      'The mock test interface is 100% identical to the actual exam environment. The speaking simulator relieved all my test anxiety. Landed a 7.5 overall with 8.0 in Reading!',
    initials: 'SS',
    verified: 'Verified IELTS 7.5 Achiever',
  },
  {
    name: 'Priya Adhikari',
    region: 'Lalitpur',
    exam: 'PTE Academic',
    target: 'Canada Study Permit',
    before: 55,
    after: 83,
    quote:
      'I tried physical coaching in Putalisadak and two other websites. Prepyo is the only platform that explained WHY my answers were flawed and how to rewrite them at Band 8+ standard.',
    initials: 'PA',
    verified: 'Verified PTE 83 Achiever',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 border-t border-border">
      <SectionHeading
        eyebrow="Student Stories"
        eyebrowIcon={Star}
        eyebrowIconClass="text-amber-500"
        title="Real Nepali students. Real score jumps."
        description="Over 10,000 students from Kathmandu, Pokhara, Chitwan, and beyond have achieved their dream visa scores with Prepyo."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map(({ name, region, exam, target, before, after, quote, initials, verified }) => (
          <figure
            key={name}
            className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 space-y-4 hover:border-primary/40 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1" aria-label="Rated 5 out of 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" aria-hidden="true" />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {verified}
                </span>
              </div>

              <blockquote className="text-xs sm:text-sm text-foreground leading-relaxed italic">
                "{quote}"
              </blockquote>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono font-bold">
                    Start: {before}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded font-mono font-black">
                    Score: {after}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-foreground">{exam}</span>
              </div>

              <figcaption className="flex items-center gap-3 pt-2 border-t border-border/60">
                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black text-xs shrink-0">
                  {initials}
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">{name}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Globe2 className="w-3 h-3 text-primary" /> {region}, Nepal · <span className="truncate">{target}</span>
                  </div>
                </div>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

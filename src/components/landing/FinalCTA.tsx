import React from 'react';
import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinalCTA() {
  return (
    <section className="py-16 border-t border-border">
      <div className="rounded-3xl bg-primary p-10 sm:p-14 text-white text-center space-y-6 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" /> Free to start
          </span>

          <h2 className="font-display text-3xl sm:text-4xl font-black">Ready to find out where you stand?</h2>

          <p className="text-sm text-white/80 max-w-md mx-auto leading-relaxed">
            Take the free diagnostic and get your first score estimate today. No card required.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Button
            asChild
            size="lg"
            className="rounded-2xl bg-white text-primary hover:bg-white/90 font-extrabold text-sm px-8 h-12 shadow-md hover:-translate-y-0.5 transition-all"
          >
            <Link href="/diagnostic" className="flex items-center gap-2.5">
              <span>Start free diagnostic</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="lg"
            className="rounded-2xl text-white hover:bg-white/10 hover:text-white font-bold text-sm px-6 h-12"
          >
            <Link href="#pricing">See pricing</Link>
          </Button>
        </div>

        <p className="relative z-10 text-[11px] text-white/60">
          Free tier includes 3 AI evaluations a day, 1 full mock exam and mistake bank tracking.
        </p>
      </div>
    </section>
  );
}

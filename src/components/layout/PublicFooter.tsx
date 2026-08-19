'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Heart } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="w-full border-t border-border bg-card py-6 mt-12 transition-colors">
      <div className="max-w-[80vw] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">
            P
          </div>
          <span className="font-display font-bold text-foreground text-sm">Prepyo</span>
          <span>© 2026 Prepyo Nepal. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/practice" className="hover:text-foreground transition-colors">Practice</Link>
          <Link href="/mocks" className="hover:text-foreground transition-colors">Mock Exams</Link>
          <Link href="/subscription" className="hover:text-foreground transition-colors">Pricing (NPR)</Link>
        </div>

        <div className="flex items-center gap-1">
          <span>Crafted for Nepali Students</span>
          <Heart className="w-3 h-3 text-nepal-crimson fill-nepal-crimson" />
        </div>
      </div>
    </footer>
  );
}

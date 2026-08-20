'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Globe2, Sparkles, ShieldCheck } from 'lucide-react';

export default function PublicFooter() {
  const pathname = usePathname();

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${id}`);
      }
    }
  };

  return (
    <footer className="w-full border-t border-border bg-card/80 backdrop-blur-md py-10 mt-16 transition-colors">
      <div className="w-full lg:max-w-[80vw] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold shadow-sm">
                P
              </div>
              <span className="font-display font-extrabold text-foreground text-lg">
                prep<span className="text-primary">yo</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI-powered PTE Academic & IELTS preparation platform crafted specifically for Nepali test takers.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <span>Made with pride for Nepal</span>
              <Heart className="w-3 h-3 text-nepal-crimson fill-nepal-crimson" />
            </div>
          </div>

          {/* Quick Landing Sections */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Explore</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <a href="/#products" onClick={(e) => handleScrollTo(e, 'products')} className="hover:text-primary transition-colors">
                  PTE & IELTS Exams
                </a>
              </li>
              <li>
                <a href="/#features" onClick={(e) => handleScrollTo(e, 'features')} className="hover:text-primary transition-colors">
                  AI Evaluation Features
                </a>
              </li>
              <li>
                <a href="/#how-it-works" onClick={(e) => handleScrollTo(e, 'how-it-works')} className="hover:text-primary transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#pricing" onClick={(e) => handleScrollTo(e, 'pricing')} className="hover:text-primary transition-colors">
                  Pricing Plans (NPR)
                </a>
              </li>
            </ul>
          </div>

          {/* Platform & Community */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Platform</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <a href="/#testimonials" onClick={(e) => handleScrollTo(e, 'testimonials')} className="hover:text-primary transition-colors">
                  Student Success Stories
                </a>
              </li>
              <li>
                <a href="/#institutions" onClick={(e) => handleScrollTo(e, 'institutions')} className="hover:text-primary transition-colors">
                  Consultancies & Institutes
                </a>
              </li>
              <li>
                <a href="/#faq" onClick={(e) => handleScrollTo(e, 'faq')} className="hover:text-primary transition-colors">
                  FAQ & Support
                </a>
              </li>
              <li>
                <Link href="/admin" className="hover:text-primary transition-colors">
                  Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Started & Login */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Account</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-primary transition-colors font-medium">
                  Learner Login
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary transition-colors font-medium text-primary">
                  Create Free Account (+100 XP)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary transition-colors">
                  Student Dashboard
                </Link>
              </li>
              <li>
                <Link href="/diagnostic" className="hover:text-primary transition-colors">
                  Free Diagnostic Mock
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground">
          <div>© 2026 Prepyo Nepal. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>Payment via eSewa / Khalti / Fonepay</span>
            <span>·</span>
            <span>Pearson PTE & IELTS Aligned</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

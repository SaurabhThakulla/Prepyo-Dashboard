'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ChevronDown, Sun, Moon, Menu, X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExamType } from '@/lib/types';

/**
 * Public Navigation for the Prepyo Landing Page.
 * Every link smoothly scrolls to the section on the landing page when on "/",
 * or navigates to "/#section" if clicked from an inner page.
 */
const NAV_LINKS = [
  { href: '/#features', id: 'features', label: 'Features' },
  { href: '/#how-it-works', id: 'how-it-works', label: 'How it Works' },
  { href: '/#pricing', id: 'pricing', label: 'Pricing (NPR)' },
  { href: '/#testimonials', id: 'testimonials', label: 'Success Stories' },
  { href: '/#institutions', id: 'institutions', label: 'For Institutes' },
  { href: '/#faq', id: 'faq', label: 'FAQ' },
];

const EXAM_OPTIONS: { exam: ExamType; label: string; target: string; targetClass: string }[] = [
  { exam: 'PTE', label: 'PTE Academic', target: '79+', targetClass: 'bg-primary/10 text-primary' },
  { exam: 'IELTS', label: 'IELTS Academic', target: '8.0', targetClass: 'bg-amber-500/10 text-amber-600' },
];

export default function PublicNav() {
  const { activeExam, setActiveExam, theme, toggleTheme } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);

  // Close the products dropdown on outside click or Escape
  useEffect(() => {
    if (!productsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (productsRef.current && !productsRef.current.contains(event.target as Node)) {
        setProductsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProductsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [productsOpen]);

  /**
   * Handle smooth scroll to landing page sections.
   * If already on '/', prevent full navigation and smooth-scroll to the element.
   * If on another route, navigate to `/#<id>`.
   */
  const scrollToSection = (e: React.MouseEvent<HTMLElement>, targetId: string) => {
    setProductsOpen(false);
    setMobileOpen(false);

    if (pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${targetId}`);
      }
    }
  };

  const chooseExam = (e: React.MouseEvent<HTMLElement>, exam: ExamType) => {
    setActiveExam(exam);
    scrollToSection(e, 'products');
  };

  return (
    <div className="sticky top-0 z-50 w-full pt-4 px-4 sm:px-6 lg:px-8">
      <header className="w-full lg:max-w-[80vw] mx-auto rounded-[22px] border border-border/80 bg-card/90 backdrop-blur-xl shadow-md transition-all">
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5">
          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.history.pushState(null, '', '/');
              }
            }}
            className="flex items-center gap-2 group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
                prep<span className="text-primary">yo</span>
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-wider bg-nepal-blue/10 text-nepal-blue dark:text-indigo-400 px-1.5 py-0.5 rounded border border-nepal-blue/20">
                NP
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
            {/* Products Dropdown */}
            <div className="relative" ref={productsRef}>
              <button
                type="button"
                onClick={() => setProductsOpen(open => !open)}
                aria-expanded={productsOpen}
                aria-haspopup="true"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors py-1"
              >
                <span>Exams</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180 text-primary' : ''}`}
                />
              </button>

              {productsOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 rounded-2xl bg-card border border-border p-2 shadow-xl space-y-1 z-50">
                  {EXAM_OPTIONS.map(({ exam, label, target, targetClass }) => (
                    <a
                      key={exam}
                      href={`/#products`}
                      onClick={(e) => chooseExam(e, exam)}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        activeExam === exam ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${targetClass}`}>{target}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {NAV_LINKS.map(({ href, id, label }) => (
              <a
                key={id}
                href={href}
                onClick={(e) => scrollToSection(e, id)}
                className="hover:text-foreground transition-colors cursor-pointer text-xs xl:text-sm"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right Action Icons & Auth Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button asChild variant="ghost" size="sm" className="rounded-full font-bold text-xs px-4 h-9">
              <Link href="/login">Login</Link>
            </Button>

            <Button asChild size="sm" className="rounded-full font-extrabold text-xs px-5 h-9 shadow-sm hover:shadow-md transition-all">
              <Link href="/signup" className="flex items-center gap-1.5">
                <span>Sign up</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>

            {/* Mobile Menu Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(open => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="lg:hidden rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <nav className="lg:hidden border-t border-border px-4 py-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="block px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Select Exam
            </span>
            {EXAM_OPTIONS.map(({ exam, label, target, targetClass }) => (
              <a
                key={exam}
                href="/#products"
                onClick={(e) => chooseExam(e, exam)}
                className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                  activeExam === exam ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${targetClass}`}>{target}</span>
              </a>
            ))}

            <div className="pt-2 mt-1 border-t border-border space-y-1">
              <span className="block px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Navigation
              </span>
              {NAV_LINKS.map(({ href, id, label }) => (
                <a
                  key={id}
                  href={href}
                  onClick={(e) => scrollToSection(e, id)}
                  className="block p-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="pt-2 border-t border-border flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl text-xs font-bold">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
              </Button>
              <Button asChild size="sm" className="flex-1 rounded-xl text-xs font-bold">
                <Link href="/signup" onClick={() => setMobileOpen(false)}>
                  Sign up Free
                </Link>
              </Button>
            </div>
          </nav>
        )}
      </header>
    </div>
  );
}

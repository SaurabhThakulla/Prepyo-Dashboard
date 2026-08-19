'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ChevronDown, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicNav() {
  const { activeExam, setActiveExam, theme, toggleTheme } = useApp();
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 w-full pt-4 px-4 sm:px-6 lg:px-8">
      <header className="max-w-[80vw] mx-auto flex items-center justify-between rounded-[22px] border border-border bg-card px-6 py-2.5 shadow-sm transition-all">
        
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-black text-sm">
            P
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
            prep<span className="text-primary">yo</span>
          </span>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
          <div className="relative">
            <button
              onClick={() => setProductsOpen(!productsOpen)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors py-1"
            >
              <span>Products</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180 text-primary' : ''}`} />
            </button>

            {productsOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 rounded-2xl bg-card border border-border p-2 shadow-xl space-y-1 animate-in fade-in zoom-in-95 z-50">
                <button
                  onClick={() => { setActiveExam('PTE'); setProductsOpen(false); }}
                  className="w-full text-left p-2.5 rounded-xl text-xs font-bold hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                >
                  <span>PTE Academic</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">79+</span>
                </button>
                <button
                  onClick={() => { setActiveExam('IELTS'); setProductsOpen(false); }}
                  className="w-full text-left p-2.5 rounded-xl text-xs font-bold hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                >
                  <span>IELTS Academic</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-mono">8.0</span>
                </button>
              </div>
            )}
          </div>

          <Link href="/subscription" className="hover:text-foreground transition-colors">
            Subscription
          </Link>

          <Link href="/admin" className="hover:text-foreground transition-colors">
            Industrial Login
          </Link>
        </nav>

        {/* Right: Theme Toggle & Auth Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Light / Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </Button>

          <Button asChild size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-xs px-5 h-9 shadow-sm">
            <Link href="/dashboard">
              Login
            </Link>
          </Button>

          <Button asChild variant="ghost" size="sm" className="rounded-full font-bold text-xs text-foreground px-4 h-9">
            <Link href="/dashboard">
              SignUp
            </Link>
          </Button>
        </div>
      </header>
    </div>
  );
}

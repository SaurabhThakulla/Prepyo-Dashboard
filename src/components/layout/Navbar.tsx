'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Flame, Sparkles, Bell, Trophy, BookOpen, Layers, ShieldCheck, User, Menu, X, Bot } from 'lucide-react';
import NotificationDrawer from './NotificationDrawer';

export default function Navbar() {
  const { user, activeExam, setActiveExam, unreadCount, setIsTutorOpen } = useApp();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Exam Switcher */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <span className="font-display text-xl font-black text-white tracking-wider">P</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nepal-crimson opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-nepal-crimson"></span>
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xl font-extrabold tracking-tight text-white">Prepyo</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-nepal-blue/60 text-indigo-200 px-1.5 py-0.5 rounded border border-nepal-blue">NP</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">PTE & IELTS AI Prep</span>
              </div>
            </Link>

            {/* PTE vs IELTS Switcher Pills */}
            <div className="hidden md:flex items-center bg-surface-900/90 p-1 rounded-xl border border-white/10 shadow-inner">
              <button
                onClick={() => setActiveExam('PTE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeExam === 'PTE'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>PTE Academic</span>
                {activeExam === 'PTE' && (
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded font-mono">79+</span>
                )}
              </button>
              <button
                onClick={() => setActiveExam('IELTS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeExam === 'IELTS'
                    ? 'bg-gradient-to-r from-nepal-crimson to-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>IELTS</span>
                {activeExam === 'IELTS' && (
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded font-mono">8.0</span>
                )}
              </button>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                pathname === '/dashboard' ? 'text-white bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/practice"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                pathname?.startsWith('/practice') ? 'text-white bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Practice Studio
            </Link>
            <Link
              href="/mocks"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                pathname?.startsWith('/mocks') ? 'text-white bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Mock Tests
            </Link>
            <Link
              href="/evaluations"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                pathname?.startsWith('/evaluations') ? 'text-white bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              AI Evaluator
            </Link>
            <Link
              href="/mistakes"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                pathname === '/mistakes' ? 'text-white bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Mistake Bank
            </Link>
            <Link
              href="/leaderboard"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                pathname === '/leaderboard' ? 'text-white bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Leaderboard
            </Link>
          </nav>

          {/* Right Action Icons & User Stats */}
          <div className="flex items-center gap-3">
            
            {/* Quick AI Tutor Coach Trigger */}
            <button
              onClick={() => setIsTutorOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm group"
            >
              <Bot className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">AI Tutor</span>
            </button>

            {/* Streak Counter with Flame */}
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-400" title="Daily Practice Streak">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              <span>{user?.streakDays || 6}d</span>
            </div>

            {/* XP Counter */}
            <div className="hidden sm:flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-300" title="XP Points and Level">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{user?.xp || 1450} XP</span>
              <span className="text-[10px] bg-indigo-500/30 px-1 rounded text-indigo-200">L{user?.level || 5}</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nepal-crimson opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-nepal-crimson"></span>
                </span>
              )}
            </button>

            {/* Pro / Subscription Button */}
            <Link
              href="/subscription"
              className={`hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                user?.subscriptionTier === 'elite'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : user?.subscriptionTier === 'pro'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-600/20'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{user?.subscriptionTier === 'elite' ? 'ELITE' : user?.subscriptionTier === 'pro' ? 'PRO' : 'UPGRADE'}</span>
            </Link>

            {/* Profile Avatar */}
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1 pl-2 bg-surface-900 border border-white/10 rounded-xl hover:border-brand-500/40 transition-colors"
            >
              <span className="hidden md:inline text-xs font-semibold text-slate-200 truncate max-w-[90px]">
                {user?.name?.split(' ')[0] || 'Learner'}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
                {user?.name?.charAt(0) || 'B'}
              </div>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-white/10 bg-surface-950 px-4 pt-2 pb-4 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs text-slate-400">Target Exam:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveExam('PTE')}
                  className={`px-3 py-1 rounded text-xs font-bold ${activeExam === 'PTE' ? 'bg-brand-600 text-white' : 'bg-surface-900 text-slate-400'}`}
                >
                  PTE Academic
                </button>
                <button
                  onClick={() => setActiveExam('IELTS')}
                  className={`px-3 py-1 rounded text-xs font-bold ${activeExam === 'IELTS' ? 'bg-nepal-crimson text-white' : 'bg-surface-900 text-slate-400'}`}
                >
                  IELTS
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link onClick={() => setMobileMenuOpen(false)} href="/dashboard" className="p-2.5 rounded-lg bg-surface-900 text-xs font-medium text-slate-200 hover:bg-white/5">
                Dashboard
              </Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/practice" className="p-2.5 rounded-lg bg-surface-900 text-xs font-medium text-slate-200 hover:bg-white/5">
                Practice Studio
              </Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/mocks" className="p-2.5 rounded-lg bg-surface-900 text-xs font-medium text-slate-200 hover:bg-white/5">
                Mock Tests
              </Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/evaluations" className="p-2.5 rounded-lg bg-surface-900 text-xs font-medium text-slate-200 hover:bg-white/5">
                AI Evaluator
              </Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/mistakes" className="p-2.5 rounded-lg bg-surface-900 text-xs font-medium text-slate-200 hover:bg-white/5">
                Mistake Bank
              </Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/leaderboard" className="p-2.5 rounded-lg bg-surface-900 text-xs font-medium text-slate-200 hover:bg-white/5">
                Leaderboard
              </Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/subscription" className="p-2.5 rounded-lg bg-brand-600/30 border border-brand-500 text-xs font-bold text-brand-300">
                Upgrade (NPR)
              </Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/admin" className="p-2.5 rounded-lg bg-surface-900 text-xs font-medium text-slate-400">
                Admin Panel
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Notification Drawer */}
      <NotificationDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

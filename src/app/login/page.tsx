'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Bot,
  CheckCircle2,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
  Award,
  Star,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUserData, theme, toggleTheme } = useApp();

  const [email, setEmail] = useState('aprapya.student@prepyo.np');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshUserData();
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'demo-login' }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshUserData();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError('Failed to log in as demo student.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background overflow-x-hidden">
      
      {/* LEFT HALF: Genuine Nepali Student Full-Screen Hero Visual */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-slate-950 text-white select-none">
        {/* Background Hero Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/auth-hero.jpg"
            alt="Nepali student preparing for PTE and IELTS in Kathmandu"
            fill
            priority
            className="object-cover object-center w-full h-full scale-105 hover:scale-100 transition-transform duration-1000 brightness-90"
          />
          {/* Cinematic Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/25 backdrop-brightness-95" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-slate-950/60" />
        </div>

        {/* Top Brand & Badges */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-white font-black text-base shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-2xl font-black tracking-tight text-white">
                prep<span className="text-primary">yo</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                NP
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>4.9/5 by 12,000+ Students</span>
          </div>
        </div>

        {/* Center Floating Scorecard & Social Proof */}
        <div className="relative z-10 my-auto py-8 space-y-4">
          <div className="w-fit max-w-sm rounded-2xl bg-black/55 backdrop-blur-xl border border-white/15 p-5 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Official Pearson Scored Result
              </span>
              <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-md font-mono font-bold">PTE 86</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              &ldquo;Practiced Read Aloud and DI daily with Prepyo AI. The scoring rubrics matched my official Pearson score exactly in Kathmandu!&rdquo;
            </p>
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-white/10">
              <span>Rohan Thapa • Lalitpur</span>
              <span className="text-primary font-bold">Speaking 90/90</span>
            </div>
          </div>
        </div>

        {/* Bottom Student Trust Footer */}
        <div className="relative z-10 space-y-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
              ))}
              <span className="text-xs text-white font-bold ml-1.5">Nepal&apos;s #1 AI Exam Prep</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fastest AI speech evaluation calibrated for Nepali accent nuances and Pearson/Cambridge guidelines.
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
            <span>🇳🇵 Crafted for Nepali test takers</span>
            <span>Kathmandu • Pokhara • Chitwan</span>
          </div>
        </div>
      </div>

      {/* RIGHT HALF: Full-Screen Login Form */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 md:p-14 xl:p-16 overflow-y-auto bg-background">
        
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between pb-6">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-black text-xs shadow-md">
              P
            </div>
            <span className="font-display text-xl font-black text-foreground">
              prep<span className="text-primary">yo</span>
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </Button>

            <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs font-bold hover:bg-muted">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div className="w-full max-w-md mx-auto space-y-6 my-auto py-6">
          <div className="space-y-2">
            <Badge variant="indigo" className="px-2.5 py-0.5 text-[10px] font-bold">
              Welcome Back
            </Badge>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Log in to your account
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Continue your daily streak and AI mock test preparation.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full rounded-xl border border-input bg-card pl-10 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium shadow-xs"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Password</label>
                <Link href="#" className="text-[11px] font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-input bg-card pl-10 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="text-xs text-muted-foreground font-medium">Remember this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl font-bold text-xs h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Prepyo'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-background px-2 text-muted-foreground font-bold tracking-wider">
                Quick Trial Mode
              </span>
            </div>
          </div>

          {/* Instant Demo Student Login */}
          <Button
            type="button"
            variant="outline"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full rounded-xl font-bold text-xs h-10 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{demoLoading ? 'Loading Trial...' : 'Explore Demo Student Account (1-Click)'}</span>
          </Button>

          {/* Switch to Signup */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account yet?{' '}
              <Link href="/signup" className="font-extrabold text-primary hover:underline">
                Create Free Account (+1 Free Mock)
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-[11px] text-muted-foreground border-t border-border/60">
          <span>Protected by Prepyo 256-bit encryption • Kathmandu, Nepal</span>
        </div>

      </div>

    </div>
  );
}

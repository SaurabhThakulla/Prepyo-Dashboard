'use client';

import React, { useState, useEffect, useId, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { api, ApiError } from '@/lib/api';
import { SubscriptionPlan } from '@/lib/types';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Sun,
  Moon,
  ShieldCheck,
  Gift,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

export type AuthMode = 'login' | 'signup';

interface UnifiedAuthProps {
  initialMode?: AuthMode;
}

/** Mirrors minPasswordLength in backend/internal/auth/handler.go. */
const MIN_PASSWORD_LENGTH = 10;

export default function UnifiedAuth({ initialMode = 'login' }: UnifiedAuthProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, theme, toggleTheme } = useApp();
  const toast = useToast();

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Entitlements from plans endpoint
  const [freePlan, setFreePlan] = useState<SubscriptionPlan | null>(null);

  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();

  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'login' || urlMode === 'signup') {
      setMode(urlMode);
    }
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
      setMode('signup');
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ plans: SubscriptionPlan[] }>('/subscriptions/plans')
      .then(data => {
        if (cancelled) return;
        setFreePlan(data.plans.find(p => p.id === 'free') ?? null);
      })
      .catch(() => {
        // Render without dynamic plan features if endpoint unavailable
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setFieldErrors({});
  };

  const passwordStrength = useCallback((pass: string) => {
    if (pass.length < MIN_PASSWORD_LENGTH) {
      return { level: `Min ${MIN_PASSWORD_LENGTH} chars`, score: 1, color: 'bg-rose-500' };
    }
    if (pass.length >= 14 || (/[0-9]/.test(pass) && /[A-Z]/.test(pass) && /[^A-Za-z0-9]/.test(pass))) {
      return { level: 'Strong', score: 3, color: 'bg-emerald-500' };
    }
    return { level: 'Good', score: 2, color: 'bg-amber-500' };
  }, [])(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (mode === 'signup') {
      if (!agreeTerms) {
        const msg = 'Please accept the Terms of Service to create your account.';
        setError(msg);
        toast.warning('Terms Required', msg);
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        const msg = `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
        setFieldErrors({ password: msg });
        setError(msg);
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const account = await login(email.trim(), password);
        toast.success('Welcome back!', `Signed in as ${account.email}.`);
      } else {
        const account = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          referralCode: referralCode.trim() || undefined,
        });
        toast.success('Account created', `Welcome to Prepyo, ${account.name}.`);
      }
      const next = searchParams.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setFieldErrors(err.fields);
        setError(err.message);
        toast.error(mode === 'login' ? 'Sign in failed' : 'Registration failed', err.message);
      } else {
        const msg = 'Something went wrong. Please try again.';
        setError(msg);
        toast.error('Unexpected error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (providerName: string) => {
    toast.info(`${providerName} sign-in coming soon`, 'Please use email and password for now.');
  };

  const inputClass = (field: string) =>
    `w-full rounded-xl border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium shadow-xs ${
      fieldErrors[field] ? 'border-destructive focus:border-destructive' : 'border-input focus:border-primary'
    }`;

  return (
    <div className="h-screen max-h-screen w-full flex flex-col lg:flex-row bg-background overflow-hidden">

      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT HALF: Hero Panel (Title at Top, Both Cards in Bottom Row) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 h-screen max-h-screen relative flex-col justify-between p-8 xl:p-12 overflow-hidden bg-slate-950 text-white">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/auth-hero.jpg"
            alt="Student preparing for PTE and IELTS in Kathmandu"
            fill
            priority
            className="object-cover object-center w-full h-full brightness-[0.85]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/35 backdrop-brightness-95" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-slate-950/70" />
        </div>

        {/* TOP SECTION: Brand Header & Headline */}
        <div className="relative z-10 space-y-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-white font-black text-lg shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                P
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-black tracking-tight text-white">
                  prep<span className="text-primary">yo</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/40">
                  NP
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-slate-200">
              <span className="text-amber-400">★</span>
              <span>4.9/5 • 12k+ Students</span>
            </div>
          </div>

          {/* Hero Headline at the Top */}
          <div className="space-y-2 max-w-lg pt-2">
            <h2 className="font-display text-2xl xl:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              Master PTE 79+ &amp; IELTS 8.0 with AI
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Nepal’s premier realistic exam simulator tuned with authentic Pearson &amp; Cambridge scoring rubrics.
            </p>
          </div>
        </div>

        {/* BOTTOM SECTION: Both Cards Side-by-Side in a Row */}
        <div className="relative z-10 space-y-3.5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            
            {/* Card 1: Instant Free Starter */}
            <div className="rounded-2xl bg-black/75 backdrop-blur-xl border border-white/20 p-4 shadow-2xl space-y-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Gift className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white truncate">
                    {freePlan?.name || 'Instant Free Starter'}
                  </span>
                </div>
                <Badge variant="success" className="text-[10px] py-0 font-bold shrink-0">
                  NPR {freePlan?.priceNPR ?? 0}
                </Badge>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong>1 Full AI Mock Exam</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong>3 Daily AI Evaluations</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong>Nepali Accent AI Engine</strong></span>
                </li>
              </ul>
            </div>

            {/* Card 2: Bank-Grade Privacy & Security */}
            <div className="rounded-2xl bg-black/75 backdrop-blur-xl border border-white/20 p-4 shadow-2xl space-y-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-white truncate">
                    Privacy &amp; Security
                  </span>
                </div>
                <Badge variant="indigo" className="text-[10px] py-0 font-bold uppercase shrink-0">
                  256-Bit
                </Badge>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span><strong>Bcrypt Password Hashing</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span><strong>Revocable User Sessions</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span><strong>100% Student Data Safety</strong></span>
                </li>
              </ul>
            </div>

          </div>

          {/* Location & Trust line */}
          <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-medium">
            <span>🇳🇵 Kathmandu • Pokhara • Lalitpur • Chitwan</span>
            <span className="text-emerald-400 font-semibold">Nepal Official</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT HALF: Compact Auth Form (100% fits viewport)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-7/12 xl:w-1/2 h-screen max-h-screen flex flex-col justify-between p-5 sm:p-8 xl:p-10 overflow-y-auto bg-background">

        {/* Top bar */}
        <div className="flex items-center justify-between pb-1">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-black text-xs shadow-md">
              P
            </div>
            <span className="font-display text-lg font-black text-foreground">
              prep<span className="text-primary">yo</span>
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </Button>

            <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs font-semibold h-8 hover:bg-muted">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>

        {/* Main Content (Centered and compact) */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto space-y-4 my-auto py-2">

          {/* Mode Switcher Pill */}
          <div className="p-1 rounded-2xl bg-muted/70 border border-border flex items-center gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Title Header */}
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {mode === 'login' ? 'Welcome back to Prepyo' : 'Create your free account'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to continue your drills and track your score progress.'
                : 'Claim 1 Free AI Mock Exam & 3 Daily AI Evaluations.'}
            </p>
          </div>

          {/* Social Sign-In (Google, Apple, Facebook) */}
          <div className="space-y-2.5 pt-0.5">
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-xs sm:text-sm font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer"
                title="Continue with Google"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="truncate">Google</span>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Apple')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-xs sm:text-sm font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer"
                title="Continue with Apple"
              >
                <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.79-11.72-14.24-5.33-8.39-9.58-18.06-12.74-29.02-3.17-10.96-4.76-21.46-4.76-31.5 0-14.42 3.65-26.3 10.96-35.64 7.3-9.34 16.59-14.12 27.84-14.34 4.58 0 9.77 1.25 15.57 3.75 5.8 2.5 9.78 3.75 11.95 3.75 1.96 0 6.04-1.29 12.24-3.87 6.2-2.58 11.66-3.76 16.39-3.53 12.63.65 22.84 5.44 30.63 14.36-10.99 6.64-16.38 15.67-16.17 27.09.22 8.92 3.64 16.33 10.27 22.25 6.63 5.92 14.41 9.4 23.34 10.45-2.39 7.08-5.26 13.9-8.61 20.47zM119.22 31.02c0-7.18 2.61-13.82 7.83-19.92 5.22-6.1 11.64-9.98 19.26-11.1-1.09 7.4-4.03 14.04-8.82 19.92-4.79 5.88-10.88 9.58-18.27 11.1z" />
                </svg>
                <span className="truncate">Apple</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Facebook')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-xs sm:text-sm font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer"
                title="Continue with Facebook"
              >
                <svg className="w-4 h-4 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="truncate">Facebook</span>
              </button>
            </div>

            {/* Compact Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-background px-2 text-muted-foreground font-bold tracking-wider">
                  or continue with email
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label htmlFor={nameId} className="text-xs font-bold text-foreground">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id={nameId}
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className={inputClass('name')}
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-destructive font-medium">{fieldErrors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor={emailId} className="text-xs font-bold text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass('email')}
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-destructive font-medium">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={passwordId} className="text-xs font-bold text-foreground">Password</label>
                {mode === 'login' && (
                  <Link href="#" className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? `Min. ${MIN_PASSWORD_LENGTH} characters` : 'Enter password'}
                  className={`${inputClass('password')} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-destructive font-medium">{fieldErrors.password}</p>}

              {mode === 'signup' && password.length > 0 && (
                <div className="space-y-1 pt-1 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Strength</span>
                    <span className={passwordStrength.score >= 2 ? 'text-emerald-500' : 'text-rose-500'}>
                      {passwordStrength.level}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'}`} />
                  </div>
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <div className="pt-0.5 animate-in fade-in">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4 mt-0.5 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground leading-tight font-medium">
                    I agree to the Terms of Service and Privacy Policy.
                  </span>
                </label>
              </div>
            )}

            {/* Primary Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl font-bold text-xs sm:text-sm h-10.5 shadow-md shadow-primary/25 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Prepyo' : 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Switch link */}
          <div className="text-center pt-1">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('signup')}
                    className="font-extrabold text-primary hover:underline cursor-pointer"
                  >
                    Create one (+1 Free Mock)
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="font-extrabold text-primary hover:underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/60">
          <span>Protected by Prepyo 256-bit encryption • Kathmandu, Nepal</span>
        </div>

      </div>

    </div>
  );
}

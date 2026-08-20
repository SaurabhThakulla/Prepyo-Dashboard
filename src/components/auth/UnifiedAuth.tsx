'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
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
  Trophy,
  Star,
  ShieldCheck,
  Zap,
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

export default function UnifiedAuth({ initialMode = 'login' }: UnifiedAuthProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUserData, theme, toggleTheme } = useApp();
  const toast = useToast();

  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('aprapya.student@prepyo.np');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form IDs
  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();

  // Sync mode from URL
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'login' || urlMode === 'signup') {
      setMode(urlMode);
    }
  }, [searchParams]);

  // Mode Switcher
  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    if (newMode === 'signup') {
      if (email === 'aprapya.student@prepyo.np') setEmail('');
      if (password === 'password123') setPassword('');
    } else {
      if (!email) setEmail('aprapya.student@prepyo.np');
      if (!password) setPassword('password123');
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass || pass.length < 6) return { level: 'Weak', score: 1, color: 'bg-rose-500' };
    if (pass.length >= 8 && /[0-9]/.test(pass) && /[A-Z]/.test(pass)) {
      return { level: 'Strong', score: 3, color: 'bg-emerald-500' };
    }
    return { level: 'Good', score: 2, color: 'bg-amber-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !agreeTerms) {
      const msg = 'Please accept the Terms of Service to create your account.';
      setError(msg);
      toast.warning('Terms Required', msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/v1/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Welcome back!', 'Successfully signed in to your Prepyo dashboard.');
          await refreshUserData();
          router.push('/dashboard');
        } else {
          const msg = data.error || 'Invalid credentials. Please verify your email.';
          setError(msg);
          toast.error('Sign In Failed', msg);
        }
      } else {
        const res = await fetch('/api/v1/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'signup',
            name: name.trim() || 'New Learner',
            email: email.trim(),
            password: password,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Account Created! 🎉', 'Welcome to Prepyo! 1 Free AI Mock Exam & 100 XP unlocked.');
          await refreshUserData();
          router.push('/dashboard');
        } else {
          const msg = data.error || 'Failed to create account. Please try again.';
          setError(msg);
          toast.error('Registration Issue', msg);
        }
      }
    } catch (err: any) {
      const msg = 'A connection error occurred. Please try again.';
      setError(msg);
      toast.error('Network Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Social Login Handler (Google, Apple, Facebook)
  const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    setSocialLoading(provider);
    setError(null);

    const providerNames: Record<string, string> = {
      google: 'Google',
      apple: 'Apple',
      facebook: 'Facebook',
    };

    try {
      const res = await fetch('/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'social-login',
          provider,
          email: `student.${provider}@prepyo.np`,
          name: `${providerNames[provider]} Student`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Signed in with ${providerNames[provider]}!`, 'Welcome to Prepyo AI Platform.');
        await refreshUserData();
        router.push('/dashboard');
      } else {
        const msg = data.error || `Unable to authenticate with ${providerNames[provider]}.`;
        setError(msg);
        toast.error('Social Sign-In Issue', msg);
      }
    } catch (err) {
      const msg = `Failed to connect to ${providerNames[provider]}. Please try again.`;
      setError(msg);
      toast.error('Connection Error', msg);
    } finally {
      setSocialLoading(null);
    }
  };

  // 1-Click Demo Login
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
        toast.info('Demo Mode Activated', 'Exploring Prepyo as Aprapya Rana (Trial Student).');
        await refreshUserData();
        router.push('/dashboard');
      } else {
        const msg = 'Unable to load demo account.';
        setError(msg);
        toast.error('Trial Error', msg);
      }
    } catch (err: any) {
      const msg = 'Failed to log in as demo student.';
      setError(msg);
      toast.error('Trial Error', msg);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background overflow-x-hidden">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT HALF: Genuine Nepali Student Full-Screen Hero Showcase  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 min-h-screen relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-slate-950 text-white">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/auth-hero.jpg"
            alt="Nepali student preparing for PTE and IELTS in Kathmandu"
            fill
            priority
            className="object-cover object-center w-full h-full scale-105 hover:scale-100 transition-transform duration-1000 brightness-90"
          />
          {/* Cinematic Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/25 backdrop-brightness-95" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-slate-950/60" />
        </div>

        {/* Top Brand Header */}
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

          <div className="flex items-center gap-2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>4.9/5 by 12,000+ Nepali Students</span>
          </div>
        </div>

        {/* Dynamic Contextual Floating Cards */}
        <div className="relative z-10 my-auto py-8 space-y-4">
          {mode === 'login' ? (
            /* Login Showcase Card */
            <div className="w-fit max-w-sm rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 p-5 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Official Pearson Scored Result
                </span>
                <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-md font-mono font-bold">PTE 86</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                &ldquo;Practiced Read Aloud and DI daily on Prepyo AI. Reached my 79+ target score in 22 days before visa filing!&rdquo;
              </p>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-white/10">
                <span>Rohan Thapa • Lalitpur</span>
                <span className="text-primary font-bold">Speaking 90/90</span>
              </div>
            </div>
          ) : (
            /* Signup Starter Package Card */
            <div className="w-fit max-w-sm rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 p-5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Instant Free Registration Package
                </span>
                <Badge variant="success" className="text-[10px] py-0 font-bold">NPR 0</Badge>
              </div>
              <ul className="space-y-2 pt-1 border-t border-white/10 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>1 Free AI Mock Exam</strong> (All 4 Sections)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>3 Daily AI Evaluations</strong> refreshed daily</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>Instant Real-Time Feedback</strong> on pronunciation</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Trust Section */}
        <div className="relative z-10 space-y-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white">Nepali Accent Trained AI Engine</div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Speech recognition tuned for Nepali pronunciation nuances and Pearson/Cambridge rubric benchmarks.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
            <span>🇳🇵 Kathmandu • Pokhara • Chitwan</span>
            <span>Kathmandu, Nepal</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT HALF: Streamlined Auth with Google, Apple & Facebook    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-7/12 xl:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 md:p-14 xl:p-16 overflow-y-auto bg-background">
        
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between pb-4">
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

        {/* Main Center Auth Container */}
        <div className="w-full max-w-lg mx-auto space-y-5 my-auto py-4">
          
          {/* Seamless Mode Switcher Pill */}
          <div className="p-1 rounded-2xl bg-muted/70 border border-border flex items-center gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Create Account</span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                mode === 'signup' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}>
                +1 Mock Free
              </span>
            </button>
          </div>

          {/* Form Header */}
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {mode === 'login' ? 'Welcome back to Prepyo' : 'Start your free prep journey'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Continue your practice drills and daily study missions.'
                : 'Claim 1 Free AI Mock Exam and target your dream PTE 79+ or IELTS 8.0.'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SOCIAL AUTH BUTTONS: Google, Apple, Facebook                  */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="space-y-2.5 pt-1">
            {/* Google Button */}
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={!!socialLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
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
              )}
              <span>Continue with Google</span>
            </button>

            {/* Apple & Facebook Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Apple Button */}
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={!!socialLoading || loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50"
              >
                {socialLoading === 'apple' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.79-11.72-14.24-5.33-8.39-9.58-18.06-12.74-29.02-3.17-10.96-4.76-21.46-4.76-31.5 0-14.42 3.65-26.3 10.96-35.64 7.3-9.34 16.59-14.12 27.84-14.34 4.58 0 9.77 1.25 15.57 3.75 5.8 2.5 9.78 3.75 11.95 3.75 1.96 0 6.04-1.29 12.24-3.87 6.2-2.58 11.66-3.76 16.39-3.53 12.63.65 22.84 5.44 30.63 14.36-10.99 6.64-16.38 15.67-16.17 27.09.22 8.92 3.64 16.33 10.27 22.25 6.63 5.92 14.41 9.4 23.34 10.45-2.39 7.08-5.26 13.9-8.61 20.47zM119.22 31.02c0-7.18 2.61-13.82 7.83-19.92 5.22-6.1 11.64-9.98 19.26-11.1-1.09 7.4-4.03 14.04-8.82 19.92-4.79 5.88-10.88 9.58-18.27 11.1z" />
                  </svg>
                )}
                <span>Apple</span>
              </button>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                disabled={!!socialLoading || loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50"
              >
                {socialLoading === 'facebook' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <svg className="w-4 h-4 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <span>Facebook</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-background px-2 text-muted-foreground font-bold tracking-wider">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Dynamic Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Signup Only: Full Name */}
            {mode === 'signup' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label htmlFor={nameId} className="text-xs font-bold text-foreground">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id={nameId}
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aprapya Rana"
                    className="w-full rounded-xl border border-input bg-card pl-10 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor={emailId} className="text-xs font-bold text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id={emailId}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full rounded-xl border border-input bg-card pl-10 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium shadow-xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={passwordId} className="text-xs font-bold text-foreground">Password</label>
                {mode === 'login' && (
                  <Link href="#" className="text-[11px] font-medium text-primary hover:underline">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create password (min. 8 chars)' : 'Enter your password'}
                  className="w-full rounded-xl border border-input bg-card pl-10 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium shadow-xs"
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

              {/* Password Strength Meter for Signup */}
              {mode === 'signup' && password.length > 0 && (
                <div className="space-y-1 pt-1 animate-in fade-in">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                    <span>Password Strength</span>
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

            {/* Signup Only: Terms Acceptance */}
            {mode === 'signup' && (
              <div className="pt-0.5 animate-in fade-in">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 mt-0.5 cursor-pointer"
                  />
                  <span className="text-[11px] text-muted-foreground leading-tight font-medium">
                    I agree to the Terms of Service & Privacy Policy, claiming my 1 Free AI Mock Test.
                  </span>
                </label>
              </div>
            )}

            {/* Login Only: Remember Me */}
            {mode === 'login' && (
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-medium">Remember this device</span>
                </label>
              </div>
            )}

            {/* Primary Submit Button */}
            <Button
              type="submit"
              disabled={loading || !!socialLoading}
              className="w-full rounded-xl font-bold text-xs h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Prepyo' : 'Claim 1 Free Mock & Register'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Trial Mode (Login Mode) */}
          {mode === 'login' && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-bold tracking-wider">
                    Quick Trial Mode
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleDemoLogin}
                disabled={demoLoading || !!socialLoading}
                className="w-full rounded-xl font-bold text-xs h-10 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{demoLoading ? 'Loading Trial...' : 'Explore Demo Student Account (1-Click)'}</span>
              </Button>
            </>
          )}

          {/* Bottom Switch Link */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground font-medium">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('signup')}
                    className="font-extrabold text-primary hover:underline cursor-pointer"
                  >
                    Create Free Account (+1 Free Mock)
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
                    Log in here
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 text-center text-[11px] text-muted-foreground border-t border-border/60">
          <span>Protected by Prepyo 256-bit encryption • Kathmandu, Nepal</span>
        </div>

      </div>

    </div>
  );
}

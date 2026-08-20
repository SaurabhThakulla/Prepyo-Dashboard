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
  Sparkles,
  CheckCircle2,
  Sun,
  Moon,
  Gift,
  Target,
  MapPin,
  Trophy,
  Star,
  Tag,
  ShieldCheck,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExamType } from '@/lib/types';

export type AuthMode = 'login' | 'signup';

const NEPAL_REGIONS = [
  'Kathmandu',
  'Pokhara',
  'Lalitpur',
  'Chitwan',
  'Bhaktapur',
  'Biratnagar',
  'Butwal',
  'Dharan',
  'Hetauda',
  'Nepalgunj',
  'Other / Abroad',
];

interface UnifiedAuthProps {
  initialMode?: AuthMode;
}

export default function UnifiedAuth({ initialMode = 'login' }: UnifiedAuthProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUserData, theme, toggleTheme, setActiveExam } = useApp();

  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('aprapya.student@prepyo.np');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedExam, setSelectedExamState] = useState<ExamType>('PTE');
  const [targetScore, setTargetScore] = useState<number>(79);
  const [nepalRegion, setNepalRegion] = useState('Kathmandu');
  const [referralCode, setReferralCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form IDs
  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();

  // Sync mode and referral code from URL
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'login' || urlMode === 'signup') {
      setMode(urlMode);
    }
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase().trim());
      setMode('signup');
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

  const handleExamChange = (exam: ExamType) => {
    setSelectedExamState(exam);
    if (exam === 'PTE') {
      setTargetScore(79);
    } else {
      setTargetScore(7.5);
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
      setError('Please accept the Terms of Service to create your account.');
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
          await refreshUserData();
          router.push('/dashboard');
        } else {
          setError(data.error || 'Invalid credentials. Please verify your email.');
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
            targetExam: selectedExam,
            targetScore,
            nepalRegion,
            referralCode: referralCode.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setActiveExam(selectedExam);
          await refreshUserData();
          router.push('/dashboard');
        } else {
          setError(data.error || 'Failed to create account. Please try again.');
        }
      }
    } catch (err: any) {
      setError('A connection error occurred. Please try again.');
    } finally {
      setLoading(false);
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
        await refreshUserData();
        router.push('/dashboard');
      } else {
        setError('Unable to load demo account.');
      }
    } catch (err: any) {
      setError('Failed to log in as demo student.');
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
                {referralCode && (
                  <li className="flex items-center gap-2 text-emerald-300 font-semibold bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span><strong>+100 Bonus XP</strong> applied ({referralCode})</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>3 Daily AI Evaluations</strong> refreshed daily</span>
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
      {/* RIGHT HALF: Interactive Senior-Architected Auth Form          */}
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
        <div className="w-full max-w-lg mx-auto space-y-6 my-auto py-4">
          
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
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {mode === 'login' ? 'Welcome back to Prepyo' : 'Start your free prep journey'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Continue your practice drills and daily study missions.'
                : 'Claim 1 Free AI Mock Exam and target your dream PTE 79+ or IELTS 8.0.'}
            </p>
          </div>

          {/* Referral Banner (if applicable) */}
          {mode === 'signup' && referralCode && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-foreground">Referral Bonus Applied: </span>
                  <span className="font-mono text-emerald-400 font-bold">{referralCode}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">+100 bonus XP will unlock on your first diagnostic or practice drill!</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dynamic Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Signup Only: Name */}
            {mode === 'signup' && (
              <div className="space-y-1.5 animate-in fade-in duration-300">
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
                  placeholder={mode === 'signup' ? 'Create a strong password (min. 8 chars)' : 'Enter your password'}
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

            {/* Signup Specific Fields */}
            {mode === 'signup' && (
              <div className="space-y-3.5 pt-1 animate-in fade-in duration-300">
                {/* Target Exam Switcher */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Target Exam</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Can switch anytime</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleExamChange('PTE')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedExam === 'PTE'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/30'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-foreground">PTE Academic</div>
                        <div className="text-[10px] text-muted-foreground">Scored 10 – 90</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-md">
                        79+
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExamChange('IELTS')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedExam === 'IELTS'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-bold shadow-sm ring-1 ring-amber-500/30'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-foreground">IELTS Academic</div>
                        <div className="text-[10px] text-muted-foreground">Bands 0 – 9.0</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-md">
                        8.0
                      </span>
                    </button>
                  </div>
                </div>

                {/* Target Score & Nepal Region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Target Score ({selectedExam === 'PTE' ? '10-90' : 'Band 0-9'})
                    </label>
                    <div className="relative">
                      <Target className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="number"
                        step={selectedExam === 'IELTS' ? '0.5' : '1'}
                        min={selectedExam === 'IELTS' ? '4.0' : '30'}
                        max={selectedExam === 'IELTS' ? '9.0' : '90'}
                        value={targetScore}
                        onChange={(e) => setTargetScore(parseFloat(e.target.value) || (selectedExam === 'PTE' ? 79 : 7.5))}
                        className="w-full rounded-xl border border-input bg-card pl-10 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono font-bold shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Region in Nepal</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <select
                        value={nepalRegion}
                        onChange={(e) => setNepalRegion(e.target.value)}
                        className="w-full rounded-xl border border-input bg-card pl-10 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium shadow-xs cursor-pointer"
                      >
                        {NEPAL_REGIONS.map((region) => (
                          <option key={region} value={region} className="bg-card text-foreground">
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Optional Referral Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Referral Code (Optional)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Earn +100 bonus XP</span>
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="PREP-XXXXXX"
                      className="w-full rounded-xl border border-input bg-card pl-10 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Terms Acceptance */}
                <div className="pt-0.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
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
              </div>
            )}

            {/* Login Only: Remember Me */}
            {mode === 'login' && (
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
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
              disabled={loading}
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

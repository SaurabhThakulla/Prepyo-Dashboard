'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExamType } from '@/lib/types';

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

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUserData, theme, toggleTheme, setActiveExam } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamType>('PTE');
  const [targetScore, setTargetScore] = useState<number>(79);
  const [nepalRegion, setNepalRegion] = useState('Kathmandu');
  const [referralCode, setReferralCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase().trim());
    }
  }, [searchParams]);

  const handleExamChange = (exam: ExamType) => {
    setSelectedExam(exam);
    if (exam === 'PTE') {
      setTargetScore(79);
    } else {
      setTargetScore(7.5);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('Please accept the Terms of Service to create your account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
    } catch (err: any) {
      setError('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background overflow-x-hidden">
      
      {/* LEFT HALF: Genuine Nepali Student Full-Screen Hero Visual & Benefits */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 min-h-screen relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-slate-950 text-white select-none">
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/25 backdrop-brightness-95" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-slate-950/60" />
        </div>

        {/* Top Brand Logo */}
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

          <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold">
            <Gift className="w-3.5 h-3.5 text-primary" />
            <span>Free Starter Pack</span>
          </div>
        </div>

        {/* Center Floating Starter Benefits Card */}
        <div className="relative z-10 my-auto py-8 space-y-4">
          <div className="rounded-2xl bg-black/55 backdrop-blur-xl border border-white/15 p-5 shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Instant Free Registration Package
              </span>
              <Badge variant="success" className="text-[10px] py-0 font-bold">NPR 0</Badge>
            </div>

            <ul className="space-y-2.5 pt-2 border-t border-white/10 text-xs text-slate-200">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span><strong>1 Free AI Mock Exam</strong> (All 4 Sections Scored)</span>
              </li>
              {referralCode && (
                <li className="flex items-center gap-2.5 text-emerald-300 font-semibold bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30">
                  <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span><strong>+100 Bonus XP</strong> via referral ({referralCode})</span>
                </li>
              )}
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span><strong>3 Daily AI Evaluations</strong> refreshed automatically</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span><strong>Personal Mistake Bank</strong> & Target Gap Analytics</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div className="relative z-10 space-y-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white">Nepali Accent Trained AI Engine</div>
              <p className="text-[11px] text-slate-400">Speech recognition calibrated for Nepali pronunciation nuances and Pearson/Cambridge standards.</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
            <span>🇳🇵 Kathmandu • Pokhara • Chitwan</span>
            <span>12,000+ Active Test Takers</span>
          </div>
        </div>
      </div>

      {/* RIGHT HALF: Full-Screen High-Converting Signup Form */}
      <div className="w-full lg:w-7/12 xl:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 md:p-14 xl:p-16 overflow-y-auto bg-background">
        
        {/* Top Bar */}
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
              <Link href="/login">Have an account? Log In</Link>
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div className="w-full max-w-lg mx-auto space-y-5 my-auto py-4">
          
          <div className="space-y-1.5">
            <Badge variant="indigo" className="px-2.5 py-0.5 text-[10px] font-bold">
              Free Starter Account
            </Badge>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Create your Prepyo account
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Target your dream PTE 79+ or IELTS 8.0 with real-time AI scoring.
            </p>
          </div>

          {referralCode && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-foreground">Referral Bonus Code Applied: </span>
                  <span className="font-mono text-emerald-400 font-bold">{referralCode}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">+100 bonus XP will unlock after your first diagnostic or practice drill!</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aprapya Rana"
                    className="w-full rounded-xl border border-input bg-card pl-10 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium shadow-xs"
                  />
                </div>
              </div>

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
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password (min. 8 characters)"
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

            {/* Target Exam Switcher */}
            <div className="space-y-1.5 pt-0.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Which exam are you preparing for?</span>
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

            {/* Goal Score & Region */}
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

            {/* Optional Referral Code Input */}
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

            {/* Terms */}
            <div className="pt-0.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 mt-0.5"
                />
                <span className="text-[11px] text-muted-foreground leading-tight font-medium">
                  I agree to the Terms of Service & Privacy Policy, and claim my free 1 AI Mock Test starter entitlement.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl font-bold text-xs h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Creating Account...' : 'Complete Registration & Start Free'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground font-medium">
              Already registered?{' '}
              <Link href="/login" className="font-extrabold text-primary hover:underline">
                Log in here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 text-center text-[11px] text-muted-foreground border-t border-border/60">
          <span>© 2026 Prepyo Nepal. Crafted for Nepali test takers.</span>
        </div>

      </div>

    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading Prepyo...</div>}>
      <SignupContent />
    </Suspense>
  );
}

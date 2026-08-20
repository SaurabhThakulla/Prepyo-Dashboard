'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
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
  Share2,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen w-full flex flex-col justify-between bg-background p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Top Bar */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
            P
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              prep<span className="text-primary">yo</span>
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-nepal-blue/10 text-nepal-blue dark:text-indigo-400 px-1.5 py-0.5 rounded border border-nepal-blue/20">
              NP
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button asChild variant="ghost" size="sm" className="rounded-full text-xs font-bold">
            <Link href="/login">Have an account? Login</Link>
          </Button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="w-full max-w-5xl mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Welcome Rewards and Benefits */}
        <div className="hidden lg:flex lg:col-span-5 flex-col space-y-6 pr-4">
          
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary w-fit">
            <Gift className="w-3.5 h-3.5" />
            <span>Welcome Starter Pack Included</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
            Start your journey to <span className="text-primary">PTE 79+ / IELTS 8.0</span> today.
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Create your free account in under 60 seconds and immediately unlock your free baseline diagnostic mock test.
          </p>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Instant Signup Benefits</span>
            </div>

            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span><strong>1 Free AI Mock Test</strong> (Full test simulation)</span>
              </li>
              {referralCode && (
                <li className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong>+100 XP Welcome Bonus</strong> via referral</span>
                </li>
              )}
              <li className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span><strong>3 AI Evaluations</strong> refreshed every midnight</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span><strong>Personal Mistake Bank</strong> & habit tracking</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="lg:col-span-7 w-full max-w-lg mx-auto">
          <div className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-5">
            
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-black text-foreground">Create your free account</h2>
              <p className="text-xs text-muted-foreground">
                Set your exam goals and start practicing with instant AI evaluation.
              </p>
            </div>

            {/* Referral Notice if active */}
            {referralCode && (
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="font-bold text-foreground">Referral Applied: </span>
                    <span className="font-mono text-primary font-bold">{referralCode}</span>
                    <p className="text-[11px] text-muted-foreground">You will receive +100 bonus XP upon completing your first activity!</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
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
                      className="w-full rounded-xl border border-input bg-background/60 pl-10 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
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
                      className="w-full rounded-xl border border-input bg-background/60 pl-10 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
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
                    placeholder="Create a secure password (min. 10 chars)"
                    className="w-full rounded-xl border border-input bg-background/60 pl-10 pr-10 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
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
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Which exam are you preparing for?</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Can change anytime</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleExamChange('PTE')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedExam === 'PTE'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border bg-background/50 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">PTE Academic</div>
                      <div className="text-[10px] text-muted-foreground">Scored 10 – 90</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                      79+
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExamChange('IELTS')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedExam === 'IELTS'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-bold shadow-sm'
                        : 'border-border bg-background/50 text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">IELTS Academic</div>
                      <div className="text-[10px] text-muted-foreground">Bands 0 – 9.0</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">
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
                      className="w-full rounded-xl border border-input bg-background/60 pl-10 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono font-bold"
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
                      className="w-full rounded-xl border border-input bg-background/60 pl-10 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
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
                    className="w-full rounded-xl border border-input bg-background/60 pl-10 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 mt-0.5"
                  />
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    I agree to the Terms of Service & Privacy Policy, and accept the free 1 AI Mock Test starter entitlement.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl font-extrabold text-xs h-11 shadow-md hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Creating Account...' : 'Complete Registration & Start Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-border/80">
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-primary hover:underline">
                  Log in here
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto py-3 text-center text-[11px] text-muted-foreground border-t border-border/60">
        <span>© 2026 Prepyo Nepal. Crafted for Nepali test takers.</span>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}

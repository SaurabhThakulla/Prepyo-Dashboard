'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen w-full flex flex-col justify-between bg-background p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

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
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Brand Highlights (Hidden on small mobile) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col space-y-6 pr-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Test Preparation</span>
          </div>

          <h1 className="font-display text-4xl font-black text-foreground tracking-tight leading-tight">
            Log in to continue your <span className="text-primary">PTE & IELTS</span> prep.
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Access your full diagnostic mocks, personalized mistake bank, and instant sentence-level AI evaluation rubrics.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/70 border border-border">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-foreground">Track Your Predicted Score</div>
                <div className="text-muted-foreground">Confidence-calibrated to official Pearson & IELTS scales.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/70 border border-border">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-foreground">24/7 AI Personal Tutor</div>
                <div className="text-muted-foreground">Get instant guidance on any question type or exam trick.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/70 border border-border">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-500 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-foreground">100 NPR-Ready Payment Integration</div>
                <div className="text-muted-foreground">eSewa, Khalti, and Fonepay seamless upgrades.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-6">
            
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-black text-foreground">Welcome back</h2>
              <p className="text-xs text-muted-foreground">
                Enter your account credentials to access your dashboard.
              </p>
            </div>

            {/* Quick 1-Click Demo Login */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-emerald-500/10 to-teal-500/10 border border-primary/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Quick Demo Access
                </div>
                <div className="text-[11px] text-muted-foreground">Try with pre-loaded mocks & XP</div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleDemoLogin}
                disabled={demoLoading}
                className="rounded-xl text-xs font-extrabold px-3 h-8 shadow-sm"
              >
                {demoLoading ? 'Logging in...' : '1-Click Login'}
              </Button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <span className="relative bg-card px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Or sign in with email
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="learner@prepyo.np"
                    className="w-full rounded-xl border border-input bg-background/60 pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Password</label>
                  <a href="#" className="text-[11px] font-semibold text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-input bg-background/60 pl-10 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
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

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span className="text-xs text-muted-foreground">Remember me</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl font-extrabold text-xs h-11 shadow-md hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-border/80">
              <p className="text-xs text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/signup" className="font-bold text-primary hover:underline">
                  Sign up free (+100 XP)
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

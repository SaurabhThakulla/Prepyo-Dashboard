'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SocialSignInButtons from './SocialSignInButtons';
import { AuthMode, MIN_PASSWORD_LENGTH, passwordStrength, useAuthForm } from '@/lib/hooks/useAuthForm';

interface AuthFormProps {
  form: ReturnType<typeof useAuthForm>;
  onSocialSelect: (provider: string) => void;
}

/** The sign-in / sign-up form. State and submission live in `useAuthForm`. */
export default function AuthForm({ form, onSocialSelect }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const { mode, fieldErrors, error, loading } = form;
  const isSignup = mode === 'signup';
  const strength = passwordStrength(form.password);

  const inputClass = (field: string) =>
    `w-full rounded-xl border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium shadow-xs ${
      fieldErrors[field] ? 'border-destructive focus:border-destructive' : 'border-input focus:border-primary'
    }`;

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto space-y-4 my-auto py-2">
      <ModeSwitcher mode={mode} onSwitch={form.switchMode} />

      <div className="space-y-1 text-center sm:text-left">
        <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          {isSignup ? 'Create your free account' : 'Welcome back to Prepyo'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {isSignup
            ? 'Claim 1 Free AI Mock Exam & 3 Daily AI Evaluations.'
            : 'Sign in to continue your drills and track your score progress.'}
        </p>
      </div>

      <SocialSignInButtons onSelect={onSocialSelect} />

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={form.submit} className="space-y-3">
        {isSignup && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <label htmlFor={nameId} className="text-xs font-bold text-foreground">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id={nameId}
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={event => form.setName(event.target.value)}
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
              value={form.email}
              onChange={event => form.setEmail(event.target.value)}
              placeholder="you@example.com"
              className={inputClass('email')}
            />
          </div>
          {fieldErrors.email && <p className="text-xs text-destructive font-medium">{fieldErrors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={passwordId} className="text-xs font-bold text-foreground">Password</label>
            {!isSignup && (
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
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={isSignup ? MIN_PASSWORD_LENGTH : undefined}
              value={form.password}
              onChange={event => form.setPassword(event.target.value)}
              placeholder={isSignup ? `Min. ${MIN_PASSWORD_LENGTH} characters` : 'Enter password'}
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

          {isSignup && form.password.length > 0 && (
            <div className="space-y-1 pt-1 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Strength</span>
                <span className={strength.score >= 2 ? 'text-emerald-500' : 'text-rose-500'}>
                  {strength.level}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3].map(bar => (
                  <div
                    key={bar}
                    className={`h-full flex-1 rounded-full ${strength.score >= bar ? strength.color : 'bg-transparent'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {isSignup && (
          <div className="pt-0.5 animate-in fade-in">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={event => form.setAgreeTerms(event.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4 mt-0.5 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground leading-tight font-medium">
                I agree to the Terms of Service and Privacy Policy.
              </span>
            </label>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl font-bold text-xs sm:text-sm h-10.5 shadow-md shadow-primary/25 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isSignup ? 'Creating account…' : 'Signing in…'}</span>
            </>
          ) : (
            <>
              <span>{isSignup ? 'Create Free Account' : 'Sign In to Prepyo'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center pt-1">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {isSignup ? 'Already registered? ' : "Don't have an account yet? "}
          <button
            type="button"
            onClick={() => form.switchMode(isSignup ? 'login' : 'signup')}
            className="font-extrabold text-primary hover:underline cursor-pointer"
          >
            {isSignup ? 'Sign in here' : 'Create one (+1 Free Mock)'}
          </button>
        </p>
      </div>
    </div>
  );
}

function ModeSwitcher({ mode, onSwitch }: { mode: AuthMode; onSwitch: (mode: AuthMode) => void }) {
  const TABS: { value: AuthMode; label: string; activeClass: string }[] = [
    { value: 'login', label: 'Sign In', activeClass: 'bg-card text-foreground shadow-sm ring-1 ring-border' },
    { value: 'signup', label: 'Create Account', activeClass: 'bg-primary text-primary-foreground shadow-sm' },
  ];

  return (
    <div className="p-1 rounded-2xl bg-muted/70 border border-border flex items-center gap-1 shadow-xs">
      {TABS.map(tab => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onSwitch(tab.value)}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === tab.value ? tab.activeClass : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

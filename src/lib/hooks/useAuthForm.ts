'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ApiError, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export type AuthMode = 'login' | 'signup';

/** Mirrors minPasswordLength in backend/internal/auth/handler.go. */
export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordStrength {
  level: string;
  /** 1 = too short, 2 = good, 3 = strong. Drives the three-bar meter. */
  score: 1 | 2 | 3;
  color: string;
}

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { level: `Min ${MIN_PASSWORD_LENGTH} chars`, score: 1, color: 'bg-rose-500' };
  }

  const isLong = password.length >= 14;
  const isMixed =
    /[0-9]/.test(password) && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password);

  if (isLong || isMixed) {
    return { level: 'Strong', score: 3, color: 'bg-emerald-500' };
  }
  return { level: 'Good', score: 2, color: 'bg-amber-500' };
}

/**
 * The sign-in / sign-up form: its fields, its validation, and what happens on
 * submit. Kept apart from the markup so the form component stays readable.
 */
export function useAuthForm(initialMode: AuthMode) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useApp();
  const toast = useToast();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ?mode= picks the tab; ?ref= pre-fills a referral and forces signup.
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'login' || urlMode === 'signup') setMode(urlMode);

    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
      setMode('signup');
    }
  }, [searchParams]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setFieldErrors({});
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (mode === 'signup') {
      if (!agreeTerms) {
        const message = 'Please accept the Terms of Service to create your account.';
        setError(message);
        toast.warning('One more thing', message);
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        const message = `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
        setFieldErrors({ password: message });
        setError(message);
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        // The name, not the email: on a shared machine at a prep centre there
        // is no reason to paint someone's address across the screen.
        const account = await login(email.trim(), password);
        toast.success('Welcome back!', `Good to see you again, ${account.name}.`);
      } else {
        const account = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          referralCode: referralCode.trim() || undefined,
        });
        toast.success('Account created', `Welcome to Prepyo, ${account.name}.`);
      }

      // Only same-origin redirects, so ?next= cannot bounce you off-site.
      const next = searchParams.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (err) {
      const message = errorMessage(err);
      if (err instanceof ApiError && err.fields) setFieldErrors(err.fields);
      setError(message);
      toast.error(mode === 'login' ? 'Could not sign you in' : 'Could not create your account', message);
    } finally {
      setLoading(false);
    }
  };

  return {
    mode,
    switchMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    agreeTerms,
    setAgreeTerms,
    loading,
    error,
    fieldErrors,
    submit,
  };
}

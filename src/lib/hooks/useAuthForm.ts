import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ApiError, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export type AuthMode = 'login' | 'signup';
export type AuthStep = 'details' | 'code';

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 60;

/** Mirrors nepaliMobile in backend/internal/auth/phone.go. */
const NEPALI_MOBILE = /^9[678]\d{8}$/;

export function localPhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^00/, '');
  return digits.length > 10 ? digits.replace(/^977/, '') : digits;
}

export function isValidPhone(raw: string): boolean {
  return NEPALI_MOBILE.test(localPhoneDigits(raw));
}

export function useAuthForm(initialMode: AuthMode) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { requestOtp, verifyOtp } = useApp();
  const toast = useToast();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>('details');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resendIn, setResendIn] = useState(0);

  const isSignup = mode === 'signup';

  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'login' || urlMode === 'signup') setMode(urlMode);

    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
      setMode('signup');
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(seconds => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const clearErrors = () => {
    setError(null);
    setFieldErrors({});
  };

  const fail = (err: unknown, title: string) => {
    const message = errorMessage(err);
    if (err instanceof ApiError && err.fields) setFieldErrors(err.fields);
    setError(message);
    toast.error(title, message);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setStep('details');
    setCode('');
    setResendIn(0);
    clearErrors();
  };

  const sendCode = async () => {
    clearErrors();

    const problems: Record<string, string> = {};
    if (isSignup && !name.trim()) problems.name = 'Enter your name.';
    if (isSignup && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      problems.email = 'Enter a valid email address.';
    }
    if (!isValidPhone(phone)) {
      problems.phone = 'Enter a Nepali mobile number, for example 9801234567.';
    }
    if (!agreeTerms) {
      problems.terms = isSignup
        ? 'Please accept the Terms of Service and Privacy Policy to create your account.'
        : 'Please accept the Terms of Service and Privacy Policy to sign in.';
    }
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems);
      setError(Object.values(problems)[0]);
      return;
    }

    setLoading(true);
    try {
      const { registered } = await requestOtp(localPhoneDigits(phone));

      if (isSignup && registered) {
        const message = 'That number already has an account. Sign in instead.';
        setFieldErrors({ phone: message });
        setError(message);
        return;
      }
      if (!isSignup && !registered) {
        const message = 'No account uses that number yet. Create one first.';
        setFieldErrors({ phone: message });
        setError(message);
        return;
      }

      setStep('code');
      setResendIn(RESEND_SECONDS);
      setCode('');
      toast.success('Code sent', `We texted a ${OTP_LENGTH}-digit code to ${localPhoneDigits(phone)}.`);
    } catch (err) {
      fail(err, 'Could not send the code');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    clearErrors();

    if (code.trim().length !== OTP_LENGTH) {
      const message = `Enter the ${OTP_LENGTH}-digit code we sent you.`;
      setFieldErrors({ code: message });
      setError(message);
      return;
    }

    setLoading(true);
    try {
      const account = await verifyOtp({
        phone: localPhoneDigits(phone),
        code: code.trim(),
        name: isSignup ? name.trim() : undefined,
        email: isSignup ? email.trim() : undefined,
        referralCode: referralCode.trim() || undefined,
      });

      toast.success(
        isSignup ? 'Account created' : 'Welcome back!',
        isSignup ? `Welcome to Prepyo, ${account.name}.` : `Good to see you again, ${account.name}.`,
      );

      // Only same-origin redirects, so ?next= cannot bounce you off-site.
      const next = searchParams.get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (err) {
      fail(err, isSignup ? 'Could not create your account' : 'Could not sign you in');
    } finally {
      setLoading(false);
    }
  };

  const editDetails = () => {
    clearErrors();
    setStep('details');
    setCode('');
    setResendIn(0);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step === 'details') {
      await sendCode();
      return;
    }
    await confirmCode();
  };

  return {
    mode,
    isSignup,
    switchMode,
    step,
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    code,
    setCode,
    agreeTerms,
    setAgreeTerms,
    loading,
    error,
    fieldErrors,
    resendIn,
    submit,
    sendCode,
    editDetails,
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;

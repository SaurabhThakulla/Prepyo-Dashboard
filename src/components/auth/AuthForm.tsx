import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Phone, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthFormState, OTP_LENGTH, localPhoneDigits } from '@/lib/hooks/useAuthForm';

export default function AuthForm({ form }: { form: AuthFormState }) {
  const {
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
  } = form;

  const onCode = step === 'code';

  return (
    <div className="w-full max-w-md mx-auto py-6">
      <div className="space-y-1.5 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          {onCode ? 'Enter your code' : isSignup ? 'Create your account' : 'Sign in to Prepyo'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {onCode
            ? `We sent a ${OTP_LENGTH}-digit code to ${localPhoneDigits(phone)}.`
            : isSignup
              ? 'We verify your mobile number so every account belongs to a real person.'
              : 'Your mobile number is your account. No password to remember.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {onCode ? (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="code" className="text-xs font-bold text-foreground">
                  Verification code
                </label>
                <button
                  type="button"
                  onClick={editDetails}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  {isSignup ? 'Edit details' : 'Change number'}
                </button>
              </div>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={OTP_LENGTH}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="h-12 text-center text-xl font-mono font-bold tracking-[0.5em]"
              />
              {fieldErrors.code && <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.code}</p>}
            </div>

            <div className="text-center">
              {resendIn > 0 ? (
                <span className="text-[11px] text-muted-foreground">
                  Didn&apos;t get it? Resend in {resendIn}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={loading}
                  className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  Send a new code
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {isSignup && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-bold text-foreground">
                    Full name
                  </label>
                  <Input
                    id="name"
                    autoComplete="name"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Sita Sharma"
                    className="h-11 text-sm"
                  />
                  {fieldErrors.name && <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold text-foreground">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sita@example.com"
                    className="h-11 text-sm"
                  />
                  {fieldErrors.email && <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.email}</p>}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-xs font-bold text-foreground">
                Mobile number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm text-muted-foreground pointer-events-none">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono font-semibold">+977</span>
                </span>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus={!isSignup}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="9801234567"
                  className="h-11 pl-[86px] text-sm font-mono tracking-wide"
                />
              </div>
              {fieldErrors.phone && <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.phone}</p>}
            </div>

            <div className="space-y-1">
              <label className="flex items-start gap-2.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                <input
                  id="agreeTerms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 accent-primary cursor-pointer"
                />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary font-semibold hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="text-[11px] text-rose-500 font-medium pl-6">{fieldErrors.terms}</p>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-11 font-bold text-sm gap-2 shadow-md">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : onCode ? (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>{isSignup ? 'Create my account' : 'Sign in'}</span>
            </>
          ) : (
            <>
              <span>{isSignup ? 'Send verification code' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {!onCode && (
        <p className="mt-5 text-xs text-center text-muted-foreground">
          {isSignup ? 'Already have an account?' : 'New to Prepyo?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? 'login' : 'signup')}
            className="font-bold text-primary hover:underline"
          >
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      )}

      <p className="mt-3 text-[11px] text-center text-muted-foreground">
        Standard SMS charges may apply. We never share your number.
      </p>
    </div>
  );
}

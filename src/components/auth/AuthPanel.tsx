import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { GoogleAuthState } from '@/lib/hooks/useGoogleAuth';

export default function AuthPanel({ auth }: { auth: GoogleAuthState }) {
  const { buttonRef, agreeTerms, setAgreeTerms, loading, error, buttonReady, configured, blockedClick } = auth;

  return (
    <div className="w-full max-w-md mx-auto py-6">
      <div className="space-y-1.5 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Sign in to Prepyo
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Continue with your Google account. If you are new, your account is created the first time you sign in.
        </p>
      </div>

      <div className="space-y-4">
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
        </div>

        <div className="relative">
          {configured && (
            <div
              ref={buttonRef}
              className={`flex justify-center min-h-[44px] ${loading ? 'pointer-events-none opacity-60' : ''}`}
              aria-busy={!buttonReady}
            />
          )}

          {!agreeTerms && buttonReady && !loading && (
            <button
              type="button"
              onClick={blockedClick}
              aria-label="Accept the Terms of Service and Privacy Policy first"
              className="absolute inset-0 z-10 w-full cursor-not-allowed rounded-full bg-background/50"
            />
          )}

          {configured && !buttonReady && (
            <div className="flex items-center justify-center gap-2 h-11 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading Google sign-in…</span>
            </div>
          )}

          {!configured && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              Google sign-in is not configured for this build. Set VITE_GOOGLE_CLIENT_ID and reload.
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Signing you in…</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}
      </div>

      <p className="mt-5 text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>We only ever see your name and email address.</span>
      </p>
    </div>
  );
}

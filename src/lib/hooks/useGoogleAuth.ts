import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ApiError, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { GoogleCredentialResponse, googleClientId, loadGoogleIdentity } from '@/lib/google';

const TERMS_REQUIRED = 'Please accept the Terms of Service and Privacy Policy to continue.';

export function useGoogleAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithGoogle, theme } = useApp();
  const toast = useToast();

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonReady, setButtonReady] = useState(false);
  const [configured] = useState(() => googleClientId !== '');

  const buttonRef = useRef<HTMLDivElement | null>(null);
  const agreeTermsRef = useRef(agreeTerms);
  const referralCodeRef = useRef('');

  agreeTermsRef.current = agreeTerms;
  referralCodeRef.current = (searchParams.get('ref') ?? '').trim().toUpperCase();

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!agreeTermsRef.current) {
        setError(TERMS_REQUIRED);
        return;
      }
      if (!response.credential) {
        setError('Google did not return a sign-in token. Please try again.');
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const account = await signInWithGoogle(response.credential, referralCodeRef.current || undefined);
        toast.success('Signed in', `Welcome to Prepyo, ${account.name}.`);

        // Only same-origin redirects, so ?next= cannot bounce you off-site.
        const next = searchParams.get('next');
        navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        toast.error('Could not sign you in', message);
        if (err instanceof ApiError && err.status >= 500) {
          console.error('Google sign-in failed:', err);
        }
      } finally {
        setLoading(false);
      }
    },
    [navigate, searchParams, signInWithGoogle, toast],
  );

  const credentialHandler = useRef(handleCredential);
  credentialHandler.current = handleCredential;

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;

    loadGoogleIdentity()
      .then(google => {
        if (cancelled || !buttonRef.current) return;

        google.initialize({
          client_id: googleClientId,
          callback: response => credentialHandler.current(response),
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
          itp_support: true,
        });

        const width = Math.min(Math.max(buttonRef.current.clientWidth, 240), 400);
        buttonRef.current.replaceChildren();
        google.renderButton(buttonRef.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width,
        });

        setButtonReady(true);
      })
      .catch(err => {
        if (cancelled) return;
        console.error(err);
        setError('We could not reach Google sign-in. Check your connection and reload the page.');
      });

    return () => {
      cancelled = true;
    };
  }, [configured, theme]);

  const blockedClick = useCallback(() => {
    setError(TERMS_REQUIRED);
  }, []);

  return {
    buttonRef,
    agreeTerms,
    setAgreeTerms: (next: boolean) => {
      setAgreeTerms(next);
      if (next) setError(current => (current === TERMS_REQUIRED ? null : current));
    },
    loading,
    error,
    buttonReady,
    configured,
    blockedClick,
  };
}

export type GoogleAuthState = ReturnType<typeof useGoogleAuth>;

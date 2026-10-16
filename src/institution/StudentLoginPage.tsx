import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { ApiError, errorMessage } from '@/lib/api';
import { lookUpInstitution, studentLogIn } from './api';
import { LOGIN_PATH } from './paths';
import NotFoundPage from '@/pages/NotFoundPage';
import { InstitutionLoading } from './InstitutionPage';
import InstitutionAuthLayout from './InstitutionAuthLayout';
import FormField, { FormError } from './FormField';
import BrandMark from './BrandMark';

/** Where an institution's students sign in. Shown at /<name> to anyone who is not its admin. */
export default function StudentLoginPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { refreshUser } = useApp();

  // undefined = still looking it up, null = nobody uses this address.
  const [institutionName, setInstitutionName] = useState<string | null | undefined>(undefined);
  const [brand, setBrand] = useState<{ logoUrl?: string; brandColor?: string }>({});
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInstitutionName(undefined);
    lookUpInstitution(code)
      .then(found => {
        if (cancelled) return;
        setBrand({ logoUrl: found.logoUrl, brandColor: found.brandColor });
        setInstitutionName(found.name);
      })
      .catch(err => {
        if (cancelled) return;
        setInstitutionName(null);
        if (!(err instanceof ApiError && err.status === 404)) setError(errorMessage(err, 'Check your internet connection and try again.'));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (institutionName === undefined) return <InstitutionLoading />;

  if (institutionName === null) {
    // No institution has this name, so it is simply an address that does not exist.
    if (!error) return <NotFoundPage />;
    return (
      <InstitutionAuthLayout title="We could not load this page" subtitle={error} mode="login">
        <AdminLink />
      </InstitutionAuthLayout>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await studentLogIn(code, username.trim(), password);
      // The student is now an ordinary signed-in learner; load them and open the app.
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <InstitutionAuthLayout title={institutionName} subtitle={`Student sign-in for ${institutionName}.`} mode="login">
      <div className="mb-5 flex justify-center lg:justify-start">
        <BrandMark name={institutionName} logoUrl={brand.logoUrl} color={brand.brandColor} className="h-14 w-14 rounded-2xl text-lg" />
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField
          label="Username"
          icon={<UserRound />}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="The username your institution gave you"
          value={username}
          onChange={setUsername}
          disabled={submitting}
        />
        <FormField
          label="Password"
          icon={<Lock />}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          value={password}
          onChange={setPassword}
          disabled={submitting}
        />

        <FormError message={error} />

        <Button
          type="submit"
          disabled={submitting}
          style={brand.brandColor ? { backgroundColor: brand.brandColor } : undefined}
          className="group h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/20"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? 'Signing you in…' : 'Sign in'}
          {!submitting && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">Forgot your password? Ask your institution to reset it.</p>
      <AdminLink />
    </InstitutionAuthLayout>
  );
}

function AdminLink() {
  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      Institution admin?{' '}
      <Link to={LOGIN_PATH} className="font-semibold text-primary hover:underline">
        Sign in here
      </Link>
    </p>
  );
}

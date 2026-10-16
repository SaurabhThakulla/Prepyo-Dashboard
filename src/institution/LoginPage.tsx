import React, { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { logIn } from './api';
import { useInstitutionAccount } from './account';
import { dashboardPath, SIGNUP_PATH } from './paths';
import { InstitutionLoading } from './InstitutionPage';
import InstitutionAuthLayout from './InstitutionAuthLayout';
import FormField, { FormError } from './FormField';

export default function LoginPage() {
  const navigate = useNavigate();
  const { account, setAccount } = useInstitutionAccount();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (account === undefined) return <InstitutionLoading />;
  if (account) return <Navigate to={dashboardPath(account.institution.code)} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await logIn(email.trim(), password);
      setAccount(signedIn);
      navigate(dashboardPath(signedIn.institution.code), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InstitutionAuthLayout title="Institution sign-in" subtitle="For the admin of a consultancy or institute." mode="login">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField
          label="Email"
          icon={<Mail />}
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          disabled={submitting}
        />
        <FormField
          label="Password"
          icon={<Lock />}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={password}
          onChange={setPassword}
          disabled={submitting}
        />

        <FormError message={error} />

        <Button type="submit" disabled={submitting} className="group h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/20">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? 'Signing you in…' : 'Sign in'}
          {!submitting && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </Button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
        <p>
          New institution?{' '}
          <Link to={SIGNUP_PATH} className="font-semibold text-primary hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </InstitutionAuthLayout>
  );
}

import { FormEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export const ADMIN_PATH = '/admin';

export function useAdminLogin() {
  const navigate = useNavigate();
  const { signInAsAdmin } = useApp();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (loading) return;

      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setError('Enter the admin email and password.');
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const account = await signInAsAdmin(trimmedEmail, password);
        setPassword('');
        toast.success('Signed in', `Welcome back, ${account.name}.`);
        navigate(ADMIN_PATH, { replace: true });
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        toast.error('Could not sign you in', message);
      } finally {
        setLoading(false);
      }
    },
    [email, loading, navigate, password, signInAsAdmin, toast],
  );

  return { email, setEmail, password, setPassword, loading, error, submit };
}

export type AdminLoginState = ReturnType<typeof useAdminLogin>;

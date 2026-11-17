import { FormEvent, useEffect, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { api, errorMessage } from '@/lib/api';

const MIN_LENGTH = 10;

/** A password box with a show/hide button. */
function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  invalid,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="relative block">
        <Input
          aria-label={label}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          maxLength={72}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={invalid}
          className={`h-11 rounded-xl pr-11 text-sm ${invalid ? 'border-rose-500 focus-visible:ring-rose-500/30' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground"
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

/**
 * Shown over the app, which is blurred and cannot be used, to a consultancy's
 * student who signed in with a generated password: they must choose their own first.
 */
export default function ChooseStudentPassword() {
  const { user, refreshUser, logout } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const longEnough = next.length >= MIN_LENGTH;
  const matches = again.length > 0 && again === next;
  // The page behind must not scroll either: lock it while the card is up.
  useEffect(() => {
    const root = document.documentElement;
    const before = { html: root.style.overflow, body: document.body.style.overflow };
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before.html;
      document.body.style.overflow = before.body;
    };
  }, []);

  // Still typing the start of the new password is not a mismatch yet.
  const mismatch = again.length > 0 && !matches && !next.startsWith(again);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!current) return setError('Enter the password you were given.');
    if (!longEnough) return setError(`Your new password needs at least ${MIN_LENGTH} characters.`);
    if (next === current) return setError('Choose a password different from the one you were given.');
    if (!matches) return setError('The two new passwords are not the same.');
    setBusy(true);
    setError(null);
    try {
      await api.put('/profile/password', { currentPassword: current, newPassword: next });
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-password-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/40 px-4 py-8 backdrop-blur-md"
    >
      <form onSubmit={save} noValidate className="w-full max-w-xl space-y-5 rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 id="choose-password-title" className="text-xl font-semibold text-foreground">
              Choose your own password
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.institution?.name ?? 'Your consultancy'} gave you a password to start with. Set one only you know to continue.
            </p>
          </div>
        </div>

        <PasswordInput label="Password you were given" value={current} onChange={setCurrent} autoComplete="current-password" disabled={busy} autoFocus />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <PasswordInput label="New password" value={next} onChange={setNext} autoComplete="new-password" disabled={busy} />
            <p className={`flex items-center gap-1.5 text-xs ${longEnough ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              {longEnough && <Check className="h-3.5 w-3.5" />} At least {MIN_LENGTH} characters
            </p>
          </div>
          <div className="space-y-1.5">
            <PasswordInput label="New password again" value={again} onChange={setAgain} autoComplete="new-password" disabled={busy} invalid={mismatch} />
            {(matches || mismatch) && (
              <p className={`flex items-center gap-1.5 text-xs ${matches ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {matches && <Check className="h-3.5 w-3.5" />} {matches ? 'Passwords match' : 'Does not match yet'}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => void logout()} className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
          <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:w-auto">
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save and continue
          </Button>
        </div>
      </form>
    </div>
  );
}

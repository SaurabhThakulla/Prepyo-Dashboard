import React, { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Building2, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, errorMessage } from '@/lib/api';
import { signUp, SignupForm } from './api';
import { useInstitutionAccount } from './account';
import { dashboardPath, LOGIN_PATH } from './paths';
import { InstitutionLoading } from './InstitutionPage';
import InstitutionAuthLayout from './InstitutionAuthLayout';
import FormField, { FormError } from './FormField';

// Matches the server's rule, so a short password is caught before it is sent.
export const MIN_PASSWORD_LENGTH = 10;

type Values = SignupForm & { confirm: string };
type Errors = Partial<Record<keyof Values | 'terms', string>>;

const EMPTY: Values = { institutionName: '', name: '', email: '', phone: '', password: '', confirm: '' };

const FIELDS: { field: keyof Values; label: string; type: string; autoComplete: string; placeholder: string; icon: React.ReactNode }[] = [
  { field: 'institutionName', label: 'Institution name', type: 'text', autoComplete: 'organization', placeholder: 'Bright Future Consultancy', icon: <Building2 /> },
  { field: 'name', label: 'Your name', type: 'text', autoComplete: 'name', placeholder: 'Sita Sharma', icon: <User /> },
  { field: 'email', label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com', icon: <Mail /> },
  { field: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', placeholder: '98XXXXXXXX', icon: <Phone /> },
  { field: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', placeholder: `At least ${MIN_PASSWORD_LENGTH} characters`, icon: <Lock /> },
  { field: 'confirm', label: 'Confirm password', type: 'password', autoComplete: 'new-password', placeholder: 'Type it again', icon: <Lock /> },
];

/** What can be checked before asking the server. The server checks again. */
export function findErrors(values: Values, agreed: boolean): Errors {
  const errors: Errors = {};
  if (values.institutionName.trim().length < 3) errors.institutionName = "Enter your institution's name.";
  if (values.name.trim().length < 2) errors.name = 'Enter your own name.';
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a phone number we can reach you on.';
  if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (values.password !== values.confirm) errors.confirm = 'The two passwords do not match.';
  if (!agreed) errors.terms = 'Please accept the Terms of Service and Privacy Policy.';
  return errors;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { account, setAccount } = useInstitutionAccount();

  const [values, setValues] = useState<Values>(EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (account === undefined) return <InstitutionLoading />;
  if (account) return <Navigate to={dashboardPath(account.institution.code)} replace />;

  const setField = (field: keyof Values, value: string) => {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const found = findErrors(values, agreed);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const created = await signUp({
        institutionName: values.institutionName.trim(),
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      setAccount(created);
      navigate(dashboardPath(created.institution.code), { replace: true });
    } catch (err) {
      // The server names the field it rejected; show the message under that field.
      if (err instanceof ApiError && err.fields) setErrors(err.fields as Errors);
      else setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InstitutionAuthLayout
      title="Register your institution"
      subtitle="For consultancies and institutes. Free for 2 students, with reading and listening practice."
      mode="signup"
    >
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        {FIELDS.map(({ field, label, type, autoComplete, placeholder, icon }) => (
          <FormField
            key={field}
            label={label}
            icon={icon}
            type={type}
            autoComplete={autoComplete}
            autoCapitalize={type === 'email' ? 'none' : undefined}
            placeholder={placeholder}
            value={values[field]}
            onChange={value => setField(field, value)}
            error={errors[field]}
            disabled={submitting}
          />
        ))}

        <div className="space-y-1.5 pt-1">
          <label className="flex cursor-pointer select-none items-start gap-2.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={event => {
                setAgreed(event.target.checked);
                setErrors(previous => ({ ...previous, terms: undefined }));
              }}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-primary rounded"
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="font-semibold text-primary hover:underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>.
            </span>
          </label>
          {errors.terms && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{errors.terms}</p>}
        </div>

        <FormError message={formError} />

        <Button type="submit" disabled={submitting} className="h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/20">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-3.5 w-3.5" />}
          {submitting ? 'Registering…' : 'Register institution'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link to={LOGIN_PATH} className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </InstitutionAuthLayout>
  );
}

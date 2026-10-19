import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  onChange: (value: string) => void;
  error?: string;
  /** Drawn inside the field, on the left. */
  icon?: React.ReactNode;
}

// Chrome paints a saved email or password pale blue, which made a filled-in
// form look like a different design. An inset shadow is the only thing that
// covers that colour; the text colour has to be set the same way.
const AUTOFILL =
  'autofill:shadow-[inset_0_0_0_1000px_hsl(var(--card))] autofill:[-webkit-text-fill-color:hsl(var(--foreground))] autofill:[caret-color:hsl(var(--foreground))]';

/** A labelled input with its error message underneath. A password can be shown while typing. */
export default function FormField({ label, onChange, error, icon, type, ...input }: Props) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground flex items-center justify-between">
        <span>{label}</span>
      </label>
      <div className="group relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}
        <Input
          id={id}
          {...input}
          type={isPassword && revealed ? 'text' : type}
          onChange={event => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          className={`h-11 rounded-xl text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/20 ${AUTOFILL} ${
            icon ? 'pl-10' : ''
          } ${isPassword ? 'pr-11' : ''} ${
            error ? 'border-rose-500/60 focus-visible:ring-rose-500/20' : 'hover:border-primary/40 focus-visible:border-primary/60'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed(previous => !previous)}
            disabled={input.disabled}
            aria-label={`${revealed ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            aria-pressed={revealed}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

/** A red box for a message about the whole form. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400 shadow-sm">
      {message}
    </div>
  );
}

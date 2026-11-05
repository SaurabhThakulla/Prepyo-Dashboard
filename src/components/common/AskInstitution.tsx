import { Building2 } from 'lucide-react';

/**
 * Shown to a consultancy's student where others see an "upgrade" button: their
 * plan is the consultancy's, so only the consultancy can renew it.
 */
export default function AskInstitution({ className = '' }: { className?: string }) {
  return (
    <p className={`inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground ${className}`}>
      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Ask your institution to renew its plan to unlock this.
    </p>
  );
}

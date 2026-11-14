import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The bar along the bottom of an IELTS mock paper, edge to edge and kept in
 * view: Save and Exit on the left (the paper stays open to come back to), the
 * paper's own action on the right, and an optional note between.
 * `className` takes the negative margins that cancel the parent's padding.
 */
export default function TestFooter({
  onLeave,
  note,
  children,
  className = '',
}: {
  onLeave: () => void;
  note?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    // !mt-auto: the parent's space-y margin would otherwise stop the bar sinking to the bottom of a short page.
    <div
      className={`sticky bottom-0 z-30 !mt-auto shrink-0 dark test-bar px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.35)] sm:px-6 lg:px-8 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex shrink-0 items-center gap-4">
          <Button variant="ghost" onClick={onLeave} className="test-leave h-10 gap-2 rounded-full px-4 text-sm font-semibold">
            <LogOut className="h-4 w-4" /> <span>Save and Exit</span>
          </Button>
          {note && <span className="hidden h-8 w-px bg-border md:block" aria-hidden />}
        </div>
        {note && <p className="hidden min-w-0 flex-1 text-xs text-muted-foreground md:block">{note}</p>}
        <div className="flex min-w-0 items-center justify-end gap-2">{children}</div>
      </div>
    </div>
  );
}

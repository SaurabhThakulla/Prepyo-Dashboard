import { ReactNode } from 'react';

/**
 * A question page's header: the task badge, its name and instructions, and its
 * actions on the right, on a band the full width of the page. Its parent pads
 * the page `px-4 sm:px-6 lg:px-8`; the band reaches out through that padding.
 */
export default function QuestionHeader({ code, title, children, actions }: {
  code: string;
  title: ReactNode;
  /** Under the title: instructions, the time on a phone. */
  children?: ReactNode;
  /** On the right: chips and buttons, Back to questions last. */
  actions?: ReactNode;
}) {
  return (
    <div className="-mx-4 flex flex-col gap-3 border-b border-primary/10 bg-primary/[0.06] px-4 py-4 sm:-mx-6 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:-mx-8 lg:px-8 dark:bg-white/[0.04]">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 px-2 text-sm font-bold text-primary-foreground shadow-md sm:h-14 sm:min-w-14">
          {code}
        </span>
        <div className="min-w-0 space-y-1 pt-2.5 sm:pt-3.5">
          <h2 className="text-xl sm:text-2xl font-bold text-primary leading-tight">{title}</h2>
          {children}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">{actions}</div>}
    </div>
  );
}

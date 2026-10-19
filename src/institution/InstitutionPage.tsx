import React from 'react';
import { Building2, Loader2 } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}

/** The frame every institution page sits in: Prepyo mark, title, then the page's own content. */
export default function InstitutionPage({ title, subtitle, wide = false, children }: Props) {
  return (
    <div className="min-h-dvh bg-background px-4 py-8 sm:py-12">
      <div className={`mx-auto w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-6 flex items-center gap-2">
          <img src="/prepyo-mark.webp" alt="Prepyo" width={32} height={32} className="h-8 w-8 rounded-xl bg-white object-contain shadow-sm" />
          <span className="font-display text-lg font-black text-foreground">
            prep<span className="text-primary">yo</span>
          </span>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Building2 className="h-3 w-3" />
            Institution
          </span>
        </div>

        <h1 className="break-words font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/** Shown while the session check is still running. */
export function InstitutionLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center gap-2 bg-background text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Loading…</span>
    </div>
  );
}

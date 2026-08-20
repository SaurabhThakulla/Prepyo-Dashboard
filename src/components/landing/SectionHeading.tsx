import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeadingProps {
  /** Small pill above the title, e.g. "Everything you need". */
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  /** Tailwind text colour for the eyebrow icon. */
  eyebrowIconClass?: string;
  title: string;
  description?: string;
}

/**
 * The eyebrow + title + description block every landing section opens with.
 *
 * It exists so the sections stay visually identical: before this, the same
 * markup was pasted into each one and had already drifted apart.
 */
export default function SectionHeading({
  eyebrow,
  eyebrowIcon: Icon,
  eyebrowIconClass = 'text-primary',
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="text-center space-y-3 mb-14">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
        <Icon className={`w-3.5 h-3.5 ${eyebrowIconClass}`} />
        {eyebrow}
      </span>

      <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground">{title}</h2>

      {description && (
        <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">{description}</p>
      )}
    </div>
  );
}

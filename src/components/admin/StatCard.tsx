import React from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface StatOption {
  value: string;
  label: string;
  /** Shown but unselectable — a category that is planned rather than built. */
  disabled?: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  color?: string;
  /** Omit for a plain card. Supplying options turns the label into a filter. */
  options?: StatOption[];
  selected?: string;
  onSelect?: (value: string) => void;
  selectLabel?: string;
}

/**
 * One number on the admin dashboard, optionally narrowed by a dropdown.
 *
 * The dropdown only ever changes which slice of already-loaded data is shown —
 * it does not refetch — so switching between plans or exams is instant and
 * cannot leave the card showing a figure from a different request.
 */
export default function StatCard({
  label,
  value,
  note,
  icon: Icon,
  color = 'text-foreground',
  options,
  selected,
  onSelect,
  selectLabel,
}: StatCardProps) {
  return (
    <Card className="p-5 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground font-semibold">
        <span>{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${color}`} />
      </div>

      <div className={`font-display text-3xl font-black ${color}`}>{value}</div>

      {options && onSelect ? (
        <div className="relative group">
          <select
            aria-label={selectLabel ?? label}
            value={selected}
            onChange={e => onSelect(e.target.value)}
            className="w-full h-8 appearance-none rounded-lg border border-input bg-card pl-2.5 pr-7 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs hover:border-primary/50 transition-all cursor-pointer"
          >
            {options.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{note}</p>
    </Card>
  );
}

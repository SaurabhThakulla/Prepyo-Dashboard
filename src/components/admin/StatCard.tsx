import React from 'react';
import { LucideIcon } from 'lucide-react';
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
        <select
          aria-label={selectLabel ?? label}
          value={selected}
          onChange={e => onSelect(e.target.value)}
          className="w-full h-8 rounded-lg border border-input bg-card px-2 text-[11px] font-semibold text-foreground"
        >
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

      <p className="text-[10px] text-muted-foreground">{note}</p>
    </Card>
  );
}

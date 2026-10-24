import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AnswerOption = string | { value: string; label: string };

interface AnswerSelectProps {
  value: string;
  options: AnswerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  'aria-label'?: string;
  /** Extra trigger classes, e.g. size or correct/wrong colours. */
  className?: string;
  style?: React.CSSProperties;
}

const toOption = (option: AnswerOption) =>
  typeof option === 'string' ? { value: option, label: option } : option;

/** The dropdown used for every answer choice in a question; shows ---- until picked. */
export default function AnswerSelect({
  value,
  options,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  className,
  style,
}: AnswerSelectProps) {
  const items = options.map(toOption);
  const chosen = items.find(item => item.value === value);

  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger
        role="combobox"
        disabled={disabled}
        aria-label={ariaLabel}
        style={style}
        className={cn(
          'group inline-flex h-8 min-w-[7rem] items-center justify-between gap-2 rounded-lg border border-input bg-card pl-3 pr-2 align-middle text-sm font-semibold text-foreground shadow-2xs transition-all hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-80',
          className,
        )}
      >
        <span className={cn('truncate', !chosen && 'font-medium text-muted-foreground')}>
          {chosen ? chosen.label : '----'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={6}
          data-no-dictionary
          className="z-50 max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {items.map(item => {
            const selected = item.value === value;
            return (
              <DropdownMenuPrimitive.Item
                key={item.value}
                role="option"
                aria-selected={selected}
                onSelect={() => onChange(item.value)}
                className={cn(
                  'flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:bg-muted',
                  selected ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground',
                )}
              >
                {item.label}
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </DropdownMenuPrimitive.Item>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

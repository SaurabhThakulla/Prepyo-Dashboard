import React from 'react';
import { initials } from './profile';

interface Props {
  name: string;
  logoUrl?: string;
  color?: string;
  className?: string;
}

/** The institution's logo, or its initials on its brand colour when it has none. */
export default function BrandMark({ name, logoUrl, color, className = 'h-12 w-12 rounded-2xl text-base' }: Props) {
  if (logoUrl) {
    return (
      <span className={`flex shrink-0 items-center justify-center overflow-hidden border border-border bg-white ${className}`}>
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-contain p-1" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{ backgroundColor: color || 'hsl(var(--primary))' }}
      className={`flex shrink-0 items-center justify-center font-display font-black text-white ${className}`}
    >
      {initials(name)}
    </span>
  );
}

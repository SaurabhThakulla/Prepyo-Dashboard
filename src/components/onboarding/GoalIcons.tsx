import React from 'react';

/**
 * Two-tone goal icons drawn for onboarding, in place of stock outline icons.
 * They inherit currentColor: the soft layer is the same colour at low opacity,
 * so they work on the tinted tile and in white on the solid, selected one.
 */
type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function UniversityIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 9.5 12 4l9 5.5H3Z" fill="currentColor" fillOpacity={0.22} />
      <path d="M6 12v5.5M10 12v5.5M14 12v5.5M18 12v5.5" />
      <path d="M4.5 17.5h15M3 20.5h18" />
      <circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PassportIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2.2" fill="currentColor" fillOpacity={0.22} />
      <g strokeWidth={1.4}>
        <circle cx="12" cy="10" r="3.6" />
        <ellipse cx="12" cy="10" rx="1.5" ry="3.6" />
        <path d="M8.4 10h7.2" />
      </g>
      <path d="M9 17h6" />
    </svg>
  );
}

export function BriefcaseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" fill="currentColor" fillOpacity={0.22} />
      <path d="M9 7V5.6C9 4.7 9.7 4 10.6 4h2.8c.9 0 1.6.7 1.6 1.6V7" />
      <path d="M3 12.5h7.5M13.5 12.5H21" />
      <rect x="10.5" y="11" width="3" height="3" rx="0.8" fill="currentColor" />
    </svg>
  );
}

export function FlagIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6.5 4.5h11l-2.8 3.75 2.8 3.75h-11" fill="currentColor" fillOpacity={0.22} />
      <path d="M6.5 21V3.5" />
      <path d="M3.5 21h7" />
    </svg>
  );
}

// Skill icons for the focus step, in the same two-tone style.

export function SpeakingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" fillOpacity={0.22} />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M9 21h6" />
    </svg>
  );
}

export function WritingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="3" width="12" height="17" rx="2" fill="currentColor" fillOpacity={0.22} />
      <path d="M7.5 8h5M7.5 11.5h3" />
      <path d="m20.2 9.8-6.9 6.9-2.8.7.7-2.8 6.9-6.9a1.5 1.5 0 0 1 2.1 2.1Z" />
    </svg>
  );
}

export function ReadingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 6.5C10.3 5 8 4.5 3.5 4.5v14c4.5 0 6.8.5 8.5 2 1.7-1.5 4-2 8.5-2v-14C16 4.5 13.7 5 12 6.5Z" fill="currentColor" fillOpacity={0.22} />
      <path d="M12 6.5v14" />
    </svg>
  );
}

export function ListeningIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3.5" y="13.5" width="4.5" height="7" rx="1.8" fill="currentColor" fillOpacity={0.22} />
      <rect x="16" y="13.5" width="4.5" height="7" rx="1.8" fill="currentColor" fillOpacity={0.22} />
    </svg>
  );
}

// Experience-step icons.

export function SproutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20v-8" />
      <path d="M12 12C12 8.5 9.5 6 5 6c0 4 2.5 6.5 7 6Z" fill="currentColor" fillOpacity={0.22} />
      <path d="M12 10c0-3 2.2-5.5 7-5.5 0 3.8-2.4 6.2-7 5.5Z" fill="currentColor" fillOpacity={0.22} />
      <path d="M7.5 20h9" />
    </svg>
  );
}

export function RetakeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="5.2" fill="currentColor" fillOpacity={0.22} stroke="none" />
      <path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9" />
      <path d="M19.5 4.5V9H15" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15" />
      <path d="M4.5 19.5V15H9" />
    </svg>
  );
}

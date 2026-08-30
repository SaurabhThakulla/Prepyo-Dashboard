'use client';

import React from 'react';

const BUTTON_CLASS =
  'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-xs sm:text-sm font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer';

/** Brand marks, kept here so they do not clutter the form. */
const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.79-11.72-14.24-5.33-8.39-9.58-18.06-12.74-29.02-3.17-10.96-4.76-21.46-4.76-31.5 0-14.42 3.65-26.3 10.96-35.64 7.3-9.34 16.59-14.12 27.84-14.34 4.58 0 9.77 1.25 15.57 3.75 5.8 2.5 9.78 3.75 11.95 3.75 1.96 0 6.04-1.29 12.24-3.87 6.2-2.58 11.66-3.76 16.39-3.53 12.63.65 22.84 5.44 30.63 14.36-10.99 6.64-16.38 15.67-16.17 27.09.22 8.92 3.64 16.33 10.27 22.25 6.63 5.92 14.41 9.4 23.34 10.45-2.39 7.08-5.26 13.9-8.61 20.47zM119.22 31.02c0-7.18 2.61-13.82 7.83-19.92 5.22-6.1 11.64-9.98 19.26-11.1-1.09 7.4-4.03 14.04-8.82 19.92-4.79 5.88-10.88 9.58-18.27 11.1z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PROVIDERS = [
  { name: 'Google', Icon: GoogleIcon },
  { name: 'Apple', Icon: AppleIcon },
  { name: 'Facebook', Icon: FacebookIcon },
];

/** Placeholder social buttons — no OAuth provider is wired up yet. */
export default function SocialSignInButtons({ onSelect }: { onSelect: (provider: string) => void }) {
  return (
    <div className="space-y-2.5 pt-0.5">
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {PROVIDERS.map(({ name, Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className={BUTTON_CLASS}
            title={`Continue with ${name}`}
          >
            <Icon />
            <span className="truncate">{name}</span>
          </button>
        ))}
      </div>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase">
          <span className="bg-background px-2 text-muted-foreground font-bold tracking-wider">
            or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}

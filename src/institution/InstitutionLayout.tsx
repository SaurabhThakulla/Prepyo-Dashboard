import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard, Loader2, LogOut, LucideIcon, Menu, Settings, Users, X } from 'lucide-react';
import { formatExamDate } from '@/lib/dates';
import { InstitutionAccount, PLANS } from './api';
import { sectionPath } from './paths';
import BrandMark from './BrandMark';

export type InstitutionSection = 'overview' | 'students' | 'settings';

const NAV: { id: InstitutionSection; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface Props {
  account: InstitutionAccount;
  title: string;
  signingOut: boolean;
  onSignOut: () => void;
  children: React.ReactNode;
}

/** The signed-in institution admin's frame: blue sidebar on desktop, a slide-in menu on phones. */
export default function InstitutionLayout({ account, title, signingOut, onSignOut, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { institution } = account;

  // Picking a page closes the phone menu.
  useEffect(() => setMenuOpen(false), [pathname]);

  const sidebar = <Sidebar account={account} signingOut={signingOut} onSignOut={onSignOut} />;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:flex">{sidebar}</div>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border"
        >
          <Menu className="h-4 w-4" />
        </button>
        <BrandMark name={institution.name} logoUrl={institution.logoUrl} color={institution.profile.brandColor} className="h-8 w-8 rounded-lg text-xs" />
        <span className="min-w-0 truncate font-display text-sm font-bold">{institution.name}</span>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="relative flex w-72 max-w-[85vw]">
            {sidebar}
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button type="button" aria-label="Close menu" className="flex-1 bg-black/60" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="break-words font-display text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{institution.name}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ account, signingOut, onSignOut }: { account: InstitutionAccount; signingOut: boolean; onSignOut: () => void }) {
  const { institution, admin } = account;
  const plan = institution.plan ? PLANS[institution.plan] : null;

  return (
    <aside className="flex h-full w-full flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#2a56cf] via-primary to-[#132e7d] text-white dark:from-blue-950 dark:via-blue-950 dark:to-slate-950">
      <div className="space-y-5 px-4 pt-5">
        <div className="flex items-center gap-2">
          <img src="/prepyo-mark.webp" alt="Prepyo" width={28} height={28} className="h-7 w-7 rounded-lg bg-white object-contain" />
          <span className="font-display text-base font-black">prepyo</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            <Building2 className="h-3 w-3" /> Institution
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-2.5 pr-3">
          <BrandMark
            name={institution.name}
            logoUrl={institution.logoUrl}
            color={institution.profile.brandColor}
            className="h-10 w-10 shrink-0 rounded-xl text-sm ring-2 ring-white/40"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-bold leading-tight">{institution.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-white/65">{admin.name}</p>
          </div>
        </div>

        <nav aria-label="Institution" className="space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={sectionPath(institution.code, id)}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-white text-primary shadow-md shadow-black/15 dark:text-blue-950' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="space-y-2 p-4">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Plan</p>
          <p className="mt-0.5 font-display text-sm font-bold">{plan ? `${plan.name} · ${institution.seatLimit} students` : 'No plan yet'}</p>
          {institution.validUntil && (
            <p className="mt-0.5 text-white/70">
              {institution.status === 'expired' ? 'Ended' : 'Until'} {formatExamDate(institution.validUntil)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Sign out
        </button>
      </div>
    </aside>
  );
}

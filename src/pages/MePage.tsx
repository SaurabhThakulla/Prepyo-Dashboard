import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  Bug,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  Flame,
  Gauge,
  Gift,
  History,
  LogOut,
  LucideIcon,
  MessageSquare,
  MessageSquareWarning,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReportIssueDialog from '@/components/support/ReportIssueDialog';
import { ExamSwitcher } from '@/components/layout/sidebar/SecondaryPanel';
import { profileImageUrl } from '@/lib/api';
import { accountLines } from '@/lib/account';
import { EXAM_LABELS, isAdmin, isPremiumUser } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Row {
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  tint: string;
  href?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  /** Makes the row an on/off switch. */
  checked?: boolean;
}

/**
 * The phone's "Me" tab: everything about the learner's account in one list.
 *
 * On a desktop these live in the header and the avatar menu. A phone has room
 * for neither, so they are gathered here the way a native app's profile tab
 * gathers them.
 */
export default function MePage() {
  const navigate = useNavigate();
  const { user, activeExam, setActiveExam, setIsTutorOpen, theme, toggleTheme, logout } = useApp();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;
  const admin = isAdmin(user);
  const premium = isPremiumUser(user);
  const plan = user.subscription;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate('/login');
      setSigningOut(false);
    }
  };

  const account: Row[] = [
    { label: 'Profile & goals', sublabel: 'Target score, exam date, photo', icon: UserRound, tint: 'text-sky-600 bg-sky-500/10', href: '/profile' },
    admin
      ? { label: 'Plan management', sublabel: 'Approve payments and grant plans', icon: CreditCard, tint: 'text-violet-600 bg-violet-500/10', href: '/admin/payments' }
      : {
          label: 'Your plan',
          sublabel: plan?.planName ? `${plan.planName} · ${plan.isActive ? 'Active' : 'Expired'}` : 'Plans, quotas and billing',
          icon: CreditCard,
          tint: 'text-violet-600 bg-violet-500/10',
          href: '/subscription',
        },
    { label: 'Earn rewards', sublabel: 'Invite friends, get free days', icon: Gift, tint: 'text-rose-600 bg-rose-500/10', href: '/referrals' },
    admin
      ? { label: 'Issue reports', sublabel: 'What learners have reported', icon: MessageSquareWarning, tint: 'text-amber-600 bg-amber-500/10', href: '/admin/reports' }
      : { label: 'My reports', sublabel: 'Issues you have reported', icon: MessageSquare, tint: 'text-amber-600 bg-amber-500/10', href: '/reports' },
  ];

  const study: Row[] = [
    { label: 'Practice history', sublabel: 'All questions you have practiced', icon: History, tint: 'text-orange-600 bg-orange-500/10', href: '/history' },
    { label: 'Ask the AI tutor', sublabel: 'Ask anything about the exam', icon: Bot, tint: 'text-emerald-600 bg-emerald-500/10', onClick: () => setIsTutorOpen(true) },
    // The Learn tab holds the videos for every exam but EPS-TOPIK, where it
    // holds the Korean course instead.
    ...(activeExam === 'EPS_TOPIK'
      ? [{ label: 'Video lessons', sublabel: `${EXAM_LABELS[activeExam]} masterclasses`, icon: Video, tint: 'text-red-600 bg-red-500/10', href: '/tutorials' }]
      : []),
    { label: 'Diagnostic test', sublabel: '15-minute baseline', icon: Gauge, tint: 'text-cyan-600 bg-cyan-500/10', href: '/diagnostic' },
  ];

  const app: Row[] = [
    {
      label: 'Dark mode',
      icon: Moon,
      tint: 'text-slate-600 bg-slate-500/10 dark:text-slate-300',
      onClick: toggleTheme,
      checked: theme === 'dark',
      trailing: <Switch on={theme === 'dark'} />,
    },
    { label: 'Report an issue', sublabel: 'Something broken or wrong?', icon: Bug, tint: 'text-amber-600 bg-amber-500/10', onClick: () => setIsReportOpen(true) },
    { label: 'Terms & privacy', icon: FileText, tint: 'text-slate-600 bg-slate-500/10 dark:text-slate-300', href: '/terms' },
  ];

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-5 sm:py-8">
      <Link
        to="/profile"
        className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm transition-transform active:scale-[0.99]"
      >
        <Avatar className="h-16 w-16 ring-4 ring-primary/10">
          {user.avatarUpdatedAt && <AvatarImage src={profileImageUrl('avatar', user.avatarUpdatedAt)} alt="" />}
          <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
            {user.name?.charAt(0)?.toUpperCase() || 'L'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold text-foreground">{user.name || 'Learner'}</div>
          {accountLines(user).map(line => (
            <div key={line} className="truncate text-xs text-muted-foreground">
              {line}
            </div>
          ))}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              <Sparkles className="h-3 w-3" /> {user.xp ?? 0} XP
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
              <Flame className="h-3 w-3" /> {user.streakDays ?? 0}d streak
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {EXAM_LABELS[activeExam]}
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>

      {admin ? (
        <section className="space-y-2 rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> Exam you are authoring for
          </div>
          <ExamSwitcher activeExam={activeExam} onChange={setActiveExam} />
        </section>
      ) : (
        !premium && (
          <Link
            to="/subscription"
            className="relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-indigo-600 p-4 text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Crown className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base font-bold">Upgrade your plan</span>
              <span className="block text-xs opacity-85">More AI gradings, full mocks and Help in English</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-85" />
          </Link>
        )
      )}

      <RowGroup title="Account" rows={account} />
      <RowGroup title="Study tools" rows={study} />
      <RowGroup title="App" rows={app} />

      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm font-semibold text-destructive transition-colors active:bg-destructive/10 disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      <ReportIssueDialog open={isReportOpen} onOpenChange={setIsReportOpen} />
    </div>
  );
}

function RowGroup({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <ul className="divide-y divide-border/70 overflow-hidden rounded-3xl border border-border bg-card">
        {rows.map(row => {
          const Icon = row.icon;
          const body = (
            <>
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', row.tint)}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-foreground">{row.label}</span>
                {row.sublabel && <span className="block truncate text-xs text-muted-foreground">{row.sublabel}</span>}
              </span>
              {row.trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </>
          );
          const className =
            'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 transition-colors active:bg-muted/70 [-webkit-tap-highlight-color:transparent]';
          return (
            <li key={row.label}>
              {row.href ? (
                <Link to={row.href} className={className}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={row.onClick}
                  className={className}
                  role={row.checked === undefined ? undefined : 'switch'}
                  aria-checked={row.checked}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
    </span>
  );
}

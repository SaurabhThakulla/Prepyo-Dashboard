import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useLeaderboard, LeaderboardPeriod } from '@/lib/hooks/useLeaderboard';
import {
  Trophy,
  Flame,
  MapPin,
  Crown,
  CalendarDays,
  ChevronDown,
  LucideIcon,
} from 'lucide-react';
import { LeaderboardPageSkeleton } from '@/components/layout/PageSkeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LeaderboardEntry } from '@/lib/types';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

/** Matches the Period constants in backend/internal/leaderboards. */
const PERIODS: LeaderboardPeriod[] = ['weekly', 'monthly', 'all-time'];
const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  weekly: 'This week',
  monthly: 'This month',
  'all-time': 'All time',
};

export default function LeaderboardPage() {
  const { activeExam } = useApp();
  const toast = useToast();
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');

  const { data, isPending, error } = useLeaderboard(activeExam, selectedRegion, period);

  const leaderboard = data?.leaderboard ?? [];
  // The list of districts comes from the API so it cannot drift from the ones
  // the query actually filters on.
  const regions = data?.regions?.length ? data.regions : ['all'];
  const loading = isPending;

  // Reported once per failure rather than on every render.
  useEffect(() => {
    if (error) toast.error('Could not load the leaderboard', errorMessage(error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const podium = (entry: LeaderboardEntry | undefined, place: 1 | 2 | 3) => {
    if (!entry) return null;
    const isFirst = place === 1;
    return (
      <Card
        className={
          isFirst
            ? 'min-w-0 p-2.5 sm:p-6 text-center space-y-2 sm:space-y-3 border-amber-500/40 bg-card/90 shadow-xl relative -translate-y-2'
            : 'min-w-0 p-2.5 sm:p-5 text-center space-y-2 sm:space-y-3 border-border'
        }
      >
        {isFirst && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
            <Crown className="w-3 h-3 fill-slate-950" /> #1<span className="hidden sm:inline"> Leader</span>
          </div>
        )}
        <div
          className={
            isFirst
              ? 'w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-lg sm:text-xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20'
              : `w-9 h-9 sm:w-12 sm:h-12 rounded-full font-black text-base sm:text-lg flex items-center justify-center mx-auto shadow-md ${
                  place === 2 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                }`
          }
        >
          {place}
        </div>
        <div className="min-w-0">
          <CardTitle className={`truncate ${isFirst ? 'text-sm sm:text-lg' : 'text-xs sm:text-base'}`}>
            {entry.name}
          </CardTitle>
          {entry.isYou && <Badge variant="indigo" className="text-[9px]">You</Badge>}
          <CardDescription className="flex min-w-0 items-center justify-center gap-1 mt-0.5 text-[10px] sm:text-xs">
            <MapPin className={`w-3 h-3 shrink-0 ${isFirst ? 'text-amber-500' : 'text-primary'}`} />
            <span className="truncate">{entry.nepalRegion}</span>
          </CardDescription>
        </div>
        {/* A phone has room for the one number the board is ranked by. */}
        <p className={`sm:hidden font-display text-sm font-black ${isFirst ? 'text-amber-500' : 'text-primary'}`}>
          {entry.xp} <span className="text-[10px] font-bold text-muted-foreground">XP</span>
        </p>
        <div className="hidden sm:flex p-2.5 rounded-xl bg-background border border-border justify-around text-xs font-bold">
          <div>
            <span className="text-[10px] text-muted-foreground block">XP</span>
            <span className={isFirst ? 'text-amber-500 font-extrabold' : 'text-primary'}>{entry.xp}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Streak</span>
            <span className="text-amber-500">{entry.streakDays}d</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Level</span>
            <span className="text-foreground font-extrabold">{entry.level}</span>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-10">

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Nepal Leaderboard</h1>
            <Badge variant="indigo">Ranked by XP</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeExam} learners ranked by XP earned from practice, mocks and evaluations.
          </p>
        </div>

        {/* Both filters are menus: the districts are too many to lay out in a row. */}
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:shrink-0">
          <FilterMenu
            icon={CalendarDays}
            label="Period"
            value={period}
            options={PERIODS.map(p => ({ value: p, label: PERIOD_LABELS[p] }))}
            onChange={value => setPeriod(value as LeaderboardPeriod)}
          />
          <FilterMenu
            icon={MapPin}
            label="District"
            value={selectedRegion}
            options={regions.map(reg => ({ value: reg, label: reg === 'all' ? 'All Nepal' : reg }))}
            onChange={setSelectedRegion}
            align="end"
          />
        </div>
      </div>

      {loading ? (
        <LeaderboardPageSkeleton bare />
      ) : leaderboard.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto" />
          <CardTitle className="text-base">Nobody on the board yet</CardTitle>
          <CardDescription>
            {period === 'all-time'
              ? 'Earn XP from practice and mock exams to be the first one ranked here.'
              : `No XP has been earned in this ${period === 'weekly' ? 'week' : 'month'} yet.`}
          </CardDescription>
        </Card>
      ) : (
        <>
          {top3.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4">
              {podium(top3[1], 2)}
              {podium(top3[0], 1)}
              {podium(top3[2], 3)}
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {(top3.length >= 3 ? rest : leaderboard).map(u => (
                <div
                  key={u.userId}
                  className={`flex items-center justify-between gap-3 px-3.5 py-3 sm:p-4 sm:px-6 transition-colors text-xs ${
                    u.isYou ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
                    <span className="font-display font-bold text-sm text-muted-foreground min-w-[1.75rem] shrink-0">#{u.rank}</span>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback>{u.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span className="truncate">{u.name}</span>
                        {u.isYou && <Badge variant="indigo" className="shrink-0 text-[9px]">You</Badge>}
                      </h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0 text-primary" />
                        <span className="truncate">{u.nepalRegion} • Level {u.level}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <span className="text-[10px] text-muted-foreground block">Streak</span>
                      <span className="font-bold text-amber-400 flex items-center gap-0.5 justify-end">
                        <Flame className="w-3 h-3 fill-amber-400" /> {u.streakDays}d
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Total XP</span>
                      <span className="font-display font-black text-sm text-primary whitespace-nowrap">{u.xp} XP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/** One filter as a menu: what it filters, the current choice, and the list on tap. */
function FilterMenu({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  align = 'start',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  align?: 'start' | 'end';
}) {
  const current = options.find(option => option.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${current?.label ?? value}`}
          className="group flex h-12 w-full min-w-0 items-center gap-2.5 rounded-2xl border border-border bg-card px-3 text-left shadow-sm transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary/50 sm:w-48 [-webkit-tap-highlight-color:transparent]"
        >
          <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">{label}</span>
            <span className="mt-1 block truncate text-sm font-bold leading-tight text-foreground">{current?.label ?? value}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] min-w-[max(11rem,var(--radix-dropdown-menu-trigger-width))] overflow-y-auto"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map(option => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="py-2.5 text-sm sm:py-2 sm:text-xs">
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

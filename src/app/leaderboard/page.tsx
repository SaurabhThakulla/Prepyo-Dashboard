'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Trophy,
  Flame,
  MapPin,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LeaderboardEntry } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import leaderboardRankingsData from '@/data/leaderboard-rankings.json';

type Period = 'weekly' | 'monthly' | 'all-time';

/** Matches the Period constants in backend/internal/leaderboards. */
const PERIODS: Period[] = ['weekly', 'monthly', 'all-time'];

export default function LeaderboardPage() {
  const { activeExam } = useApp();
  const toast = useToast();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    leaderboardRankingsData.topStudents.map(s => ({
      userId: `user-${s.rank}`,
      name: s.name,
      exam: activeExam,
      level: Math.floor(s.weeklyXp / 400) + 1,
      xp: s.weeklyXp,
      streakDays: s.streakDays,
      rank: s.rank,
      isYou: s.isCurrentUser,
      nepalRegion: s.district,
    }))
  );
  const [regions, setRegions] = useState<string[]>(['all', 'Kathmandu', 'Kaski', 'Lalitpur', 'Morang', 'Chitwan']);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [period, setPeriod] = useState<Period>('all-time');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ leaderboard: LeaderboardEntry[]; regions: string[] }>('/leaderboards', {
        exam: activeExam,
        region: selectedRegion === 'all' ? undefined : selectedRegion,
        period,
      })
      .then(data => {
        if (cancelled) return;
        if (data.leaderboard?.length) setLeaderboard(data.leaderboard);
        if (data.regions?.length) setRegions(data.regions);
      })
      .catch(() => {
        // Fallback provided by leaderboard-rankings.json
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam, selectedRegion, period]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const podium = (entry: LeaderboardEntry | undefined, place: 1 | 2 | 3) => {
    if (!entry) return null;
    const isFirst = place === 1;
    return (
      <Card
        className={
          isFirst
            ? 'p-6 text-center space-y-3 order-1 md:order-2 border-amber-500/40 bg-card/90 shadow-xl relative -translate-y-2'
            : `p-5 text-center space-y-3 border-border ${place === 2 ? 'order-2 md:order-1' : 'order-3'}`
        }
      >
        {isFirst && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
            <Crown className="w-3 h-3 fill-slate-950" /> #1 Leader
          </div>
        )}
        <div
          className={
            isFirst
              ? 'w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20'
              : `w-12 h-12 rounded-full font-black text-lg flex items-center justify-center mx-auto shadow-md ${
                  place === 2 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                }`
          }
        >
          {place}
        </div>
        <div>
          <CardTitle className={isFirst ? 'text-lg' : 'text-base'}>
            {entry.name}
            {entry.isYou && <Badge variant="indigo" className="ml-2 text-[9px]">You</Badge>}
          </CardTitle>
          <CardDescription className="flex items-center justify-center gap-1 mt-0.5">
            <MapPin className={`w-3 h-3 ${isFirst ? 'text-amber-500' : 'text-primary'}`} /> {entry.nepalRegion}
          </CardDescription>
        </div>
        <div className="p-2.5 rounded-xl bg-background border border-border flex justify-around text-xs font-bold">
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
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Nepal Leaderboard</h1>
            <Badge variant="indigo">Ranked by XP</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeExam} learners ranked by XP earned from practice, mocks and evaluations.
          </p>
        </div>

        <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
          {PERIODS.map(p => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? 'default' : 'ghost'}
              onClick={() => setPeriod(p)}
              className="text-xs font-bold capitalize h-8"
            >
              {p === 'all-time' ? 'All time' : p}
            </Button>
          ))}
        </div>
      </div>

      {/* Region Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-muted/40 p-2.5 rounded-2xl border border-border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 font-bold shrink-0">
          <MapPin className="w-3.5 h-3.5 text-primary" /> District:
        </div>
        {regions.map(reg => (
          <Button
            key={reg}
            size="sm"
            variant={selectedRegion === reg ? 'default' : 'ghost'}
            onClick={() => setSelectedRegion(reg)}
            className="text-xs font-bold whitespace-nowrap h-8"
          >
            {reg === 'all' ? 'All Nepal' : reg}
          </Button>
        ))}
      </div>

      {loading ? (
        <Card className="text-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
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
                  className={`flex items-center justify-between p-4 px-6 transition-colors text-xs ${
                    u.isYou ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-display font-bold text-sm text-muted-foreground w-6">#{u.rank}</span>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{u.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        {u.name}
                        {u.isYou && <Badge variant="indigo" className="text-[9px]">You</Badge>}
                      </h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" /> {u.nepalRegion} • Level {u.level}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <span className="text-[10px] text-muted-foreground block">Streak</span>
                      <span className="font-bold text-amber-400 flex items-center gap-0.5 justify-end">
                        <Flame className="w-3 h-3 fill-amber-400" /> {u.streakDays}d
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Total XP</span>
                      <span className="font-display font-black text-sm text-primary">{u.xp} XP</span>
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

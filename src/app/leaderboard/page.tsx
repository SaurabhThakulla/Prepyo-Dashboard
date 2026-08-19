'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Trophy,
  Award,
  Flame,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LeaderboardUser } from '@/lib/types';

export default function LeaderboardPage() {
  const { activeExam } = useApp();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'all-time'>('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let url = `/api/v1/leaderboards?exam=${activeExam}`;
    if (selectedRegion !== 'all') url += `&region=${selectedRegion}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLeaderboard(data.leaderboard || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeExam, selectedRegion]);

  const regions = ['all', 'Kathmandu', 'Pokhara', 'Chitwan', 'Lalitpur', 'Butwal', 'Dharan'];
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Nepal National Leaderboard</h1>
            <Badge variant="indigo">🇳🇵 Verified XP</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Top {activeExam} candidates across Kathmandu, Pokhara, and all districts.
          </p>
        </div>

        <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
          {(['weekly', 'monthly', 'all-time'] as const).map(tf => (
            <Button
              key={tf}
              size="sm"
              variant={timeframe === tf ? 'default' : 'ghost'}
              onClick={() => setTimeframe(tf)}
              className="text-xs font-bold capitalize h-8"
            >
              {tf}
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

      {/* Top 3 Podium */}
      {!loading && top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
          
          {/* Rank 2 */}
          <Card className="p-5 text-center space-y-3 order-2 md:order-1 border-border">
            <div className="w-12 h-12 rounded-full bg-slate-300 text-slate-950 font-black text-lg flex items-center justify-center mx-auto shadow-md">
              2
            </div>
            <div>
              <CardTitle className="text-base">{top3[1]?.name}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-primary" /> {top3[1]?.nepalRegion}
              </CardDescription>
            </div>
            <div className="p-2.5 rounded-xl bg-background border border-border flex justify-around text-xs font-bold">
              <div>
                <span className="text-[10px] text-muted-foreground block">XP</span>
                <span className="text-primary">{top3[1]?.xp}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Streak</span>
                <span className="text-amber-400">{top3[1]?.streakDays}d</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Estimate</span>
                <span className="text-white">{top3[1]?.estimatedScore}</span>
              </div>
            </div>
          </Card>

          {/* Rank 1 */}
          <Card className="p-6 text-center space-y-3 order-1 md:order-2 border-amber-500/40 bg-card/90 shadow-xl relative -translate-y-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
              <Crown className="w-3 h-3 fill-slate-950" /> #1 Leader
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              1
            </div>
            <div>
              <CardTitle className="text-lg">{top3[0]?.name}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-400" /> {top3[0]?.nepalRegion}
              </CardDescription>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border flex justify-around text-xs font-bold">
              <div>
                <span className="text-[10px] text-muted-foreground block">XP</span>
                <span className="text-amber-400 font-extrabold">{top3[0]?.xp}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Streak</span>
                <span className="text-amber-400">{top3[0]?.streakDays}d</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Estimate</span>
                <span className="text-white font-extrabold">{top3[0]?.estimatedScore}</span>
              </div>
            </div>
          </Card>

          {/* Rank 3 */}
          <Card className="p-5 text-center space-y-3 order-3 border-border">
            <div className="w-12 h-12 rounded-full bg-amber-700 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
              3
            </div>
            <div>
              <CardTitle className="text-base">{top3[2]?.name}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-primary" /> {top3[2]?.nepalRegion}
              </CardDescription>
            </div>
            <div className="p-2.5 rounded-xl bg-background border border-border flex justify-around text-xs font-bold">
              <div>
                <span className="text-[10px] text-muted-foreground block">XP</span>
                <span className="text-primary">{top3[2]?.xp}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Streak</span>
                <span className="text-amber-400">{top3[2]?.streakDays}d</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Estimate</span>
                <span className="text-white">{top3[2]?.estimatedScore}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rest of Leaderboard */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rest.map(u => (
              <div key={u.userId} className="flex items-center justify-between p-4 px-6 hover:bg-muted/30 transition-colors text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-display font-bold text-sm text-muted-foreground w-6">#{u.rank}</span>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-sm text-white">{u.name}</h4>
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
        )}
      </Card>
    </div>
  );
}

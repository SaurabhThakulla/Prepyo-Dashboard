'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  User,
  ShieldCheck,
  Flame,
  Award,
  Calendar,
  Save,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function ProfilePage() {
  const { user, setUser, activeExam, setActiveExam } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [targetScore, setTargetScore] = useState(user?.targetScore?.toString() || '79');
  const [examDate, setExamDate] = useState(user?.examDate || '2026-10-15');
  const [region, setRegion] = useState(user?.nepalRegion || 'Kathmandu');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [freezing, setFreezing] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/v1/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          targetScore: parseFloat(targetScore) || 79,
          examDate,
          nepalRegion: region,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFreezeStreak = async () => {
    setFreezing(true);
    try {
      const res = await fetch('/api/v1/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'freeze-streak' }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFreezing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      
      <div className="border-b border-border pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Learner Profile & Goals</h1>
        <p className="text-xs text-muted-foreground">Manage your study targets, exam timelines, and habit preservation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Card */}
        <Card className="p-6 text-center space-y-4">
          <Avatar className="h-20 w-20 mx-auto">
            <AvatarFallback className="text-2xl">{user?.name?.charAt(0) || 'B'}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{user?.name}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </div>

          <div className="p-3 bg-background rounded-xl border border-border flex justify-around text-xs font-bold">
            <div>
              <span className="text-[10px] text-muted-foreground block">Streak</span>
              <span className="text-amber-500">{user?.streakDays || 6}d</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Level</span>
              <span className="text-primary">{user?.level || 5}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Tier</span>
              <span className="text-foreground uppercase">{user?.subscriptionTier || 'pro'}</span>
            </div>
          </div>

          <Button
            onClick={handleFreezeStreak}
            disabled={user?.streakFrozen || freezing}
            variant="outline"
            size="sm"
            className="w-full font-bold text-xs gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{user?.streakFrozen ? '🛡️ Streak Freeze Active' : 'Activate 24h Streak Freeze'}</span>
          </Button>
        </Card>

        {/* Configuration Form */}
        <Card className="md:col-span-2 p-6 space-y-5">
          <CardTitle className="text-base">Study Target Settings</CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Primary Exam</label>
              <select
                value={activeExam}
                onChange={(e) => setActiveExam(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-input bg-card px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="PTE">PTE Academic</option>
                <option value="IELTS">IELTS Academic</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Target Score</label>
              <Input
                type="number"
                step="0.5"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                placeholder={activeExam === 'PTE' ? 'e.g. 79' : 'e.g. 7.5'}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Exam Test Date</label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-foreground">Nepal District / Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-card px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {['Kathmandu', 'Pokhara', 'Chitwan', 'Lalitpur', 'Butwal', 'Dharan', 'Biratnagar'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            {saved ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
              </span>
            ) : <span />}

            <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="font-bold text-xs gap-1.5 shadow-md">
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

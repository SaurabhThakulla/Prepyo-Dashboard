'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { api, errorMessage } from '@/lib/api';
import { ExamType } from '@/lib/types';
import {
  Save,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import userProfileData from '@/data/user-profile.json';

const REGIONS = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Butwal', 'Dharan', 'Biratnagar'];

export default function ProfilePage() {
  const { user, updateProfile } = useApp();
  const toast = useToast();

  const [name, setName] = useState(() => user?.name || userProfileData.profile.name);
  const [targetExam, setTargetExam] = useState<ExamType>(() => user?.targetExam || (userProfileData.profile.activeExam as ExamType));
  const [targetScore, setTargetScore] = useState(() => user?.targetScore != null ? String(user.targetScore) : String(userProfileData.profile.targetBandScore));
  const [examDate, setExamDate] = useState(() => user?.examDate ?? '');
  const [region, setRegion] = useState(() => user?.nepalRegion || userProfileData.profile.city || REGIONS[0]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Seed the form from the account once it has loaded, and re-seed if the
  // account changes underneath us.
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setTargetExam(user.targetExam);
    setTargetScore(user.targetScore != null ? String(user.targetScore) : '');
    setExamDate(user.examDate ?? '');
    setRegion(user.nepalRegion || REGIONS[0]);
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    setFieldErrors({});

    try {
      await updateProfile({
        name: name.trim(),
        targetExam,
        // An empty box means "no target", not zero.
        targetScore: targetScore.trim() === '' ? null : Number(targetScore),
        examDate: examDate || undefined,
        nepalRegion: region,
      });
      setSaved(true);
      toast.success('Profile updated');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const anyErr = err as { fields?: Record<string, string> };
      if (anyErr.fields) setFieldErrors(anyErr.fields);
      toast.error('Could not save your profile', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const subscription = user?.subscription;
  const isPaid = subscription?.planId && subscription.planId !== 'free';
  const planDisplayName = subscription?.planId
    ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1).toLowerCase()
    : 'Free';

  const evalsUsed = subscription?.dailyEvaluationsUsed ?? 0;
  const evalsLimit = subscription?.dailyEvaluationsLimit ?? 3;
  const evalsPercent = Math.min(100, Math.max(0, (evalsUsed / Math.max(1, evalsLimit)) * 100));

  const mocksUsed = subscription?.mockTestsUsed ?? 0;
  const mocksLimit = subscription?.totalMockTestsAllowed ?? 1;
  const mocksPercent = Math.min(100, Math.max(0, (mocksUsed / Math.max(1, mocksLimit)) * 100));

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">

      <div className="border-b border-border pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Learner Profile &amp; Goals</h1>
        <p className="text-xs text-muted-foreground">Manage your study targets and exam timeline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Left Column: Profile Card & Allowance Card */}
        <div className="space-y-5">
          {/* Card 1: User Profile & Stats */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-5 shadow-sm">
            {/* Top row: Squircle Avatar + Name & Email */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-600 to-purple-600 text-white font-black text-2xl shadow-lg shadow-violet-500/25 select-none">
                {user?.name?.charAt(0).toUpperCase() ?? 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg sm:text-xl text-foreground truncate leading-tight">
                  {user?.name || 'Learner'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                  {user?.email || 'learner@prepyo.com'}
                </p>
              </div>
            </div>

            {/* Stat Tiles: LEVEL, PLAN */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Level */}
              <div className="bg-muted/40 dark:bg-background/80 border border-border/70 rounded-2xl py-3.5 px-3 text-center flex flex-col items-center justify-center">
                <span className="text-emerald-500 dark:text-emerald-400 font-extrabold text-xl sm:text-2xl leading-none">
                  {user?.level ?? 1}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground tracking-wider uppercase mt-1.5">
                  LEVEL
                </span>
              </div>

              {/* Plan */}
              <div className="bg-muted/40 dark:bg-background/80 border border-border/70 rounded-2xl py-3.5 px-3 text-center flex flex-col items-center justify-center">
                <span className="text-foreground dark:text-white font-bold text-xl sm:text-2xl leading-none capitalize">
                  {planDisplayName}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground tracking-wider uppercase mt-1.5">
                  PLAN
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Allowance & Upgrade */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-sm text-foreground">
              {isPaid ? "Today's plan allowance" : "Today's free allowance"}
            </h4>

            {/* AI evaluations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/90 font-medium">AI evaluations</span>
                <span className="font-bold text-foreground font-mono">
                  {evalsUsed} / {evalsLimit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted/60 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(evalsPercent, evalsUsed > 0 ? 8 : 4)}%` }}
                />
              </div>
            </div>

            {/* Mock exams */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/90 font-medium">Mock exams</span>
                <span className="font-bold text-foreground font-mono">
                  {mocksUsed} / {mocksLimit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted/60 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(mocksPercent, mocksUsed > 0 ? 8 : 4)}%` }}
                />
              </div>
            </div>

            {/* Upgrade button */}
            <div className="pt-2">
              <Link
                href="/subscription"
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-950/50 hover:border-emerald-500/60 font-bold text-xs sm:text-sm flex items-center justify-center transition-all shadow-sm"
              >
                {isPaid ? 'Manage subscription' : 'Upgrade for unlimited'}
              </Link>
            </div>
          </div>
        </div>

        {/* Settings form */}
        <Card className="md:col-span-2 p-6 space-y-5">
          <CardTitle className="text-base">Study Target Settings</CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Full Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
              {fieldErrors.name && <p className="text-[11px] text-destructive font-medium">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Primary Exam</label>
              <select
                value={targetExam}
                onChange={e => setTargetExam(e.target.value as ExamType)}
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
                step={targetExam === 'PTE' ? '1' : '0.5'}
                min={targetExam === 'PTE' ? 10 : 0}
                max={targetExam === 'PTE' ? 90 : 9}
                value={targetScore}
                onChange={e => setTargetScore(e.target.value)}
                placeholder={targetExam === 'PTE' ? 'e.g. 79 (10–90)' : 'e.g. 7.5 (0–9)'}
              />
              {fieldErrors.targetScore && (
                <p className="text-[11px] text-destructive font-medium">{fieldErrors.targetScore}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Exam Test Date</label>
              <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
              {fieldErrors.examDate && (
                <p className="text-[11px] text-destructive font-medium">{fieldErrors.examDate}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-foreground">Region</label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-card px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            {saved ? (
              <span className="text-xs text-emerald-500 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Profile updated
              </span>
            ) : <span />}

            <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="font-bold text-xs gap-1.5 shadow-md">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving…' : 'Save Changes'}</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

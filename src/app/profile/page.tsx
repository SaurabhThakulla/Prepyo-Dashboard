'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { api, errorMessage } from '@/lib/api';
import { ExamType } from '@/lib/types';
import {
  Save,
  CheckCircle2,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';

const REGIONS = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Butwal', 'Dharan', 'Biratnagar'];

export default function ProfilePage() {
  const { user, updateProfile, logout } = useApp();
  const toast = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [targetExam, setTargetExam] = useState<ExamType>('PTE');
  const [targetScore, setTargetScore] = useState('');
  const [examDate, setExamDate] = useState('');
  const [region, setRegion] = useState(REGIONS[0]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    router.push('/login');
  };

  const subscription = user?.subscription;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">

      <div className="border-b border-border pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Learner Profile &amp; Goals</h1>
        <p className="text-xs text-muted-foreground">Manage your study targets and exam timeline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Account card */}
        <Card className="p-6 text-center space-y-4">
          <Avatar className="h-20 w-20 mx-auto">
            <AvatarFallback className="text-2xl">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{user?.name}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </div>

          <div className="p-3 bg-background rounded-xl border border-border flex justify-around text-xs font-bold">
            <div>
              <span className="text-[10px] text-muted-foreground block">Streak</span>
              <span className="text-amber-500">{user?.streakDays ?? 0}d</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Level</span>
              <span className="text-primary">{user?.level ?? 1}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Plan</span>
              <span className="text-foreground uppercase">{subscription?.planId ?? '—'}</span>
            </div>
          </div>

          {subscription && (
            <div className="p-3 bg-background rounded-xl border border-border text-left space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI evaluations today</span>
                <span className="font-bold text-foreground">
                  {subscription.dailyEvaluationsUsed} / {subscription.dailyEvaluationsLimit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mock exams used</span>
                <span className="font-bold text-foreground">
                  {subscription.mockTestsUsed} / {subscription.totalMockTestsAllowed}
                </span>
              </div>
              {subscription.validUntil && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid until</span>
                  <span className="font-bold text-foreground">{subscription.validUntil}</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-1 space-y-2 text-left">
            <div className="text-[10px] text-muted-foreground">
              Member since {user ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </div>
            <Button
              onClick={handleSignOut}
              disabled={signingOut}
              variant="outline"
              size="sm"
              className="w-full font-bold text-xs gap-1.5"
            >
              {signingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
            </Button>
          </div>
        </Card>

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

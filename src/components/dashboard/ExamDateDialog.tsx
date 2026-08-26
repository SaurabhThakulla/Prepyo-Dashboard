'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar as CalendarIcon,
  Clock,
  Target,
  CheckCircle2,
} from 'lucide-react';

interface ExamDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExamDateDialog({ open, onOpenChange }: ExamDateDialogProps) {
  const { user, activeExam, updateProfile } = useApp();

  const [date, setDate] = useState<string>(user?.examDate || '2026-10-15');
  const [time, setTime] = useState<string>('09:00');
  const [targetScore, setTargetScore] = useState<number>(user?.targetScore || (activeExam === 'PTE' ? 79 : 7.5));
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (user?.examDate) setDate(user.examDate.split('T')[0]);
    if (user?.targetScore) setTargetScore(user.targetScore);
  }, [user, activeExam, open]);

  // Calculate live days left preview
  const calculateDays = (dateStr: string, timeStr: string) => {
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        let hours = 9;
        let minutes = 0;
        if (timeStr && timeStr.includes(':')) {
          const tParts = timeStr.split(':');
          hours = parseInt(tParts[0], 10) || 9;
          minutes = parseInt(tParts[1], 10) || 0;
        }

        const target = new Date(year, month, day, hours, minutes, 0);
        const now = new Date();
        const diffMs = target.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const daysRemaining = calculateDays(date, time);

  // Quick Presets
  const setPresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await updateProfile({
        targetExam: activeExam,
        targetScore,
        examDate: date,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onOpenChange(false);
      }, 900);
    } catch (err) {
      console.error('Failed to save exam date and time:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card dark:bg-[#12161c] border border-border dark:border-white/10 text-foreground dark:text-white p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-[#00e599]/10 border border-emerald-500/20 dark:border-[#00e599]/20 flex items-center justify-center text-emerald-600 dark:text-[#00e599]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Change Exam Date & Time
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Set your scheduled {activeExam} test date and time to accurately calibrate your study plan and countdown.
          </DialogDescription>
        </DialogHeader>

        {/* Live Countdown Preview Card */}
        <div className="bg-muted/40 dark:bg-[#181c24] border border-border dark:border-white/10 rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Countdown Preview</div>
            <div className="text-xs text-muted-foreground">
              Target: <span className="font-semibold text-foreground">{date || 'Select Date'}</span> at <span className="font-semibold text-foreground">{time || '09:00'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-emerald-600 dark:text-[#00e599] leading-none">{daysRemaining}</div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground">Days Left</div>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          {/* Quick Date Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Presets</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '30 Days', days: 30 },
                { label: '45 Days', days: 45 },
                { label: '55 Days', days: 55 },
                { label: '90 Days', days: 90 },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPresetDays(preset.days)}
                  className="py-1.5 px-2 rounded-lg bg-card dark:bg-[#181c24] hover:bg-muted dark:hover:bg-[#222733] border border-border dark:border-white/5 text-[11px] font-medium text-foreground dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-white transition-all text-center"
                >
                  +{preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exam Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00e599]" />
              <span>Official Exam Date</span>
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-card dark:bg-[#181c24] border-border dark:border-white/10 text-foreground dark:text-white focus-visible:ring-emerald-500 dark:focus-visible:ring-[#00e599] text-xs h-10 rounded-xl"
            />
          </div>

          {/* Exam Time / Slot Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00e599]" />
              <span>Exam Time / Session Slot</span>
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: 'Morning', value: '09:00', desc: '09:00 AM' },
                { label: 'Afternoon', value: '13:30', desc: '01:30 PM' },
                { label: 'Evening', value: '17:00', desc: '05:00 PM' },
              ].map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setTime(slot.value)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    time === slot.value
                      ? 'bg-emerald-500/10 dark:bg-[#00e599]/10 border-emerald-500 dark:border-[#00e599] text-foreground dark:text-white shadow-sm'
                      : 'bg-card dark:bg-[#181c24] border-border dark:border-white/5 text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-[#222733]'
                  }`}
                >
                  <div className="text-[11px] font-bold text-foreground">{slot.label}</div>
                  <div className="text-[10px] text-muted-foreground">{slot.desc}</div>
                </button>
              ))}
            </div>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-card dark:bg-[#181c24] border-border dark:border-white/10 text-foreground dark:text-white focus-visible:ring-emerald-500 dark:focus-visible:ring-[#00e599] text-xs h-10 rounded-xl"
            />
          </div>

          {/* Target Score */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00e599]" />
              <span>Target Score ({activeExam})</span>
            </label>
            <Input
              type="number"
              step={activeExam === 'PTE' ? '1' : '0.5'}
              value={targetScore}
              onChange={(e) => setTargetScore(parseFloat(e.target.value) || 0)}
              className="bg-card dark:bg-[#181c24] border-border dark:border-white/10 text-foreground dark:text-white focus-visible:ring-emerald-500 dark:focus-visible:ring-[#00e599] text-xs h-10 rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border dark:border-white/5 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 dark:bg-[#00e599] dark:hover:bg-[#00d08a] text-white dark:text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 dark:shadow-[#00e599]/20 px-5"
          >
            {savedSuccess ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            ) : saving ? (
              'Saving...'
            ) : (
              'Save Exam Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

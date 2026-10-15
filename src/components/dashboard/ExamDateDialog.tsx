import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  SCORE_SCALE,
  clampScore,
  daysUntil,
  formatScore,
  isoDateAfterMonths,
  runwayAdvice,
  scoreLabel,
  toIsoDate,
} from '@/components/onboarding/onboarding';
import { EXAM_LABELS, ExamType } from '@/lib/types';
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
  Minus,
  Plus,
  Sunrise,
  Sun,
  Sunset,
} from 'lucide-react';

interface ExamDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


/** The target a learner starts from when they have not set one. */
const TARGET_DEFAULT: Record<ExamType, number> = { PTE: 79, IELTS: 7.5, EPS_TOPIK: 60 };

const daysAhead = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

const DATE_PRESETS = [
  { label: '2 weeks', date: () => daysAhead(14) },
  { label: '1 month', date: () => isoDateAfterMonths(1) },
  { label: '2 months', date: () => isoDateAfterMonths(2) },
  { label: '3 months', date: () => isoDateAfterMonths(3) },
];

const TIME_SLOTS = [
  { label: 'Morning', value: '09:00', icon: Sunrise },
  { label: 'Afternoon', value: '13:30', icon: Sun },
  { label: 'Evening', value: '17:00', icon: Sunset },
];

// "13:30" reads as "1:30 PM" in the learner's own locale.
const formatTime = (time: string) => {
  const [hh, mm] = time.split(':').map(n => parseInt(n, 10));
  if (Number.isNaN(hh)) return time;
  return new Date(2000, 0, 1, hh, mm || 0).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const formatLongDate = (isoDate: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return '';
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function ExamDateDialog({ open, onOpenChange }: ExamDateDialogProps) {
  const { user, activeExam, updateProfile } = useApp();
  const scale = SCORE_SCALE[activeExam];

  // Defaults to six weeks out rather than a fixed date, which would drift into
  // the past and offer the learner an exam day that has already been.
  const [date, setDate] = useState<string>(() => {
    if (user?.examDate) return String(user.examDate).split('T')[0];
    return daysAhead(42);
  });
  const [time, setTime] = useState<string>('09:00');
  const [targetScore, setTargetScore] = useState<number>(user?.targetScore || TARGET_DEFAULT[activeExam]);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.examDate) {
      const d = String(user.examDate);
      setDate(d.split('T')[0]);
      const t = d.split('T')[1];
      if (t) {
        // extract HH:MM from possible HH:MM:SSZ
        const parts = t.split(':');
        if (parts.length >= 2) setTime(`${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`);
      }
    }
    if (user?.targetScore) setTargetScore(user.targetScore as number);
    setSaveError(null);
  }, [user, activeExam, open]);

  const daysLeft = daysUntil(date);
  const isPast = daysLeft !== null && daysLeft < 0;
  const canSave = daysLeft !== null && !isPast && !saving;

  const stepScore = (direction: 1 | -1) =>
    setTargetScore(score => clampScore(activeExam, score + direction * scale.step));

  // Combine local date + time into an ISO string (keeps local timezone, then toISOString for storage)
  const buildExamIso = (dateStr: string, timeStr: string) => {
    if (!dateStr) return null;
    try {
      const [yyyy, mm, dd] = dateStr.split('-').map(p => parseInt(p, 10));
      const [hh = '09', min = '00'] = (timeStr || '09:00').split(':');
      const local = new Date(yyyy, (mm || 1) - 1, dd, parseInt(hh as string, 10) || 9, parseInt(min as string, 10) || 0, 0);
      return local.toISOString();
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    setSaveError(null);
    try {
      const examIso = buildExamIso(date, time);
      const payload: any = {
        targetExam: activeExam,
        targetScore: clampScore(activeExam, targetScore),
      };
      if (examIso) payload.examDate = examIso;

      await updateProfile(payload);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onOpenChange(false);
      }, 900);
    } catch (err) {
      console.error('Failed to save exam date and time:', err);
      setSaveError('Could not save your exam date. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      active
        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
        : 'border-border bg-card text-foreground/80 hover:border-primary/40 hover:text-primary dark:border-white/10 dark:bg-white/[0.03]'
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto gap-0 bg-card dark:bg-[#12161c] border border-border dark:border-white/10 text-foreground dark:text-white p-0 sm:p-0 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1 px-6 pr-14 pt-6 pb-4 text-left">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <CalendarIcon className="h-[18px] w-[18px]" />
            </span>
            Your {EXAM_LABELS[activeExam]} exam
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Your countdown and study plan follow this date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Live countdown */}
          <div
            className={`flex items-center gap-4 rounded-2xl border p-4 ${
              isPast
                ? 'border-rose-200 bg-rose-50 dark:border-rose-500/25 dark:bg-rose-500/10'
                : 'border-primary/15 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] dark:border-primary/25'
            }`}
          >
            <div
              className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-card shadow-sm ring-1 dark:bg-white/5 ${
                isPast ? 'ring-rose-200 dark:ring-rose-500/30' : 'ring-primary/15'
              }`}
            >
              <span className={`text-2xl font-black leading-none tabular-nums ${isPast ? 'text-rose-600 dark:text-rose-400' : 'text-primary'}`}>
                {daysLeft === null ? '–' : Math.max(0, daysLeft)}
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {daysLeft === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-bold text-foreground">
                {formatLongDate(date) || 'Pick a date'} · {formatTime(time)}
              </p>
              <p className={`text-xs leading-relaxed ${isPast ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                {isPast
                  ? 'This date has passed. Pick an upcoming day.'
                  : daysLeft === null
                    ? 'Choose the day of your exam.'
                    : runwayAdvice(daysLeft)}
              </p>
            </div>
          </div>

          {/* Date */}
          <section className="space-y-2.5">
            <label htmlFor="exam-date" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Exam date
            </label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(preset => {
                const presetDate = preset.date();
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={date === presetDate}
                    onClick={() => setDate(presetDate)}
                    className={chip(date === presetDate)}
                  >
                    In {preset.label}
                  </button>
                );
              })}
            </div>
            <Input
              id="exam-date"
              type="date"
              value={date}
              min={toIsoDate(new Date())}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={isPast}
              className="h-11 rounded-xl border-border bg-card text-sm text-foreground focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
            />
          </section>

          {/* Time */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="exam-time" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Start time
              </label>
              <Input
                id="exam-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 w-32 rounded-lg border-border bg-card text-sm text-foreground focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(slot => {
                const active = time === slot.value;
                const Icon = slot.icon;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTime(slot.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      active
                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className={`text-xs font-bold ${active ? 'text-primary' : 'text-foreground'}`}>{slot.label}</span>
                    <span className="text-[11px] tabular-nums">{formatTime(slot.value)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Target score */}
          <section className="space-y-2.5">
            <label htmlFor="exam-target" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" />
              Target score
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-11 items-center overflow-hidden rounded-xl border border-border bg-card dark:border-white/10 dark:bg-white/[0.03]">
                <button
                  type="button"
                  aria-label="Lower target"
                  onClick={() => stepScore(-1)}
                  disabled={targetScore <= scale.min}
                  className="flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="exam-target"
                  type="number"
                  inputMode="decimal"
                  min={scale.min}
                  max={scale.max}
                  step={scale.step}
                  value={String(targetScore)}
                  onChange={(e) => setTargetScore(parseFloat(e.target.value) || 0)}
                  onBlur={() => setTargetScore(score => clampScore(activeExam, score))}
                  className="h-full w-16 border-x border-border bg-transparent text-center text-base font-bold tabular-nums text-foreground outline-none [appearance:textfield] dark:border-white/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label="Raise target"
                  onClick={() => stepScore(1)}
                  disabled={targetScore >= scale.max}
                  className="flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0 text-xs leading-snug text-muted-foreground">
                <p className="font-semibold text-foreground">{scoreLabel(activeExam, clampScore(activeExam, targetScore))}</p>
                <p>
                  {formatScore(activeExam, scale.min)}–{formatScore(activeExam, scale.max)} range
                </p>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-border bg-muted/40 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02] sm:flex-col sm:space-x-0">
          {saveError && (
            <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {saveError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl px-5 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="h-10 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
            >
              {savedSuccess ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              ) : saving ? (
                'Saving…'
              ) : (
                'Save exam date'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

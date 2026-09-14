import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, ArrowRight, CheckCircle2, Award, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExamType, SkillType } from '@/lib/types';

interface PracticeMockPaywallProps {
  skill: SkillType;
  exam: ExamType;
}

export default function PracticeMockPaywall({ skill, exam }: PracticeMockPaywallProps) {
  const navigate = useNavigate();
  const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
  const skillTitle = `${skillLabel} Mock Test`;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-8">
      <Card className="relative max-w-xl w-full p-6 sm:p-10 space-y-6 text-center bg-card/95 dark:bg-[#0f141f] border border-border/90 shadow-2xl rounded-3xl overflow-hidden">
        {/* Radiant ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-br from-amber-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Crown & Locked Pill */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-md">
              <Crown className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Premium Exclusive Feature</span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="indigo" className="font-bold uppercase tracking-wide">
                {exam}
              </Badge>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {skillTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Mock tests in practice mode are reserved for Premium members. Your free plan allows you to practice individual sub-tests daily plus 1 lifetime full mock exam.
            </p>
          </div>

          {/* Premium Features List */}
          <div className="p-4 sm:p-5 rounded-2xl bg-background/80 border border-border/80 text-left space-y-2.5 shadow-2xs">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> What Premium Unlocks:
            </span>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Unlimited section mock tests for Speaking, Writing, Reading & Listening</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Official section timing, countdowns, and examiner evaluation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Comprehensive scorecards, performance metrics & question breakdown</span>
              </li>
            </ul>
          </div>

          {/* Freemium Allowance Notice */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-700 dark:text-blue-300 text-left flex items-start gap-2.5">
            <Award className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
            <p className="leading-normal">
              <strong>Your Free Account:</strong> You can practice up to <strong>5 sub-tests per day</strong> across all skills, and your <strong>1 free full mock exam</strong> remains available in the Mock Center.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 space-y-2.5">
            <Button
              onClick={() => navigate('/subscription')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Upgrade to Unlock All Practice Mocks</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/practice?skill=${skill}`)}
                className="w-full sm:w-auto text-xs font-bold gap-1.5 rounded-xl"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Practice {skillLabel} Sub-Tests (Free)</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/mocks')}
                className="w-full sm:w-auto text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <span>Go to 1 Free Full Mock</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

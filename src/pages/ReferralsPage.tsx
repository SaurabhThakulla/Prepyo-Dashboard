import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Share2,
  Copy,
  Check,
  Gift,
  Trophy,
  Users,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Smartphone,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ReferralOverview } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function ReferralsPage() {
  const { user } = useApp();
  const toast = useToast();
  const [data, setData] = useState<ReferralOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Every figure here comes from /referrals/me. The learner's own code is the
  // only thing we can show before it loads, because it is already on the profile.
  const referralCode = data?.referralCode ?? user?.referralCode ?? '';
  const shareLink = data?.shareLink ?? '';

  useEffect(() => {
    let cancelled = false;

    api
      .get<ReferralOverview>('/referrals/me')
      .then(res => !cancelled && setData(res))
      .catch(err => !cancelled && toast.error('Could not load your referrals', errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = encodeURIComponent(
    `Hey! I'm preparing for my PTE/IELTS with Prepyo AI. Use my link to get +100 bonus XP and a Free Full AI Mock Test:\n${shareLink}`
  );

  const stats = data?.stats || { totalInvited: 0, pending: 0, completed: 0, totalXpEarned: 0 };
  const milestones = data?.milestones || {
    threeReferrals: { required: 3, current: 0, completed: false },
    fiveReferrals: { required: 5, current: 0, completed: false },
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card/90 to-primary/10 p-6 sm:p-10 shadow-xl space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Gift className="w-3.5 h-3.5 text-primary" />
              <span>Give +100 XP • Get +200 XP</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Invite Friends. <span className="text-primary">Earn Rewards.</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Help your friends prepare better for PTE/IELTS. Earn XP, unlocked full mock tests, and Pro subscription days as they practice.
            </p>
          </div>

          <div className="hidden sm:flex h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center text-primary shadow-inner">
            <Trophy className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        {/* Referral Code and Share Actions */}
        <div className="pt-2 border-t border-border/80 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-7 space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Your Unique Referral Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center justify-between rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-xs text-foreground font-mono font-bold">
                <span className="truncate">{shareLink}</span>
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase ml-2 shrink-0">
                  {referralCode}
                </span>
              </div>
              <Button
                onClick={handleCopy}
                className="rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 h-10"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Quick Share
            </label>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>

              <a
                href={`viber://forward?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 text-xs font-bold transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Viber</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/80 border-border space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>Total Invited</span>
          </div>
          <div className="font-display text-2xl font-black text-foreground">
            {stats.totalInvited}
          </div>
        </Card>

        <Card className="p-4 bg-card/80 border-border space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending Activity</span>
          </div>
          <div className="font-display text-2xl font-black text-amber-500">
            {stats.pending}
          </div>
        </Card>

        <Card className="p-4 bg-card/80 border-border space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span>Qualified Referrals</span>
          </div>
          <div className="font-display text-2xl font-black text-primary">
            {stats.completed}
          </div>
        </Card>

        <Card className="p-4 bg-card/80 border-border space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Total XP Earned</span>
          </div>
          <div className="font-display text-2xl font-black text-primary">
            +{stats.totalXpEarned} XP
          </div>
        </Card>
      </div>

      {/* Milestone Progress Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-black text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Referral Milestone Rewards</span>
          </h2>
          <span className="text-xs text-muted-foreground">Automatic unlocks at each tier</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Milestone 1: 3 Referrals */}
          <div className={`p-5 rounded-2xl border transition-all ${
            milestones.threeReferrals.completed
              ? 'bg-primary/10 border-primary/30'
              : 'bg-card border-border'
          }`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tier 1 Milestone
                </div>
                <div className="font-display text-base font-black text-foreground flex items-center gap-2">
                  <span>3 Qualified Referrals</span>
                  {milestones.threeReferrals.completed && (
                    <Badge variant="success" className="text-[10px] py-0">Unlocked 🎉</Badge>
                  )}
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                {Math.min(milestones.threeReferrals.current, 3)} / 3
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((milestones.threeReferrals.current / 3) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Reward unlocked: <strong className="text-foreground">+1 Free AI Mock Exam</strong> (All 4 Sections)
              </p>
            </div>
          </div>

          {/* Milestone 2: 5 Referrals */}
          <div className={`p-5 rounded-2xl border transition-all ${
            milestones.fiveReferrals.completed
              ? 'bg-primary/10 border-primary/30'
              : 'bg-card border-border'
          }`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tier 2 Milestone
                </div>
                <div className="font-display text-base font-black text-foreground flex items-center gap-2">
                  <span>5 Qualified Referrals</span>
                  {milestones.fiveReferrals.completed && (
                    <Badge variant="success" className="text-[10px] py-0">Unlocked 🎉</Badge>
                  )}
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                {Math.min(milestones.fiveReferrals.current, 5)} / 5
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((milestones.fiveReferrals.current / 5) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Reward unlocked: <strong className="text-foreground">+3 Bonus Pro Subscription Days</strong> (30 AI evaluations/day)
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Referral Activity Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Referral Activity</span>
            <span className="text-xs text-muted-foreground font-normal">
              Rewards activate after 1 diagnostic or 10 practice drills
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentReferrals && data.recentReferrals.length > 0 ? (
            <div className="divide-y divide-border">
              {data.recentReferrals.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground">{item.friendName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Joined {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        Qualified (+200 XP)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Pending Activity
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <Users className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs text-muted-foreground">
                No referrals yet. Share your unique link with classmates to earn XP and free mock tests!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

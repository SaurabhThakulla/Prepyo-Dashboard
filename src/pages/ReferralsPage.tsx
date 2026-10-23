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
import { ReferralsPageSkeleton } from '@/components/layout/PageSkeleton';
import ReferralRedeem from '@/components/subscription/ReferralRedeem';

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      toast.error('Could not copy code', errorMessage(err));
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: 'Prepyo referral', text: `Join Prepyo with my referral code ${referralCode}. When your eligible subscription payment is confirmed, I earn 3 bonus membership days.`, url: shareLink });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) toast.error('Could not share', errorMessage(err));
    }
  };

  const shareText = encodeURIComponent(
    `Join me on Prepyo with code ${referralCode}. When your eligible subscription payment is confirmed, I earn 3 bonus membership days.\n${shareLink}`
  );

  const stats = data?.stats || { totalInvited: 0, pending: 0, completed: 0, totalXpEarned: 0, totalBonusDaysEarned: 0 };


  if (loading && !data) {
    return <ReferralsPageSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card/90 to-primary/10 p-6 sm:p-10 shadow-xl space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Gift className="w-3.5 h-3.5 text-primary" />
              <span>Earn 3 bonus membership days</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Refer a Friend &amp; <span className="text-primary">Earn 3 Days</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Invite a friend. When they purchase an eligible subscription using your referral code, you earn 3 bonus membership days.
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
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase ml-2 shrink-0">
                  {referralCode}
                </span>
              </div>
              <Button
                onClick={handleCopy}
                className="rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 h-10"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy code'}</span>
              </Button>
            </div>
          </div>

          {typeof navigator.share === 'function' && <Button onClick={handleShare} disabled={!shareLink} className="md:col-span-12 gap-2"><Share2 className="w-4 h-4" />Share invitation</Button>}
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
            <span>Pending Purchase</span>
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
            <span>Total Bonus Days Earned</span>
          </div>
          <div className="font-display text-2xl font-black text-primary">
            +{stats.totalBonusDaysEarned} days
          </div>
        </Card>
      </div>

      <ReferralRedeem />

      {/* Referral Activity Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Referral Activity</span>
            <span className="text-xs text-muted-foreground font-normal">
              3 days per friend, only after confirmed payment
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
                        Rewarded (+{item.rewardDays} days){item.paymentStatus === 'refunded' ? ' · Payment refunded' : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {item.status === 'cancelled' ? 'Cancelled' : item.status === 'legacy' ? 'Legacy reward · awaiting purchase' : 'Pending confirmed purchase'}
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
                No referrals yet. Share your code with friends to earn 3 membership days for each eligible confirmed purchase!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

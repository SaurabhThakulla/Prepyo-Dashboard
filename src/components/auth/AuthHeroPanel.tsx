import React from 'react';
import { CheckCircle2, ShieldCheck, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SubscriptionPlan } from '@/lib/types';

/**
 * The marketing half of the auth screen. Desktop only — it is hidden below
 * `lg` so the form gets the whole viewport on a phone.
 */
export default function AuthHeroPanel({ freePlan }: { freePlan: SubscriptionPlan | null }) {
  return (
    <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 h-screen max-h-screen relative flex-col justify-between p-8 xl:p-12 overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* `absolute inset-0` and the eager fetch are what next/image's `fill`
            and `priority` used to add. This is the first thing a signed-out
            visitor sees, so it should not wait its turn. */}
        <img
          src="/images/auth-hero.jpg"
          alt="Student preparing for PTE and IELTS in Kathmandu"
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 object-cover object-center w-full h-full brightness-[0.85]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/35 backdrop-brightness-95" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-slate-950/70" />
      </div>

      <div className="relative z-10 space-y-5">
        <div className="flex items-center justify-between">
          {/* Not a link: this screen is "/", so there is nowhere for the logo
              to go. The marketing site is a separate deployment. */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-white font-black text-lg shadow-lg shadow-primary/30">
              P
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-black tracking-tight text-white">
                prep<span className="text-primary">yo</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-primary/25 text-blue-200 px-2 py-0.5 rounded-md border border-primary/40">
                NP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-slate-200">
            <span className="text-amber-400">★</span>
            <span>4.9/5 • 12k+ Students</span>
          </div>
        </div>

        <div className="space-y-2 max-w-lg pt-2">
          <h2 className="font-display text-2xl xl:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">
            Master PTE 79+ &amp; IELTS 8.0 with AI
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            Nepal’s premier realistic exam simulator tuned with authentic Pearson &amp; Cambridge scoring rubrics.
          </p>
        </div>
      </div>

      <div className="relative z-10 space-y-3.5">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
          <HeroCard
            icon={<Gift className="w-4 h-4" />}
            iconClass="bg-amber-500/20 text-amber-400"
            title={freePlan?.name || 'Instant Free Starter'}
            badge={<Badge variant="secondary" className="text-[10px] py-0 font-bold shrink-0">NPR {freePlan?.priceNPR ?? 0}</Badge>}
            tickClass="text-primary"
            points={freePlan?.features?.length ? freePlan.features : ['Nepali Accent AI Engine']}
          />
          <HeroCard
            icon={<ShieldCheck className="w-4 h-4 text-primary" />}
            iconClass="bg-primary/20 text-primary"
            title="Privacy & Security"
            badge={<Badge variant="indigo" className="text-[10px] py-0 font-bold uppercase shrink-0">256-Bit</Badge>}
            tickClass="text-primary"
            points={['Bcrypt Password Hashing', 'Revocable User Sessions', '100% Student Data Safety']}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-medium">
          <span>🇳🇵 Kathmandu • Pokhara • Lalitpur • Chitwan</span>
          <span className="text-primary font-semibold">Nepal Official</span>
        </div>
      </div>
    </div>
  );
}

interface HeroCardProps {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  badge: React.ReactNode;
  tickClass: string;
  points: string[];
}

function HeroCard({ icon, iconClass, title, badge, tickClass, points }: HeroCardProps) {
  return (
    <div className="rounded-2xl bg-black/75 backdrop-blur-xl border border-white/20 p-4 shadow-2xl space-y-2.5 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/15">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            {icon}
          </div>
          <span className="text-xs font-bold text-white truncate">{title}</span>
        </div>
        {badge}
      </div>

      <ul className="space-y-1.5 text-xs text-slate-200">
        {points.map(point => (
          <li key={point} className="flex items-center gap-2">
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${tickClass}`} />
            <span><strong>{point}</strong></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import React from 'react';
import { ShieldCheck, Clock, Flame } from 'lucide-react';

const BADGES = [
  {
    icon: ShieldCheck,
    color: 'text-primary',
    bg: 'bg-primary/10',
    title: 'Nepal payment methods',
    desc: 'Pay with eSewa, Khalti or Fonepay. No international credit card needed.',
  },
  {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    title: 'Tutor available any time',
    desc: 'No waiting for a class slot. Ask the AI coach a question whenever you are studying.',
  },
  {
    icon: Flame,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    title: 'Daily streaks',
    desc: 'Daily missions and XP keep the habit going. Streaks count real practice, not logins.',
  },
];

export default function TrustBadges() {
  return (
    <section className="py-12 border-t border-border">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {BADGES.map(({ icon: Icon, color, bg, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

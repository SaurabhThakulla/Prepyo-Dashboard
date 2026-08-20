import React from 'react';
import { Users, TrendingUp, Sparkles, Star } from 'lucide-react';

const STATS = [
  { value: '10,000+', label: 'Active learners', icon: Users, color: 'text-primary' },
  { value: '98%', label: 'Improved their score', icon: TrendingUp, color: 'text-amber-500' },
  { value: '50,000+', label: 'AI evaluations run', icon: Sparkles, color: 'text-purple-400' },
  { value: '4.9', label: 'Average student rating', icon: Star, color: 'text-emerald-400' },
];

export default function StatsBand() {
  return (
    <section className="py-12 my-4 rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center px-8">
        {STATS.map(({ value, label, icon: Icon, color }) => (
          <div key={label} className="space-y-2">
            <Icon className={`w-6 h-6 mx-auto ${color}`} />
            <div className="font-display text-3xl font-black text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground font-medium">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

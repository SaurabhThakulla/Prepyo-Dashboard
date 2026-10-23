import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle2, Sun, Moon, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LOGIN_PATH, SIGNUP_PATH } from './paths';

interface Props {
  title: string;
  subtitle?: string;
  mode: 'login' | 'signup';
  children: React.ReactNode;
}

export default function InstitutionAuthLayout({ title, subtitle, mode, children }: Props) {
  const isLogin = mode === 'login';

  // Safe theme detection that does not depend on AppContext (so unit tests can render without AppProvider)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    if (typeof document === 'undefined') return;
    const next = !document.documentElement.classList.contains('dark');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setIsDark(next);
  };

  return (
    <div className="min-h-dvh lg:h-dvh w-full flex flex-col lg:flex-row bg-background lg:overflow-hidden text-foreground selection:bg-primary/20 selection:text-primary">
      {/* =========================================================================
          LEFT / HERO PANEL (Matching AuthHeroPanel.tsx flow)
          ========================================================================= */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 h-screen max-h-screen relative flex-col justify-between p-8 xl:p-12 overflow-hidden bg-slate-950 text-white">
        {/* Background Image: Nepali Consultancy & Educational Institute */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/images/institution-hero.jpg"
            alt="Nepali educational consultancy and test prep institute in Kathmandu"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 object-cover object-center w-full h-full brightness-[0.88]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/35 backdrop-brightness-95" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-slate-950/70" />
        </div>

        {/* Top Header Block */}
        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl overflow-hidden bg-white shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
                <img src="/prepyo-mark.webp" alt="Prepyo" width={256} height={256} className="h-8 w-8 object-contain" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-black tracking-tight text-white">
                  prep<span className="text-primary">yo</span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider bg-primary/25 text-blue-200 px-2 py-0.5 rounded-md border border-primary/40">
                  INSTITUTION
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-slate-200">
              <span className="text-amber-400">★</span>
              <span>4.9/5 • 10+ Partners</span>
            </div>
          </div>

          <div className="space-y-2 max-w-lg pt-2">
            <h2 className="font-display text-2xl xl:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              Empower your students with authentic AI test prep
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Nepal’s premier realistic exam simulator tuned with authentic Pearson, Cambridge &amp; HRD Korea scoring rubrics.
            </p>
          </div>
        </div>

        {/* Center area stays open and visible */}
        <div className="flex-1" />

        {/* Bottom Cards Block */}
        <div className="relative z-10 space-y-3.5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            <HeroCard
              icon={<Building2 className="w-4 h-4 text-blue-400" />}
              iconClass="bg-blue-500/20 text-blue-400"
              title="Partner Portal"
              badge={<Badge variant="secondary" className="text-xs py-0 font-bold shrink-0">INSTITUTE</Badge>}
              tickClass="text-primary"
              points={['Live Batch Analytics', 'PTE, IELTS & EPS-TOPIK', 'Centralized Mock Tracking']}
            />
            <HeroCard
              icon={<ShieldCheck className="w-4 h-4 text-primary" />}
              iconClass="bg-primary/20 text-primary"
              title="Privacy & Security"
              badge={<Badge variant="indigo" className="text-xs py-0 font-bold uppercase shrink-0">256-Bit</Badge>}
              tickClass="text-primary"
              points={['Dedicated Admin Access', 'Instant Seat Provisioning', '100% Student Data Safety']}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-medium">
            <span>🇳🇵 Kathmandu • Pokhara • Lalitpur • Chitwan</span>
            <span className="text-primary font-semibold">Nepal Official</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT / FORM CONTAINER (Matching UnifiedAuth.tsx flow)
          ========================================================================= */}
      <div className="w-full lg:w-7/12 xl:w-1/2 min-h-dvh lg:h-dvh flex flex-col justify-between gap-4 p-5 sm:p-8 xl:p-10 overflow-y-auto bg-background">
        {/* Top bar with mobile mark & switcher */}
        <div className="flex items-center justify-between pb-1">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden bg-white shadow-md">
              <img src="/prepyo-mark.webp" alt="Prepyo" width={256} height={256} className="h-6 w-6 object-contain" />
            </div>
            <span className="font-display text-lg font-black text-foreground">
              prep<span className="text-primary">yo</span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
              INSTITUTION
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Quick tab switcher between Sign In & Register */}
            <div className="flex items-center gap-1 rounded-full bg-muted/80 p-1 text-xs font-semibold">
              <Link
                to={LOGIN_PATH}
                className={`rounded-full px-3 py-1 transition-all ${
                  isLogin
                    ? 'bg-background text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign in
              </Link>
              <Link
                to={SIGNUP_PATH}
                className={`rounded-full px-3 py-1 transition-all ${
                  !isLogin
                    ? 'bg-background text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Register
              </Link>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              )}
            </Button>
          </div>
        </div>

        {/* Centered Form Area */}
        <div className="my-auto max-w-sm sm:max-w-md w-full mx-auto py-2">
          <div className="mb-6 space-y-1">
            <h1 className="font-display text-2xl font-black text-foreground sm:text-3xl tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>

          <div className="w-full">
            {children}
          </div>
        </div>

        {/* Bottom Footer (Matching UnifiedAuth.tsx) */}
        <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/60 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>Protected by Prepyo 256-bit encryption</span>
          <span>•</span>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground hover:underline">
            Terms of Service
          </Link>
          <span>•</span>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link to="/login" className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
            Learner Login
            <ArrowUpRight className="h-3 w-3" />
          </Link>
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

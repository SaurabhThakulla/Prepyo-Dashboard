import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useSubscriptionPlans } from '@/lib/hooks/useResources';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthHeroPanel from './AuthHeroPanel';
import AuthForm from './AuthForm';
import { AuthMode, useAuthForm } from '@/lib/hooks/useAuthForm';

export type { AuthMode };

/**
 * The sign-in / sign-up screen. One component serves both, because the two
 * differ by a few fields rather than by layout.
 *
 *   AuthHeroPanel   the marketing half (desktop only)
 *   AuthForm        the form itself
 *   useAuthForm     field state, validation, and submit
 */
export default function UnifiedAuth({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const { theme, toggleTheme } = useApp();
  const form = useAuthForm(initialMode);

  // The free plan's name and price are shown in the hero. If the endpoint is
  // down the card falls back to static copy rather than blocking sign-in.
  // Shares the subscription page's cache.
  const { data: plansData } = useSubscriptionPlans();
  const freePlan = plansData?.plans.find(plan => plan.id === 'free') ?? null;

  return (
    <div className="h-screen max-h-screen w-full flex flex-col lg:flex-row bg-background overflow-hidden">
      <AuthHeroPanel freePlan={freePlan} />

      <div className="w-full lg:w-7/12 xl:w-1/2 h-screen max-h-screen flex flex-col justify-between p-5 sm:p-8 xl:p-10 overflow-y-auto bg-background">
        <div className="flex items-center justify-between pb-1">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-black text-xs shadow-md">
              P
            </div>
            <span className="font-display text-lg font-black text-foreground">
              prep<span className="text-primary">yo</span>
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              )}
            </Button>
          </div>
        </div>

        <AuthForm form={form} />

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
        </div>
      </div>
    </div>
  );
}

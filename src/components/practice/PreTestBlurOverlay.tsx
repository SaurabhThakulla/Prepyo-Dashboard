import React from 'react';
import { Play, RefreshCw, AlertCircle, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface PreTestBlurOverlayProps {
  title: string;
  typeName?: string;
  instructions?: string;
  subTestsRemaining: number;
  isStarting: boolean;
  onStart: () => void;
  onPickAnother?: () => void;
  skill?: string;
  loading?: boolean;
}

/**
 * Centered glassmorphic card displayed over blurred test content prior to starting.
 * Starting deducts 1 sub-test credit and initiates the test session.
 */
export default function PreTestBlurOverlay({
  title,
  instructions,
  subTestsRemaining,
  isStarting,
  onStart,
  onPickAnother,
  loading = false,
}: PreTestBlurOverlayProps) {
  const hasCredits = subTestsRemaining > 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <Card className="w-full max-w-lg p-6 sm:p-8 text-center space-y-5 bg-card/95 border-border/90 shadow-2xl rounded-2xl backdrop-blur-xl">
        <div className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl font-black text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {instructions || 'The passage and questions are hidden until you start. Press Start to begin your timed attempt.'}
          </CardDescription>
        </div>

        {/* Credit Information Box */}
        <div className="p-3.5 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-left">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-foreground font-semibold">1 sub-test credit</span>
          </div>
          <div>
            {hasCredits ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
                {subTestsRemaining} left today
              </span>
            ) : (
              <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/30">
                0 left today
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 pt-1">
          {hasCredits ? (
            <Button
              onClick={onStart}
              disabled={isStarting || loading}
              size="lg"
              className="w-full h-12 text-sm font-extrabold gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing test…</span>
                </>
              ) : isStarting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Starting test…</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Practice (1 Credit)</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="w-full h-12 text-sm font-extrabold gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25"
            >
              <Link to="/subscription">
                <ShieldAlert className="w-4 h-4" />
                <span>Upgrade for More Practice Tests</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          )}

          {onPickAnother && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPickAnother}
              disabled={isStarting}
              className="w-full text-xs text-muted-foreground hover:text-foreground font-semibold h-8 rounded-lg"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              <span>Try another question</span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

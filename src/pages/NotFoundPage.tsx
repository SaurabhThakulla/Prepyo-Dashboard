import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Home,
  UserPlus,
  LogIn,
  ArrowLeft,
  Search,
  Compass,
  Sparkles,
  Award,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NotFound() {
  const navigate = useNavigate();
  const { user, loading } = useApp();

  const isAuthenticated = Boolean(user);

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 overflow-hidden select-none">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main 404 Container */}
      <div className="w-full max-w-xl text-center space-y-8">
        {/* Brand mark for unauthenticated full-screen views */}
        {!isAuthenticated && (
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-white shadow-md shadow-primary/25 font-black text-lg">
              P
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display text-lg font-black tracking-tight text-foreground">
                Prepyo
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                AI Exam Prep • PTE & IELTS
              </span>
            </div>
          </div>
        )}

        {/* 404 Visual Icon & Code */}
        <div className="relative inline-flex items-center justify-center">
          <div className="relative flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-b from-card/90 to-card/40 border border-border/80 shadow-2xl backdrop-blur-xl group hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 rounded-3xl bg-primary/5 group-hover:bg-primary/10 transition-colors" />
            <Compass className="w-14 h-14 text-primary animate-pulse" />
          </div>
          <Badge
            variant="outline"
            className="absolute -bottom-3 px-3 py-1 bg-background/95 backdrop-blur-md border-primary/30 text-primary font-mono text-xs font-bold tracking-wider uppercase shadow-md"
          >
            404 • Page Not Found
          </Badge>
        </div>

        {/* Text Content */}
        <div className="space-y-3 pt-2">
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Lost your way in the prep lab?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            The page you are looking for doesn’t exist, has been moved, or the link may be broken.
          </p>

          {/* User Status pill */}
          {!loading && user && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Signed in as <strong className="text-foreground">{user.name}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <>
              {/* Authenticated Actions */}
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl"
              >
                <Link to="/dashboard" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  <span>Go back to Home</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-semibold border-border hover:bg-muted/70 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl"
              >
                <Link to="/practice" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Practice Studio</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              {/* Unauthenticated Actions */}
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl"
              >
                <Link to="/signup" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Go back to Sign Up</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-semibold border-border hover:bg-muted/70 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl"
              >
                <Link to="/login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-primary" />
                  <span>Log In</span>
                </Link>
              </Button>
            </>
          )}

          {/* Previous Page Back Button */}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto text-muted-foreground hover:text-foreground font-semibold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Go Back</span>
          </Button>
        </div>

        {/* Quick Links Card */}
        <div className="pt-6 border-t border-border/60 max-w-md mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Popular destinations
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <Link
              to={isAuthenticated ? '/practice' : '/login'}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/50 hover:bg-muted/60 transition-all text-xs font-medium text-foreground hover:border-primary/40 group"
            >
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="font-bold">Practice Tests</div>
                <div className="text-[10px] text-muted-foreground">PTE & IELTS</div>
              </div>
            </Link>

            <Link
              to={isAuthenticated ? '/mocks' : '/login'}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/50 hover:bg-muted/60 transition-all text-xs font-medium text-foreground hover:border-primary/40 group"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="font-bold">Mock Exams</div>
                <div className="text-[10px] text-muted-foreground">Full simulations</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

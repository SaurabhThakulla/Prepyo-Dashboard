import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Tag,
} from 'lucide-react';
import { MistakesPageSkeleton } from '@/components/layout/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useMistakes } from '@/lib/hooks/useResources';

function renderResponseBadges(text: string, isWrong: boolean) {
  if (!text) return <span className="text-muted-foreground italic text-xs">No response</span>;

  // If format is like "b1: val, b2: val"
  if (/b\d+:/.test(text)) {
    const parts = text.split(/,\s*/);
    return (
      <div className="flex flex-wrap gap-1.5">
        {parts.map((part, i) => {
          const colonIdx = part.indexOf(':');
          const key = colonIdx > -1 ? part.slice(0, colonIdx) : `Gap ${i + 1}`;
          const val = colonIdx > -1 ? part.slice(colonIdx + 1).trim() : part.trim();
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                isWrong
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <span className="font-bold opacity-70">{key}:</span>
              <span>{val || '—'}</span>
            </span>
          );
        })}
      </div>
    );
  }

  // Default clean text presentation
  return (
    <p
      className={`text-xs sm:text-sm font-medium leading-relaxed ${
        isWrong ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
      }`}
    >
      {text}
    </p>
  );
}

export default function MistakesPage() {
  const { activeExam } = useApp();
  const toast = useToast();
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isPending, error } = useMistakes(activeExam, selectedSkill, false);
  const mistakes = data?.mistakes ?? [];
  const loading = isPending;

  useEffect(() => {
    if (error) toast.error('Could not load your mistake bank', errorMessage(error));
  }, [error]);

  const skillFilters = ['all', 'speaking', 'writing', 'reading', 'listening'];

  const filteredMistakes = mistakes.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.questionTitle?.toLowerCase().includes(q) ||
      item.prompt?.toLowerCase().includes(q) ||
      item.explanation?.toLowerCase().includes(q) ||
      item.errorTag?.toLowerCase().includes(q) ||
      item.typeName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full pb-16 space-y-6">
      {/* Full width edge-to-edge Header Banner matching ProfilePage */}
      <div className="w-full bg-card border-b border-border/80 overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Mistake Bank
              </h1>
              <Badge variant="outline" className="text-xs font-mono font-bold px-2.5 py-0.5">
                {activeExam}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Review errors from your practice sessions and mock tests to analyze correct solutions and examiner explanations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider bg-muted/80 px-3 py-1.5 rounded-xl border border-border shadow-xs">
              {mistakes.length} Logged Mistakes
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Filters & Mistake Cards stretching full width */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filter Tag & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-2.5 sm:p-3 rounded-2xl border border-border/80">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {skillFilters.map(t => (
              <Button
                key={t}
                size="sm"
                variant={selectedSkill === t ? 'default' : 'ghost'}
                onClick={() => setSelectedSkill(t)}
                className="text-xs font-bold whitespace-nowrap h-8 rounded-xl capitalize"
              >
                {t}
              </Button>
            ))}
          </div>

          <div className="relative min-w-[220px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search mistakes or topics…"
              className="h-8 pl-8 text-xs bg-background rounded-xl border-border/80"
            />
          </div>
        </div>

      {loading ? (
        <MistakesPageSkeleton bare />
      ) : filteredMistakes.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-2xl border-border/80">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <CardTitle className="text-base font-bold">
            {mistakes.length === 0 ? 'No mistakes recorded yet' : 'No matching mistakes found'}
          </CardTitle>
          <CardDescription className="text-xs max-w-md mx-auto">
            {mistakes.length === 0
              ? 'Questions you miss during practice and full mock exams will be automatically catalogued here for review.'
              : 'Try clearing your search query or switching to another skill filter.'}
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMistakes.map(item => (
            <div
              key={item.id}
              className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/30 hover:shadow-md transition-all duration-200 space-y-4"
            >
              {/* Header row: Skill & metadata pills */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-blue-600 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                    {item.typeName}
                  </span>
                  {item.skill && (
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/80 px-2.5 py-0.5 rounded-md border border-border">
                      {item.skill}
                    </span>
                  )}
                  {item.errorTag && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                      <Tag className="w-3 h-3" />
                      <span>{item.errorTag}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Prompt Context */}
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-base sm:text-lg text-foreground tracking-tight">
                  {item.questionTitle}
                </h3>
                {item.prompt && (
                  <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                    {item.prompt}
                  </p>
                )}
              </div>

              {/* Response Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 rounded-xl border border-border/80 divide-y sm:divide-y-0 sm:divide-x divide-border/80 bg-muted/15 overflow-hidden">
                {/* Your Response */}
                <div className="p-4 space-y-2.5 bg-background/50">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Your Response</span>
                  </div>
                  <div>
                    {renderResponseBadges(item.userResponse, true)}
                  </div>
                </div>

                {/* Correct Solution */}
                <div className="p-4 space-y-2.5 bg-background/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Correct Solution</span>
                  </div>
                  <div>
                    {renderResponseBadges(item.correctResponse, false)}
                  </div>
                </div>
              </div>

              {/* Examiner Explanation Callout */}
              {item.explanation && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 text-xs sm:text-[13px]">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                      Examiner Explanation
                    </span>
                    <p className="text-foreground/90 leading-relaxed font-normal">
                      {item.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

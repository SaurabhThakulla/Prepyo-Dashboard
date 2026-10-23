import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Info, Check, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PteExamVariant, getPteSkillColumnItems, ColumnItem } from '@/lib/pteExamConfig';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  className?: string;
}

export default function PteDashboardMatrix({ className = '' }: Props) {
  const { pteVariant, setPteVariant } = useApp();
  const [lockedModalItem, setLockedModalItem] = useState<ColumnItem | null>(null);

  const skills: { key: 'speaking' | 'writing' | 'reading' | 'listening'; label: string; showWeightBadge?: boolean }[] = [
    { key: 'speaking', label: 'Speaking', showWeightBadge: true },
    { key: 'writing', label: 'Writing' },
    { key: 'reading', label: 'Reading' },
    { key: 'listening', label: 'Listening' },
  ];

  const handleTabChange = (variant: PteExamVariant) => {
    setPteVariant(variant);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`w-full bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden ${className}`}>
        {/* Top Tabs */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-4 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => handleTabChange('academic')}
            className={`relative px-5 sm:px-7 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-t-xl select-none ${
              pteVariant === 'academic'
                ? 'bg-[#00c4a7] text-white shadow-md z-10'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            PTE Academic / UKVI
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('core')}
            className={`relative px-5 sm:px-7 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-t-xl select-none ${
              pteVariant === 'core'
                ? 'bg-[#00c4a7] text-white shadow-md z-10'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            PTE Core
          </button>

          <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-muted-foreground pb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#00c4a7]" />
            <span>Currently Active: <strong>{pteVariant === 'core' ? 'PTE Core' : 'PTE Academic / UKVI'}</strong></span>
          </div>
        </div>

        {/* 4-Column Breakdown Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-8">
          {skills.map(({ key, label, showWeightBadge }) => {
            const { active, disabled } = getPteSkillColumnItems(pteVariant, key);

            return (
              <div key={key} className="flex flex-col space-y-3">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#00c4a7]">
                  <h3 className="font-display text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {label}
                  </h3>
                  {showWeightBadge && (
                    <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50 text-xs font-extrabold px-2 py-0.5 rounded shadow-2xs">
                      Score Weight
                    </span>
                  )}
                </div>

                {/* Active Items */}
                <div className="space-y-1.5 flex-1">
                  {active.map(item => (
                    <Link
                      key={item.id}
                      to={`/practice?skill=${item.skill}&type=${item.typeKey}&drawer=open`}
                      className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center min-w-0 pr-2">
                        {item.isNew && (
                          <span className="bg-rose-500 text-white text-xs font-extrabold px-1.5 py-0.2 rounded-full mr-1.5 shrink-0 shadow-2xs uppercase tracking-wide">
                            New
                          </span>
                        )}
                        <span className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors truncate">
                          {item.name}
                        </span>
                        {item.isAi && (
                          <span className="text-xs font-bold text-rose-500 ml-1.5 shrink-0">
                            AI Score
                          </span>
                        )}
                      </div>

                      <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50 text-[11px] font-extrabold font-mono px-1.5 py-0.5 rounded min-w-[34px] text-center shrink-0 inline-flex items-center justify-center">
                        {item.weight}
                      </span>
                    </Link>
                  ))}

                  {/* Disabled / Locked Items at the bottom */}
                  {disabled.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      {disabled.map(item => (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setLockedModalItem(item)}
                              className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-left text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-not-allowed group"
                            >
                              <div className="flex items-center min-w-0 pr-2">
                                <Lock className="w-3 h-3 mr-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                                <span className="text-xs sm:text-[12.5px] font-normal truncate">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400/80 dark:text-slate-500/80 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                Locked
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-xs p-2">
                            <p className="font-semibold text-amber-500 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Unavailable in {pteVariant === 'core' ? 'PTE Core' : 'PTE Academic'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {item.unavailableReason} Click to switch exams.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog for locked items */}
      <Dialog open={lockedModalItem !== null} onOpenChange={open => !open && setLockedModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                <Lock className="w-4 h-4" />
              </span>
              Task Unavailable in {pteVariant === 'core' ? 'PTE Core' : 'PTE Academic'}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-xs sm:text-sm text-muted-foreground pt-2 space-y-2">
                <p>
                  <strong>{lockedModalItem?.cleanName}</strong> is not part of{' '}
                  <strong>{pteVariant === 'core' ? 'PTE Core' : 'PTE Academic / UKVI'}</strong>.
                </p>
                <p className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-xl border border-border">
                  {lockedModalItem?.unavailableReason}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setLockedModalItem(null)}>
              Keep current exam
            </Button>
            <Button
              size="sm"
              className="bg-[#00c4a7] text-white hover:bg-[#00b297] font-bold gap-1.5"
              onClick={() => {
                const next = pteVariant === 'core' ? 'academic' : 'core';
                setPteVariant(next);
                setLockedModalItem(null);
              }}
            >
              Switch to {pteVariant === 'core' ? 'PTE Academic' : 'PTE Core'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

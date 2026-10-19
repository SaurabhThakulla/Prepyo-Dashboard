import React, { useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, ChevronRight, Lock, LucideIcon, RotateCcw, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNavSections } from '@/components/layout/sidebar/useNavSections';
import { SecondaryNavItem } from '@/components/layout/sidebar/navigation';
import { isAdmin } from '@/lib/types';
import { cn } from '@/lib/utils';

/** One colour per skill, so a task card says which skill it is at a glance. */
const SKILL_TINT: Record<string, { chip: string; icon: string }> = {
  speaking: { chip: 'bg-rose-500 text-white', icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  writing: { chip: 'bg-violet-500 text-white', icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  reading: { chip: 'bg-sky-500 text-white', icon: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  listening: { chip: 'bg-emerald-500 text-white', icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
};
const FALLBACK_TINT = { chip: 'bg-primary text-primary-foreground', icon: 'bg-primary/10 text-primary' };

interface SkillGroup {
  name: string;
  key: string;
  icon: LucideIcon;
  href?: string;
  tasks: SecondaryNavItem[];
  mocks: SecondaryNavItem[];
}

/**
 * The Practice tab: pick a skill, then a task type.
 *
 * The desktop sidebar lists the same thing as one long menu. On a phone that
 * meant opening a drawer and scrolling past every other skill's tasks, so here
 * each skill is a tab and its tasks are cards. Both read the practice section
 * of `buildSections`, so the two never disagree.
 */
export default function PracticeHubPage() {
  const { user } = useApp();
  const sections = useNavSections();
  const [searchParams, setSearchParams] = useSearchParams();
  const practice = sections.find(section => section.id === 'practice');

  const groups = useMemo<SkillGroup[]>(() => {
    const byName = new Map<string, SkillGroup>();
    for (const item of practice?.items ?? []) {
      const name = item.group ?? 'Practice';
      if (!byName.has(name)) {
        byName.set(name, { name, key: name.toLowerCase(), icon: item.icon, href: item.groupHref, tasks: [], mocks: [] });
      }
      const group = byName.get(name)!;
      (item.badge === 'MOCK' ? group.mocks : group.tasks).push(item);
    }
    return [...byName.values()];
  }, [practice]);

  const selectedKey = searchParams.get('skill');
  const selectedIndex = Math.max(0, groups.findIndex(group => group.key === selectedKey));
  const selected = groups[selectedIndex];
  const tint = SKILL_TINT[selected?.key ?? ''] ?? FALLBACK_TINT;

  // The skill lives in the URL, so coming back from a task lands on the same tab.
  const selectSkill = (index: number) => {
    const group = groups[index];
    if (!group) return;
    setSearchParams({ skill: group.key }, { replace: true });
  };

  // Swiping across the task list moves to the next or previous skill.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    selectSkill(selectedIndex + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-3 sm:pt-8 lg:pb-10">
      <p className="hidden text-sm text-muted-foreground sm:block">{practice?.description}</p>
      <h2 className="hidden font-display text-2xl font-bold text-foreground lg:block">{practice?.title}</h2>

      {!isAdmin(user) && (
        <div className="mt-1 grid grid-cols-2 gap-3 sm:mt-4">
          <QuickLink to="/mistakes" icon={RotateCcw} label="Mistake Bank" sublabel="Retry what you missed" tint="bg-orange-500/10 text-orange-600 dark:text-orange-400" />
          <QuickLink to="/evaluations" icon={Sparkles} label="AI Evaluator" sublabel="Your graded answers" tint="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
        </div>
      )}

      <div className="sticky top-14 z-20 -mx-4 mt-3 bg-background/95 px-4 py-2 backdrop-blur-xl lg:top-16">
        {/* Every skill fits across the screen, so none hides off the edge. */}
        <div role="tablist" aria-label="Skill" className="flex gap-1 rounded-2xl bg-muted p-1">
          {groups.map((group, index) => {
            const active = index === selectedIndex;
            const groupTint = SKILL_TINT[group.key] ?? FALLBACK_TINT;
            const GroupIcon = group.icon;
            return (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectSkill(index)}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition-all active:scale-95 sm:flex-row sm:justify-center sm:gap-2 sm:py-2.5 sm:text-sm [-webkit-tap-highlight-color:transparent]',
                  active ? cn(groupTint.chip, 'shadow-sm') : 'text-muted-foreground',
                )}
              >
                <GroupIcon className="h-[18px] w-[18px] shrink-0" />
                <span className="max-w-full truncate">{group.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div role="tabpanel" aria-label={selected.name} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="mt-3 space-y-3">
          {selected.tasks.length > 0 && (
            <div className="flex items-center justify-between gap-3 px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selected.tasks.length} {selected.name.toLowerCase()} {selected.tasks.length === 1 ? 'task' : 'tasks'}
              </h3>
              {selected.href && (
                <Link to={selected.href} className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                  Browse all
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {selected.tasks.map(task => {
              const Icon = task.icon;
              const summary = task.description ?? task.sublabel;

              if (task.isLocked) {
                return (
                  <li key={task.href ?? task.label} className="flex">
                    <div className="flex w-full items-center gap-3.5 rounded-2xl border border-border/60 bg-muted/30 p-3.5 opacity-60 cursor-not-allowed select-none">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[15px] font-bold leading-snug text-muted-foreground">
                          {task.label}
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                            <Lock className="w-3 h-3" /> {task.badge || 'Locked'}
                          </span>
                        </span>
                        {task.lockedReason && (
                          <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-amber-600/80 dark:text-amber-400/80">
                            {task.lockedReason}
                          </span>
                        )}
                      </span>
                    </div>
                  </li>
                );
              }

              return (
                <li key={task.href ?? task.label} className="flex">
                  <Link
                    to={task.href ?? '#'}
                    className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-all active:scale-[0.98] hover:border-primary/40 [-webkit-tap-highlight-color:transparent]"
                  >
                    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tint.icon)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[15px] font-bold leading-snug text-foreground flex-wrap">
                        <span>{task.label}</span>
                        {task.weight && (
                          <span className="rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50 px-1.5 py-0.5 text-[10px] font-extrabold font-mono inline-flex items-center">
                            <span>{task.weight.endsWith('%') ? task.weight.slice(0, -1) : task.weight}</span>
                            {task.weight.endsWith('%') && <span className="ml-0.5">%</span>}
                          </span>
                        )}
                        {task.badge && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {task.badge}
                          </span>
                        )}
                      </span>
                      {summary && (
                        <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{summary}</span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {selected.tasks.length === 0 && (
            <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No {selected.name.toLowerCase()} tasks yet.
            </p>
          )}

          {selected.mocks.map(mock => (
            <Link
              key={mock.href ?? mock.label}
              to={mock.href ?? '#'}
              className="flex items-center gap-3.5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-lg transition-transform active:scale-[0.98] dark:from-slate-800 dark:to-slate-700"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <BookOpenCheck className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-white/60">Timed test</span>
                <span className="block font-display text-base font-bold leading-snug">{mock.label}</span>
                {mock.sublabel && <span className="mt-0.5 block text-xs leading-snug opacity-80">{mock.sublabel}</span>}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">Nothing to practise here yet.</p>
      )}
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
  sublabel,
  tint,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  tint: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-sm transition-transform active:scale-[0.98] [-webkit-tap-highlight-color:transparent]"
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tint)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-foreground sm:text-sm">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{sublabel}</span>
      </span>
    </Link>
  );
}

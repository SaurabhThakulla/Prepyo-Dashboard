import React, { useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
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
        byName.set(name, { name, key: name.toLowerCase(), href: item.groupHref, tasks: [], mocks: [] });
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
        <div role="tablist" aria-label="Skill" className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group, index) => {
            const active = index === selectedIndex;
            const groupTint = SKILL_TINT[group.key] ?? FALLBACK_TINT;
            return (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectSkill(index)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 [-webkit-tap-highlight-color:transparent]',
                  active ? cn(groupTint.chip, 'shadow-sm') : 'bg-muted text-muted-foreground',
                )}
              >
                {group.name}
                <span className={cn('ml-1.5 text-xs', active ? 'opacity-80' : 'opacity-60')}>{group.tasks.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div role="tabpanel" aria-label={selected.name} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="mt-3 space-y-4">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {selected.tasks.map(task => {
              const Icon = task.icon;
              return (
                <li key={task.href ?? task.label} className="flex">
                  <Link
                    to={task.href ?? '#'}
                    className="flex min-h-[8.5rem] w-full flex-col rounded-3xl border border-border bg-card p-4 shadow-sm transition-all active:scale-[0.97] hover:border-primary/40 [-webkit-tap-highlight-color:transparent]"
                  >
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', tint.icon)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-3 line-clamp-3 text-sm font-bold leading-snug text-foreground">{task.label}</span>
                    {task.badge && (
                      <span className="mt-1 w-fit rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {task.badge}
                      </span>
                    )}
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
              className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-lg transition-transform active:scale-[0.98] dark:from-slate-800 dark:to-slate-700"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <BookOpenCheck className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold">{mock.label}</span>
                {mock.sublabel && <span className="block text-xs opacity-80">{mock.sublabel}</span>}
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 opacity-80" />
            </Link>
          ))}

          {selected.href && selected.tasks.length > 0 && (
            <Link
              to={selected.href}
              className="flex items-center justify-between rounded-2xl px-1 py-2 text-sm font-semibold text-primary"
            >
              Browse all {selected.name.toLowerCase()} questions
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
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
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-transform active:scale-[0.98] [-webkit-tap-highlight-color:transparent]"
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tint)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{sublabel}</span>
      </span>
    </Link>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ChevronRight, Gem, Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SecondaryNavList from './SecondaryNavList';
import { PrimarySectionConfig, SecondaryNavItem } from './navigation';
import { EXAM_LABELS, ExamType, UserProfile, isAdmin, isPremiumUser } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { PteExamVariant } from '@/lib/pteExamConfig';

interface SecondaryPanelProps {
  section: PrimarySectionConfig;
  isOpen: boolean;
  activeExam: ExamType;
  user: UserProfile | null;
  isItemActive: (item: SecondaryNavItem) => boolean;
  onExamChange: (exam: ExamType) => void;
  onOpenTutor: () => void;
  onNavigate: () => void;
}

/** Level 2: the wide collapsible panel next to the icon rail. */
export default function SecondaryPanel({
  section,
  isOpen,
  activeExam,
  user,
  isItemActive,
  onExamChange,
  onOpenTutor,
  onNavigate,
}: SecondaryPanelProps) {
  const { pteVariant, setPteVariant } = useApp();
  const SectionIcon = section.icon;

  return (
    <aside
      className={`shrink-0 border-r border-white/10 flex flex-col justify-between transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen
          ? 'w-[min(22rem,calc(100vw-5rem))] lg:w-[22rem] opacity-100 pointer-events-auto shadow-xl lg:shadow-none'
          : 'w-0 opacity-0 pointer-events-none border-none'
      }`}
    >
      <div className="w-[min(22rem,calc(100vw-5rem))] lg:w-[22rem] min-h-0 flex flex-col justify-between h-full">
        <div className="px-4 pt-5 pb-4 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 p-2.5 pr-3 backdrop-blur-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary dark:text-blue-950 shadow-md shadow-black/15">
              <SectionIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[15px] font-bold leading-tight truncate">{section.title}</h3>
              <p className="text-[11px] text-white/65 leading-snug truncate mt-0.5">{section.description}</p>
            </div>
          </div>

          {isAdmin(user) && <ExamSwitcher activeExam={activeExam} onChange={onExamChange} onBlue />}

          {activeExam === 'PTE' && (
            <PteVariantSwitcher pteVariant={pteVariant} onChange={setPteVariant} onBlue />
          )}
        </div>

        <SecondaryNavList
          items={section.items}
          fallbackHeading={section.label}
          isItemActive={isItemActive}
          onNavigate={onNavigate}
        />

        <div className="p-4">
          {isPremiumUser(user) ? (
            <Link
              to="/profile"
              onClick={onNavigate}
              className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 ring-2 ring-white/60">
                  <AvatarFallback className="bg-white text-primary text-sm font-bold">
                    {user?.name?.charAt(0) || 'L'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{user?.name || 'Learner'}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/75">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-px text-amber-200">
                      <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
                      {user?.streakDays ?? 0}d
                    </span>
                    <span>{user?.xp ?? 0} XP</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/60 shrink-0" />
            </Link>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/5 p-4">
              {/* Soft glow in the corner */}
              <span className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-sky-300/30 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-md shadow-black/20">
                  <Crown className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold leading-tight">Go Premium</p>
                  <p className="mt-1 text-[11px] leading-snug text-white/75">
                    Unlimited practice, full mock tests and AI feedback.
                  </p>
                </div>
              </div>
              <Link
                to="/subscription"
                onClick={onNavigate}
                className="relative mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-xs font-bold text-primary dark:text-blue-950 shadow-lg shadow-black/15 hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                <Gem className="w-3.5 h-3.5" />
                Upgrade Plan
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * The exam pills. Switching here re-generates the practice menu. Admin-only,
 * which is also how EPS-TOPIK is reachable before learners are offered it.
 */
export function ExamSwitcher({
  activeExam,
  onChange,
  onBlue = false,
}: {
  activeExam: ExamType;
  onChange: (exam: ExamType) => void;
  /** Set when drawn on the blue sidebar. */
  onBlue?: boolean;
}) {
  const EXAMS: { exam: ExamType; target: string; activeClass: string }[] = [
    { exam: 'PTE', target: '79+', activeClass: 'bg-primary text-white shadow-sm' },
    { exam: 'IELTS', target: '8.0', activeClass: 'bg-amber-500 text-white shadow-sm' },
    { exam: 'EPS_TOPIK', target: '60+', activeClass: 'bg-emerald-600 text-white shadow-sm' },
  ];

  return (
    <div className={`flex items-center p-1 rounded-xl border ${onBlue ? 'bg-white/10 border-white/25' : 'bg-muted/60 border-border'}`}>
      {EXAMS.map(({ exam, target, activeClass }) => (
        <button
          key={exam}
          onClick={() => onChange(exam)}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all ${
            activeExam === exam
              ? onBlue && exam === 'PTE'
                ? 'bg-white text-primary shadow-sm'
                : activeClass
              : onBlue
                ? 'text-white/75 hover:text-white'
                : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="whitespace-nowrap">{EXAM_LABELS[exam]}</span>
          <span className="text-[9px] opacity-75 font-mono">{target}</span>
        </button>
      ))}
    </div>
  );
}

export function PteVariantSwitcher({
  pteVariant,
  onChange,
  onBlue = false,
}: {
  pteVariant: PteExamVariant;
  onChange: (variant: PteExamVariant) => void;
  onBlue?: boolean;
}) {
  return (
    <div className={`flex items-center p-1 rounded-xl border ${onBlue ? 'bg-white/10 border-white/20' : 'bg-muted/60 border-border'}`}>
      <button
        type="button"
        onClick={() => onChange('academic')}
        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all text-center ${
          pteVariant === 'academic'
            ? 'bg-[#00c4a7] text-white shadow-sm'
            : onBlue
              ? 'text-white/70 hover:text-white'
              : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        PTE Academic
      </button>
      <button
        type="button"
        onClick={() => onChange('core')}
        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all text-center ${
          pteVariant === 'core'
            ? 'bg-[#00c4a7] text-white shadow-sm'
            : onBlue
              ? 'text-white/70 hover:text-white'
              : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        PTE Core
      </button>
    </div>
  );
}

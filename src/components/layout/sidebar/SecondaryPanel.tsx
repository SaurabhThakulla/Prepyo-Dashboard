import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SecondaryNavList from './SecondaryNavList';
import { PrimarySectionConfig, SecondaryNavItem } from './navigation';
import { ExamType, UserProfile, isAdmin } from '@/lib/types';

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
  return (
    <aside
      className={`shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col justify-between transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen
          ? 'w-[min(20rem,calc(100vw-5rem))] lg:w-80 opacity-100 pointer-events-auto shadow-xl lg:shadow-none'
          : 'w-0 opacity-0 pointer-events-none border-none'
      }`}
    >
      <div className="w-[min(20rem,calc(100vw-5rem))] lg:w-80 min-h-0 flex flex-col justify-between h-full">
        <div className="p-4 space-y-3 border-b border-border/80 bg-sidebar/50">
          <div>
            <h3 className="font-display text-sm font-bold text-foreground truncate">{section.title}</h3>
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{section.description}</p>
          </div>

          {isAdmin(user) && <ExamSwitcher activeExam={activeExam} onChange={onExamChange} />}
        </div>

        <SecondaryNavList
          items={section.items}
          fallbackHeading={section.label}
          isItemActive={isItemActive}
          onNavigate={onNavigate}
        />

        <Separator className="bg-border" />

        <div className="p-3 space-y-2 bg-sidebar-background">
          <Link
            to="/profile"
            onClick={onNavigate}
            className="flex items-center justify-between p-2 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                  {user?.name?.charAt(0) || 'L'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground truncate">{user?.name || 'Learner'}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{user?.streakDays ?? 0}d</span>
                  <span>•</span>
                  <span>{user?.xp ?? 0} XP</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

/** The PTE / IELTS pills. Switching here re-generates the practice menu. */
function ExamSwitcher({ activeExam, onChange }: { activeExam: ExamType; onChange: (exam: ExamType) => void }) {
  const EXAMS: { exam: ExamType; target: string; activeClass: string }[] = [
    { exam: 'PTE', target: '79+', activeClass: 'bg-primary text-white shadow-sm' },
    { exam: 'IELTS', target: '8.0', activeClass: 'bg-amber-500 text-white shadow-sm' },
  ];

  return (
    <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
      {EXAMS.map(({ exam, target, activeClass }) => (
        <button
          key={exam}
          onClick={() => onChange(exam)}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all ${
            activeExam === exam ? activeClass : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>{exam}</span>
          <span className="text-[9px] opacity-75 font-mono">{target}</span>
        </button>
      ))}
    </div>
  );
}

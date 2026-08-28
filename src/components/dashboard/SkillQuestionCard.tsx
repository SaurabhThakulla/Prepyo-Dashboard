import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, SquarePen, BookOpen, Headphones } from 'lucide-react';
import { SkillType } from '@/lib/types';

export interface SkillQuestionCardProps {
  skill: SkillType;
  label: string;
  completed: number;
  total: number;
  href?: string;
}

const SKILL_ICONS: Record<SkillType, React.ComponentType<{ className?: string }>> = {
  speaking: Mic,
  writing: SquarePen,
  reading: BookOpen,
  listening: Headphones,
};

export default function SkillQuestionCard({
  skill,
  label,
  completed,
  total,
  href = `/practice?skill=${skill}`,
}: SkillQuestionCardProps) {
  const Icon = SKILL_ICONS[skill] || BookOpen;

  return (
    <Link
      to={href}
      className="group block bg-card dark:bg-[#12161c] border border-border/80 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-200"
    >
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100/60 dark:border-indigo-800/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform duration-200">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Label and Count */}
      <div className="mt-4 space-y-0.5">
        <div className="text-[10px] sm:text-[11px] font-bold text-indigo-500/90 dark:text-indigo-400/90 tracking-wider uppercase">
          {label}
        </div>
        <div className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-white tracking-tight">
          {total > 0 ? `${completed}/${total.toLocaleString()}` : '--'}
        </div>
      </div>
    </Link>
  );
}

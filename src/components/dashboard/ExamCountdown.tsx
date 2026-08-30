import React from 'react';
import { Edit2 } from 'lucide-react';

interface ExamCountdownProps {
  examDate: string;
  daysLeft: number;
  onEdit: () => void;
}

/** The clickable exam date / days-left widget in the dashboard header. */
export default function ExamCountdown({ examDate, daysLeft, onEdit }: ExamCountdownProps) {
  return (
    <div
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={event => event.key === 'Enter' && onEdit()}
      title="Click to change your exam date and time"
      className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-[#00e599]/40 rounded-xl px-5 py-2.5 flex items-center divide-x divide-border dark:divide-white/10 gap-5 cursor-pointer transition-all group shadow-sm shrink-0"
    >
      <div className="space-y-0.5">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>EXAM DATE</span>
          <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-emerald-600 dark:text-[#00e599] transition-opacity" />
        </div>
        <div className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-[#00e599] transition-colors">
          {examDate}
        </div>
      </div>

      <div className="pl-5 space-y-0.5">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">DAYS LEFT</div>
        <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-[#00e599]">{daysLeft}</div>
      </div>
    </div>
  );
}

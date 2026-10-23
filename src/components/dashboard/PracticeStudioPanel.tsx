import React from 'react';
import { Link } from 'react-router-dom';

export interface SkillRow {
  name: string;
  sub: string;
  scoreText: string;
  percent: number;
  href: string;
}

interface PracticeStudioPanelProps {
  skills: SkillRow[];
  mistakeCount: number;
}

const ACTION_LINK_CLASS =
  'text-xs font-medium text-foreground dark:text-zinc-300 hover:text-primary dark:hover:text-white px-3.5 py-1.5 rounded-lg border border-border dark:border-transparent bg-card dark:bg-transparent group-hover:border-primary/30 group-hover:text-primary hover:bg-muted dark:hover:bg-white/5 transition-colors shrink-0';

// Each row lights up blue on hover; the negative margin keeps the text where it was.
const ROW_HOVER_CLASS = '-mx-3 rounded-xl px-3 py-2 transition-colors hover:bg-blue-100 dark:hover:bg-blue-500/20';

export default function PracticeStudioPanel({ skills, mistakeCount }: PracticeStudioPanelProps) {
  return (
    <div className="w-full bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Practice studio</h2>
        <Link
          to="/practice"
          className="text-xs font-semibold text-primary hover:underline transition-all"
        >
          View all tasks
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1">
          <span>SKILLS</span>
          <span className="sm:pr-24">LATEST SCORE</span>
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          {skills.map(skill => (
            <div key={skill.name} className={`flex flex-row items-center justify-between group gap-3 ${ROW_HOVER_CLASS}`}>
              <div className="space-y-0.5 min-w-0 w-20 shrink-0 sm:w-auto sm:shrink sm:flex-1">
                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {skill.name}
                </div>
                <div className="hidden sm:block text-[11px] text-muted-foreground font-normal truncate">{skill.sub}</div>
              </div>

              <div className="flex flex-1 sm:flex-none min-w-0 sm:w-1/2 items-center gap-3 sm:gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="w-full h-1.5 bg-slate-100 group-hover:bg-white dark:bg-slate-800/90 dark:group-hover:bg-zinc-800 rounded-full overflow-hidden transition-colors">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${skill.percent}%` }}
                    />
                  </div>
                  {skill.scoreText ? (
                    <span className="text-xs font-mono text-muted-foreground font-medium self-end text-right whitespace-nowrap">
                      {skill.scoreText}
                    </span>
                  ) : null}
                </div>

                <Link
                  to={skill.href}
                  className="text-xs font-medium text-foreground dark:text-zinc-300 hover:text-primary dark:hover:text-white px-3.5 py-1.5 rounded-lg border border-border dark:border-white/5 hover:border-primary/30 dark:hover:border-white/15 bg-muted/30 group-hover:bg-card group-hover:border-primary/30 group-hover:text-primary dark:bg-transparent hover:bg-muted dark:hover:bg-white/5 transition-all text-center shrink-0 min-w-[70px]"
                >
                  Practice
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 sm:pt-5 border-t border-border dark:border-white/5 space-y-1 sm:space-y-1.5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          TESTS &amp; REVIEW
        </div>

        <TestRow
          title="Diagnostic test"
          sub="15-minute adaptive check"
          href="/diagnostic"
          action="Begin"
        />
        <TestRow
          title="Full mock exam"
          sub="2 hours, scored like the real test"
          href="/mocks"
          action="Schedule"
        />
        <TestRow
          title="History bank"
          sub="All questions you have practiced"
          href="/history"
          action="Review"
          highlight
        />
      </div>
    </div>
  );
}

interface TestRowProps {
  title: string;
  sub: string;
  href: string;
  action: string;
  highlight?: boolean;
}

function TestRow({ title, sub, href, action, highlight }: TestRowProps) {
  return (
    <div className={`group flex items-center justify-between gap-3 ${ROW_HOVER_CLASS}`}>
      <div className="space-y-0.5 min-w-0 flex-1">
        <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{title}</div>
        <div className="text-[11px] text-muted-foreground font-normal truncate">{sub}</div>
      </div>
      <Link
        to={href}
        className={
          highlight
            ? 'text-xs font-semibold text-primary hover:underline px-3.5 py-1.5 transition-colors shrink-0'
            : ACTION_LINK_CLASS
        }
      >
        {action}
      </Link>
    </div>
  );
}

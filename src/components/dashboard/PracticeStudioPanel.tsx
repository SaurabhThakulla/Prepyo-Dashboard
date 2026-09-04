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
  'text-xs font-medium text-foreground dark:text-zinc-300 hover:text-primary dark:hover:text-white px-3.5 py-1.5 rounded-lg border border-border dark:border-transparent hover:bg-muted dark:hover:bg-white/5 transition-colors shrink-0';

/** Left column: the four skills, plus the tests and review shortcuts. */
export default function PracticeStudioPanel({ skills, mistakeCount }: PracticeStudioPanelProps) {
  return (
    <div className="lg:col-span-7 bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-6 space-y-5 shadow-sm">
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
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-1">
          <span>SKILLS</span>
          <span className="sm:pr-24">LATEST SCORE</span>
        </div>

        <div className="space-y-3.5">
          {skills.map(skill => (
            <div key={skill.name} className="flex items-center justify-between py-1 group gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {skill.name}
                </div>
                <div className="text-[11px] text-muted-foreground font-normal truncate">{skill.sub}</div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-16 sm:w-24 h-1 bg-slate-100 dark:bg-zinc-800/90 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${skill.percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground font-medium w-11 sm:w-12 text-right">
                    {skill.scoreText}
                  </span>
                </div>

                <Link
                  to={skill.href}
                  className="text-xs font-medium text-foreground dark:text-zinc-300 hover:text-primary dark:hover:text-white px-3.5 py-1.5 rounded-lg border border-border dark:border-white/5 hover:border-primary/30 dark:hover:border-white/15 bg-muted/30 dark:bg-transparent hover:bg-muted dark:hover:bg-white/5 transition-all text-center shrink-0 min-w-[70px]"
                >
                  Practice
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-border dark:border-white/5 space-y-3.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
          title="Mistake bank"
          sub={`${mistakeCount} items waiting for review`}
          href="/mistakes"
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
    <div className="flex items-center justify-between py-1 gap-3">
      <div className="space-y-0.5 min-w-0 flex-1">
        <div className="text-sm font-bold text-foreground">{title}</div>
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

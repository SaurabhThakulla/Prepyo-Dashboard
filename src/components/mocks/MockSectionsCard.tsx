import React, { useState } from 'react';
import { BookOpen, Bookmark, CheckCircle2, Headphones, LogOut, Mic, PenLine, Play, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FullscreenButton from '@/components/layout/FullscreenButton';
import { FULL_MOCK_SECTIONS, FullMockSectionStatus, FullMockSkill, sectionLabel } from '@/lib/fullMock';

export interface MockSectionsCardSection {
  skill: FullMockSkill;
  status: FullMockSectionStatus;
}

interface Props {
  title: string;
  /** The test's sections, in the order they are sat. */
  sections: MockSectionsCardSection[];
  /** The section to sit next, if any. */
  current: FullMockSkill | null;
  busy: boolean;
  /** Starting is not possible yet (an Institute Mock before it opens, or after it closes). */
  disabled?: boolean;
  onOpen: (skill: FullMockSkill) => void;
  onLeave: () => void;
  /** Ends the test early. Without it there is no End button. */
  onEnd?: () => void;
  /** Shown under the sections, such as an error or when the test opens. */
  notice?: React.ReactNode;
  /** A line added to the footer note, such as the hand-in date. */
  note?: string;
}

export const SECTION_ICONS: Record<FullMockSkill, typeof Headphones> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

// A button on the blue bar: a pill, like the ones inside a section.
/**
 * Between the sections of an IELTS mock: the sections in order with the next
 * one to start, between the same blue bars as inside a section. The full mock
 * and an Institute Mock show the same card.
 */
export default function MockSectionsCard({ title, sections, current, busy, disabled = false, onOpen, onLeave, onEnd, notice, note }: Props) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const done = sections.filter(s => s.status === 'submitted' || s.status === 'closed').length;
  return (
    <Card className="w-full max-w-2xl overflow-hidden border-0 p-0">
      {/* The same blue bar as the footer, and as tall: the test's name, how far along, full screen. */}
      <div className="dark test-bar flex items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
        <h2 className="truncate font-display text-lg font-bold">{title}</h2>
        <span className="flex shrink-0 items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {done} of {sections.length} done
          </span>
          <FullscreenButton tone="onPrimary" />
        </span>
      </div>
      <div className="space-y-3 px-5 py-5 sm:px-8 sm:py-6">
        <ol className="space-y-3">
          {sections.map((section, i) => (
            <SectionRow key={section.skill} index={i} section={section} current={current === section.skill}>
              {current === section.skill && (
                <div className="mt-4 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-foreground/80">
                    {aboutOf(section.skill)}{' '}
                    {section.skill === 'listening' && 'Use headphones.'}
                    {section.skill === 'speaking' && 'You will need a microphone and a quiet room.'}
                  </p>
                  <Button onClick={() => onOpen(section.skill)} disabled={busy || disabled} className="h-10 shrink-0 gap-2 font-bold">
                    {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                    {section.status === 'in_progress' ? `Continue ${sectionLabel(section.skill)}` : `Start ${sectionLabel(section.skill)}`}
                  </Button>
                </div>
              )}
            </SectionRow>
          ))}
        </ol>
        {notice}
      </div>
      {/* The same blue bar as inside a section: leaving is always in the same place. */}
      <div className="dark test-bar px-5 py-3.5 text-sm sm:px-8">
        {confirmEnd && onEnd ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>End this full mock without an overall band? It is not returned to your allowance.</span>
            <span className="flex shrink-0 gap-2">
              {/* Keeping going is the safe choice, so it is the lit pill; ending is plainly red. */}
              <Button autoFocus className="test-next h-10 gap-2 rounded-full px-5 font-bold" onClick={() => setConfirmEnd(false)}>
                <Play className="h-3.5 w-3.5 fill-current" /> Keep going
              </Button>
              <Button
                className="h-10 gap-2 rounded-full bg-rose-500 px-5 font-bold text-white shadow-md hover:bg-rose-600"
                disabled={busy}
                onClick={onEnd}
              >
                <XCircle className="h-4 w-4" /> End it
              </Button>
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Bookmark className="h-4 w-4 shrink-0" />
              <span>
                Your place is kept, so you can stop between sections and come back.{note ? ` ${note}` : ''}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
              {onEnd && (
                <Button
                  variant="ghost"
                  className="test-end h-10 gap-2 rounded-full px-4 font-semibold"
                  onClick={() => setConfirmEnd(true)}
                >
                  <XCircle className="h-4 w-4" /> End mock
                </Button>
              )}
              <Button className="test-next h-10 gap-2 rounded-full px-5 font-bold" onClick={onLeave}>
                <LogOut className="h-4 w-4" /> Save and exit
              </Button>
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

const metaOf = (skill: FullMockSkill) => FULL_MOCK_SECTIONS.find(s => s.skill === skill)!;
const aboutOf = (skill: FullMockSkill) => metaOf(skill).about;

function SectionRow({
  index,
  section,
  current,
  children,
}: {
  index: number;
  section: MockSectionsCardSection;
  current: boolean;
  children?: React.ReactNode;
}) {
  const meta = metaOf(section.skill);
  const Icon = SECTION_ICONS[section.skill];
  const status =
    section.status === 'submitted'
      ? { tile: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2, pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', text: 'Done' }
      : section.status === 'closed'
        ? { tile: 'bg-muted text-muted-foreground', icon: XCircle, pill: 'bg-muted text-muted-foreground', text: 'No band' }
        : section.status === 'in_progress'
          ? { tile: 'bg-primary text-primary-foreground', icon: Icon, pill: 'bg-primary/10 text-primary', text: 'In progress' }
          : current
            ? { tile: 'bg-primary text-primary-foreground', icon: Icon, pill: 'bg-primary/10 text-primary', text: 'Up next' }
            : { tile: 'bg-muted text-muted-foreground', icon: Icon, pill: 'bg-muted text-muted-foreground', text: 'Not started' };
  const StatusIcon = status.icon;
  return (
    <li
      className={`rounded-xl p-3 transition-colors sm:p-4 ${
        current ? 'bg-primary/[0.06]' : 'bg-muted/40'
      }`}
      aria-current={current ? 'step' : undefined}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${status.tile}`}>
          <StatusIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {index + 1}. {meta.label}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground first-letter:uppercase">{meta.timing}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.pill}`}>{status.text}</span>
      </div>
      {children}
    </li>
  );
}

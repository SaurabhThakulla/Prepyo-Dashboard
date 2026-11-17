import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, FileText, ListChecks, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MockPaperList from '@/components/mocks/MockPaperList';
import { useMockPapers } from '@/lib/hooks/useMockPapers';
import { pteMockMeta } from '@/lib/pteMock/catalog';
import { ExamType } from '@/lib/types';
import AskInstitution from '@/components/common/AskInstitution';
import PreTestChecks from '@/components/mocks/PreTestChecks';

type Skill = 'speaking' | 'writing' | 'reading' | 'listening';

/** One part of the section (a task, passage or recording), shown as a tile. */
export interface SectionPart {
  label: string;
  timing: string;
}

interface Props {
  exam: ExamType;
  skill: Skill;
  title: string;
  description: string;
  duration: string;
  items: string;
  parts: SectionPart[];
  credits: number;
  subTestsRemaining: number;
  isStarting: boolean;
  /** Starts the test: a numbered one when picked, otherwise the next one dealt. */
  onStart: (paperId?: string) => void;
  /** A consultancy's student: no upgrade to offer. */
  institution?: boolean;
}

const SECTION_TITLE = 'text-xs font-bold uppercase tracking-wide text-muted-foreground';
const PART_COLUMNS: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' };

/**
 * The start page of an IELTS section mock, laid out like the full mock's: a
 * full-width header, a card of the section's parts, then the numbered tests.
 */
export default function SectionMockIntro({
  exam, skill, title, description, duration, items, parts,
  credits, subTestsRemaining, isStarting, onStart, institution = false,
}: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: papers = [], isLoading } = useMockPapers(exam, skill);
  const selectedPaperId = searchParams.get('paper');
  const meta = pteMockMeta(skill);
  const unlimited = !Number.isFinite(subTestsRemaining);
  const hasCredits = unlimited || subTestsRemaining >= credits;
  // A new attempt goes through the equipment checks first; a resumed one does not.
  const [checking, setChecking] = useState<{ paperId?: string } | null>(null);

  if (checking) {
    return (
      <PreTestChecks
        exam={exam === 'PTE' ? 'PTE' : 'IELTS'}
        title={title}
        skills={[skill]}
        sections={parts}
        beginning={isStarting}
        onBegin={() => onStart(checking.paperId)}
        onCancel={() => setChecking(null)}
      />
    );
  }

  return (
    <div className="w-full pb-10">
      <header className="bg-gradient-to-r from-primary to-primary/75 px-4 py-8 text-primary-foreground sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/80">
              <meta.icon className="h-4 w-4" /> {exam} · Sectional test
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/85 sm:text-base">{description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <Clock className="h-3.5 w-3.5" /> {duration}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <ListChecks className="h-3.5 w-3.5" /> {items}
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/mocks?tab=reports')}
            className="shrink-0 gap-2 border-0 bg-white/15 font-semibold text-white hover:bg-white/25"
          >
            <FileText className="h-4 w-4" /> Score reports
          </Button>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ol className={`grid gap-3 p-4 sm:p-5 ${PART_COLUMNS[parts.length] ?? 'sm:grid-cols-2'}`}>
            {parts.map((part, i) => (
              <li key={part.label} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <meta.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground">
                    {i + 1}. {part.label}
                  </span>
                  <span className="block text-xs leading-snug text-muted-foreground first-letter:uppercase">{part.timing}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="border-t border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
            {unlimited
              ? 'Your plan has unlimited practice tests.'
              : hasCredits
              ? `Uses ${credits} of your daily sub-tests (${subTestsRemaining} left today).`
              : `Needs ${credits} daily sub-tests; you have ${subTestsRemaining} left today.`}
          </p>
        </section>

        <section className="w-full space-y-4">
          <h2 className={SECTION_TITLE}>Numbered tests</h2>
          {/* Out of practice tests for today: the way on, above the list. */}
          {!hasCredits &&
            (institution ? (
              <AskInstitution className="w-full justify-center" />
            ) : (
              <Button asChild className="w-full h-11 font-bold gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                <Link to="/subscription">
                  <ShieldAlert className="h-4 w-4" /> Upgrade for more practice tests <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          <MockPaperList
            variant="page"
            papers={papers}
            isLoading={isLoading}
            selectedPaperId={selectedPaperId}
            exam={exam}
            section={skill}
            onStart={paper => !isStarting && setChecking({ paperId: paper.id })}
            onResume={paper => !isStarting && onStart(paper.id)}
            onRetake={paper => !isStarting && setChecking({ paperId: paper.id })}
            onReview={paper => {
              if (paper.attemptId) navigate(`/mocks?review=${paper.attemptId}`);
            }}
          />
        </section>
      </div>
    </div>
  );
}

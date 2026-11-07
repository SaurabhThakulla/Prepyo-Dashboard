import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, ListChecks, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MockPaperList from '@/components/mocks/MockPaperList';
import { useMockPapers } from '@/lib/hooks/useMockPapers';
import { pteMockMeta } from '@/lib/pteMock/catalog';
import { ExamType } from '@/lib/types';
import AskInstitution from '@/components/common/AskInstitution';

type Skill = 'speaking' | 'writing' | 'reading' | 'listening';

interface Props {
  exam: ExamType;
  skill: Skill;
  title: string;
  description: string;
  duration: string;
  items: string;
  credits: number;
  subTestsRemaining: number;
  isStarting: boolean;
  /** Starts the test: a numbered one when picked, otherwise the next one dealt. */
  onStart: (paperId?: string) => void;
  /** A consultancy's student: no upgrade to offer. */
  institution?: boolean;
}

const SECTION_TITLE = 'text-xs font-bold uppercase tracking-wide text-muted-foreground';

/**
 * The start page of an IELTS section mock, laid out like the PTE one: a
 * full-width header, then the numbered tests centred on the page.
 */
export default function SectionMockIntro({
  exam, skill, title, description, duration, items,
  credits, subTestsRemaining, isStarting, onStart, institution = false,
}: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: papers = [], isLoading } = useMockPapers(exam, skill);
  const selectedPaperId = searchParams.get('paper');
  const meta = pteMockMeta(skill);
  const unlimited = !Number.isFinite(subTestsRemaining);
  const hasCredits = unlimited || subTestsRemaining >= credits;

  return (
    <div className="w-full">
      <header className={`bg-gradient-to-r ${meta.accent} px-4 sm:px-8 py-8 text-white`}>
        <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/80">
          <meta.icon className="h-4 w-4" /> {exam} · Sectional test
        </div>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm sm:text-base text-white/85">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
            <Clock className="h-3.5 w-3.5" /> {duration}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
            <ListChecks className="h-3.5 w-3.5" /> {items}
          </span>
        </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-4 px-4 sm:px-8 py-8">
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
            onStart={paper => !isStarting && onStart(paper.id)}
            onResume={paper => !isStarting && onStart(paper.id)}
            onRetake={paper => !isStarting && onStart(paper.id)}
            onReview={paper => {
              if (paper.attemptId) navigate(`/mocks?review=${paper.attemptId}`);
            }}
          />
      </section>
    </div>
  );
}

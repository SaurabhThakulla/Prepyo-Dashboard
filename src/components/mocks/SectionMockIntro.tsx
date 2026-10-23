import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, ListChecks, Loader2, Play, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MockPaperList from '@/components/mocks/MockPaperList';
import { useMockPapers } from '@/lib/hooks/useMockPapers';
import { pteMockMeta } from '@/lib/pteMock/catalog';
import { ExamType } from '@/lib/types';

type Skill = 'speaking' | 'writing' | 'reading' | 'listening';

interface Props {
  exam: ExamType;
  skill: Skill;
  title: string;
  description: string;
  duration: string;
  items: string;
  /** What the test is made of: one line per part or task. */
  parts: { name: string; detail: string }[];
  rules: string[];
  equipment: string;
  credits: number;
  subTestsRemaining: number;
  isStarting: boolean;
  /** Starts the test: a numbered one when picked, otherwise the next one dealt. */
  onStart: (paperId?: string) => void;
}

const SECTION_TITLE = 'text-xs font-bold uppercase tracking-wide text-muted-foreground';

/**
 * The start page of an IELTS section mock, laid out like the PTE one: a
 * full-width header, the numbered tests across the page, and the parts,
 * equipment, Start button and rules in a column beside them.
 */
export default function SectionMockIntro({
  exam, skill, title, description, duration, items, parts, rules, equipment,
  credits, subTestsRemaining, isStarting, onStart,
}: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: papers = [], isLoading } = useMockPapers(exam, skill);
  const selectedPaperId = searchParams.get('paper');
  const selectedPaper = papers.find(p => p.id === selectedPaperId) ?? null;
  const meta = pteMockMeta(skill);
  const unlimited = !Number.isFinite(subTestsRemaining);
  const hasCredits = unlimited || subTestsRemaining >= credits;

  return (
    <div className="w-full">
      <header className={`bg-gradient-to-r ${meta.accent} px-4 sm:px-8 lg:px-10 py-8 text-white`}>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/80">
          <meta.icon className="h-4 w-4" /> {exam} · Sectional test
        </div>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm sm:text-base text-white/85 max-w-3xl">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
            <Clock className="h-3.5 w-3.5" /> {duration}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
            <ListChecks className="h-3.5 w-3.5" /> {items}
          </span>
        </div>
      </header>

      <div className="px-4 sm:px-8 lg:px-10 py-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-10">
        <section className="space-y-4 min-w-0">
          <h2 className={SECTION_TITLE}>Numbered tests</h2>
          <MockPaperList
            variant="page"
            papers={papers}
            isLoading={isLoading}
            selectedPaperId={selectedPaperId}
            exam={exam}
            section={skill}
            onStart={paper => onStart(paper.id)}
            onResume={paper => onStart(paper.id)}
            onRetake={paper => onStart(paper.id)}
            onReview={paper => {
              if (paper.attemptId) navigate(`/mocks?review=${paper.attemptId}`);
            }}
          />
        </section>

        <aside className="order-first xl:order-none space-y-8 xl:sticky xl:top-6 xl:self-start">
          <section className="space-y-2">
            <h2 className={SECTION_TITLE}>What is in this test</h2>
            <ul className="divide-y divide-border">
              {parts.map(part => (
                <li key={part.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-foreground">{part.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">{part.detail}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className={SECTION_TITLE}>Equipment check</h2>
            <p className="text-sm text-muted-foreground">{equipment}</p>
          </section>

          <section className="space-y-2">
            {hasCredits ? (
              <Button
                className="w-full h-12 font-bold gap-2"
                disabled={isStarting}
                onClick={() => onStart(selectedPaper?.id)}
              >
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                {isStarting
                  ? 'Starting test…'
                  : selectedPaper
                    ? `${selectedPaper.status === 'completed' ? 'Retake' : 'Start'} Test ${selectedPaper.number}`
                    : 'Start the test'}
              </Button>
            ) : (
              <Button asChild className="w-full h-12 font-bold gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                <Link to="/subscription">
                  <ShieldAlert className="h-4 w-4" /> Upgrade for more practice tests <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <p className="text-[11px] text-center text-muted-foreground">
              {unlimited
                ? 'Unlimited practice on your plan.'
                : `Uses ${credits} of your daily practice sub-tests (${subTestsRemaining} left today).`}{' '}
              A test you have started carries on at no extra cost.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={SECTION_TITLE}>Test rules</h2>
            <ul className="space-y-2">
              {rules.map(rule => (
                <li key={rule} className="flex gap-2 text-xs text-foreground leading-relaxed">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" /> {rule}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

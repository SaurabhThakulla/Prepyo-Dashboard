import React from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import MockPaperList from '@/components/mocks/MockPaperList';
import { CdsAttempt, CdsPaper, CdsUserPlan } from './cdsApi';
import { cdsPaperItems, cdsPaperName, cdsPapersFor, useCdsTrack, useCdsExam } from './cdsShared';

interface Props {
  tabs: React.ReactNode;
  papers: CdsPaper[];
  attempts: CdsAttempt[];
  plan?: CdsUserPlan;
  /** english, gk or maths: only that paper's tests. */
  paperType: string | null;
  isLoading: boolean;
  onStart: (paperId: string) => void;
  onReview: (attemptId: string) => void;
}

/** The CDS mock catalogue: the shared banner and numbered test list, one paper or all three. */
export default function CdsPaperCatalog({ tabs, papers, attempts, plan, paperType, isLoading, onStart, onReview }: Props) {
  const exam = useCdsExam();
  const ncc = exam === 'NCC';
  const track = useCdsTrack(!ncc);
  const route = ncc
    ? [
        { type: 'ncc_b', name: "'B' Certificate" },
        { type: 'ncc_c', name: "'C' Certificate" },
      ]
    : cdsPapersFor(track);
  // OTA sees English and GK only, unless a link asks for Maths by name. NCC lists its B and C mocks.
  const shown = paperType
    ? papers.filter(p => p.paperType === paperType)
    : ncc
      ? papers
      : papers.filter(p => route.some(r => r.type === p.paperType));
  const items = cdsPaperItems(shown, attempts);
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/50'
    }`;

  return (
    <div className="w-full pb-10">
      <div className="relative flex min-h-48 items-center overflow-hidden bg-gradient-to-r from-primary to-indigo-600 px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex w-full items-center gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex">
            <Award className="h-6 w-6" />
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
              {ncc ? "NCC 'B' & 'C' Certificate Mock Tests" : paperType ? `CDS ${cdsPaperName(paperType)} tests` : 'UPSC CDS Mock Tests'}
            </h1>
            <p className="text-xs text-white/85 sm:text-sm">
              {ncc
                ? 'The written paper, 175 questions in 3 hours: 2 marks a right answer, half a mark off a wrong one. The practical is assessed at camp.'
                : 'Timed papers marked as UPSC marks them: a wrong answer costs a third of a right one.'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label={ncc ? 'NCC papers' : 'CDS papers'} className="flex flex-wrap gap-2">
            <Link to="/mocks" className={chip(!paperType)}>All papers</Link>
            {route.map(p => (
              <Link key={p.type} to={`/mocks?paper=${p.type}`} className={chip(paperType === p.type)}>
                {p.name}
              </Link>
            ))}
          </nav>
          <div className="flex justify-end">{tabs}</div>
        </div>

        {plan && !plan.isPremium && (
          <p className="text-xs text-muted-foreground">
            Your plan includes {plan.freeMocksLimit} {exam} test; you have taken {plan.completedMocks}.{' '}
            <Link to="/subscription" className="font-bold text-primary">See {exam} plans</Link>
          </p>
        )}

        <MockPaperList
          variant="page"
          papers={items}
          isLoading={isLoading}
          exam={exam}
          section={paperType ?? 'all'}
          onStart={paper => onStart(paper.id)}
          onResume={paper => onStart(paper.id)}
          onRetake={paper => onStart(paper.id)}
          onReview={paper => paper.attemptId && onReview(paper.attemptId)}
        />
      </div>
    </div>
  );
}

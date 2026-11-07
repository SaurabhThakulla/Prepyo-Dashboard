import { cn } from '@/lib/utils';

/** The order a PTE score report lists the communicative skills in. */
const SKILLS = ['listening', 'reading', 'speaking', 'writing'] as const;
type PteSkill = (typeof SKILLS)[number];

const SKILL_LABEL: Record<PteSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  speaking: 'Speaking',
  writing: 'Writing',
};

export interface PteReportFormProps {
  candidateName: string;
  /** When the paper was handed in. */
  testDate: string;
  reportId: string;
  /** "Speaking sectional", "Full mock test". */
  testType: string;
  /** Out of 90; a sectional test has none. */
  overall: number | null;
  /** Each skill the paper scored, out of 90. A skill left out was not in the test. */
  skills: Partial<Record<string, number | null>>;
}

/** A position on the 10–90 scale as a share of the bar. */
const onScale = (score: number) => ((Math.min(90, Math.max(10, score)) - 10) / 80) * 100;

/**
 * A PTE result laid out like the PTE Academic score report: the candidate, the
 * overall score and the four communicative skills on the 10–90 scale. It says
 * on its face that it is a practice estimate, never an official report.
 */
export default function PteReportForm({ candidateName, testDate, reportId, testType, overall, skills }: PteReportFormProps) {
  const date = new Date(testDate);
  const dateText = Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const taken = SKILLS.filter(s => s in skills);
  const headline = overall ?? (taken.length === 1 ? skills[taken[0]] ?? null : null);
  const headlineLabel = overall != null || taken.length !== 1 ? 'Overall score' : `${SKILL_LABEL[taken[0]]} score`;

  return (
    <section
      data-testid="pte-report-form"
      className="relative overflow-hidden border border-trf-ink/15 bg-trf-paper text-trf-ink shadow-sm font-report"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none text-6xl font-bold uppercase tracking-widest text-trf-ink/[0.03] -rotate-12 sm:text-7xl"
      >
        Practice
      </span>

      <header className="relative flex flex-col gap-1 bg-trf-accent px-4 py-4 text-trf-paper sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-trf-paper/75">Prepyo · PTE Academic practice</p>
        <h2 className="text-xl font-bold uppercase tracking-wide sm:text-2xl">Score Report</h2>
      </header>

      <div className="relative grid grid-cols-3 gap-px bg-trf-ink/10">
        <Field label="Test date" value={dateText} />
        <Field label="Test type" value={testType} accent testId="pte-test-type" />
        <Field label="Delivery" value="Computer" />
      </div>

      <Bar>Candidate details</Bar>
      <div className="relative grid grid-cols-2 gap-px bg-trf-ink/10">
        <Field label="Candidate name" value={candidateName.trim() || '—'} big />
        <Field label="Report number" value={reportId.replace(/-/g, '').slice(0, 10).toUpperCase()} big />
      </div>

      <Bar>Score</Bar>
      <div className="relative grid gap-px bg-trf-ink/10 sm:grid-cols-[13rem_1fr]">
        <div
          className="flex flex-col items-center justify-center gap-1 px-4 py-5"
          style={{ background: 'linear-gradient(hsl(var(--trf-accent) / 0.06), hsl(var(--trf-accent) / 0.06)), hsl(var(--trf-paper))' }}
          data-testid="pte-overall"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-trf-accent">{headlineLabel}</span>
          <span className="flex h-20 min-w-24 items-center justify-center border border-trf-accent/60 bg-trf-paper px-3 text-5xl font-bold tabular-nums text-trf-accent">
            {headline != null ? Math.round(headline) : '—'}
          </span>
          <span className="text-[10px] text-trf-ink/50">out of 90</span>
        </div>

        <div className="space-y-3 bg-trf-paper px-4 py-4 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-wide">Communicative skills</p>
          {SKILLS.map(skill => {
            const sat = skill in skills;
            const score = skills[skill];
            return (
              <div key={skill} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3" data-testid={`pte-${skill}`}>
                <span className={cn('text-sm font-semibold', !sat && 'text-trf-ink/40')}>{SKILL_LABEL[skill]}</span>
                <span className="relative h-3 bg-trf-ink/10">
                  {sat && score != null && <span className="absolute inset-y-0 left-0 bg-trf-accent" style={{ width: `${onScale(score)}%` }} />}
                  {overall != null && <span className="absolute -inset-y-1 w-0.5 bg-trf-ink/70" style={{ left: `${onScale(overall)}%` }} />}
                </span>
                <span className={cn('text-right text-base font-bold tabular-nums', !sat && 'whitespace-nowrap text-xs font-normal text-trf-ink/40')}>
                  {sat ? (score != null ? Math.round(score) : '—') : 'Not taken'}
                </span>
              </div>
            );
          })}
          <div className="grid grid-cols-[5.5rem_1fr_4.5rem] gap-3 text-[10px] text-trf-ink/50">
            <span />
            <span className="flex justify-between">
              <span>10</span>
              <span>30</span>
              <span>50</span>
              <span>70</span>
              <span>90</span>
            </span>
            <span />
          </div>
        </div>
      </div>

      <footer className="relative flex flex-col gap-1 bg-trf-accent px-4 py-2.5 text-[10px] leading-relaxed text-trf-paper/90 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>
          {overall != null
            ? 'Items count towards more than one skill, as in the real test. The line marks the overall score.'
            : 'An overall score is given only for a full mock test.'}
        </span>
        <span className="font-bold uppercase tracking-wide">Practice estimate · not an official PTE score</span>
      </footer>
    </section>
  );
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative border-y border-trf-ink/10 bg-trf-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-trf-accent sm:px-6">
      {children}
    </div>
  );
}

function Field({ label, value, big = false, accent = false, testId }: { label: string; value: string; big?: boolean; accent?: boolean; testId?: string }) {
  return (
    <div className="min-w-0 bg-trf-paper px-4 py-2.5 sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-wide text-trf-ink/50">{label}</p>
      <p
        data-testid={testId}
        className={cn('font-semibold uppercase', accent ? 'leading-snug text-trf-accent' : 'truncate', big ? 'text-base' : 'text-sm')}
      >
        {value}
      </p>
    </div>
  );
}

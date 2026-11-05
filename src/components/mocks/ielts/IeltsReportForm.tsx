import { cn } from '@/lib/utils';
import { IELTS_SKILLS, IeltsSkill, bandDescriptor, cefrLevel } from '@/lib/mockReview';

const SKILL_LABEL: Record<IeltsSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

export interface IeltsReportFormProps {
  candidateName: string;
  module: 'academic' | 'general_training';
  /** When the attempt was handed in. */
  testDate: string;
  /** Shown as the report number. */
  reportId: string;
  /** Bands of the sections sat; a section not sat is left out. */
  bands: Partial<Record<IeltsSkill, number | null>>;
  /** Only a full mock has one. */
  overall: number | null;
  /** True for a sectional test, where the other three sections were not part of it. */
  sectional: boolean;
}

/**
 * The result laid out like an IELTS Test Report Form: the candidate's details,
 * the four section bands with the overall band and its CEFR level. It says on
 * its face that it is a practice estimate, never an official report.
 */
export default function IeltsReportForm({
  candidateName,
  module,
  testDate,
  reportId,
  bands,
  overall,
  sectional,
}: IeltsReportFormProps) {
  const skill = sectional ? IELTS_SKILLS.find(s => s in bands) : undefined;
  const headline = overall ?? (skill ? bands[skill] ?? null : null);
  const testType = skill ? `${SKILL_LABEL[skill]} sectional` : 'Full mock test';
  const date = new Date(testDate);
  const dateText = Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <section
      data-testid="ielts-report-form"
      className="relative overflow-hidden border border-trf-ink/15 bg-trf-paper text-trf-ink shadow-sm font-report"
    >
      {/* A watermark, so a screenshot cannot pass for an official report. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none text-6xl font-bold uppercase tracking-widest text-trf-ink/[0.03] -rotate-12 sm:text-7xl"
      >
        Practice
      </span>

      <header className="relative flex flex-col gap-3 border-b border-trf-ink/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-trf-accent">Prepyo · IELTS practice</p>
          <h2 className="text-xl font-bold uppercase tracking-wide sm:text-2xl">Test Report Form</h2>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <Tick checked={module === 'academic'}>Academic</Tick>
          <Tick checked={module === 'general_training'}>General Training</Tick>
        </div>
      </header>

      <div className="relative grid grid-cols-3 gap-px bg-trf-ink/10">
        <Field label="Test date" value={dateText} />
        <Field label="Test type" value={testType} testId="trf-test-type" accent />
        <Field label="Delivery" value="Computer" />
      </div>

      <Bar>Candidate details</Bar>
      <div className="relative grid grid-cols-2 gap-px bg-trf-ink/10">
        <Field label="Candidate name" value={candidateName.trim() || '—'} big />
        <Field label="Report number" value={reportId.replace(/-/g, '').slice(0, 10).toUpperCase()} big />
      </div>

      <Bar>Test results</Bar>
      <div className="relative grid grid-cols-3 gap-px bg-trf-ink/10 sm:grid-cols-6">
        {IELTS_SKILLS.map(s => {
          const sat = s in bands;
          const band = bands[s];
          return (
            <div key={s} className="flex flex-col items-center gap-1 bg-trf-paper px-2 py-3" data-testid={`trf-${s}`}>
              <span className={cn('text-[11px] font-bold uppercase tracking-wide', !sat && 'text-trf-ink/45')}>{SKILL_LABEL[s]}</span>
              <BandBox value={sat ? band ?? null : null} muted={!sat} />
              <span className="h-3 text-[10px] text-trf-ink/50">{sat ? (band == null ? 'Not rated' : '') : 'Not taken'}</span>
            </div>
          );
        })}
        {/* The tint sits on paper: on its own it would let the grid lines show through. */}
        <div
          className="flex flex-col items-center gap-1 px-2 py-3"
          style={{ background: 'linear-gradient(hsl(var(--trf-accent) / 0.06), hsl(var(--trf-accent) / 0.06)), hsl(var(--trf-paper))' }}
          data-testid="trf-overall"
        >
          <span className="text-center text-[11px] font-bold uppercase tracking-wide text-trf-accent">Overall band</span>
          <BandBox value={overall} strong />
          <span className="h-3 text-[10px] text-trf-ink/50">{overall == null ? 'Needs all four' : ''}</span>
        </div>
        <div className="flex flex-col items-center gap-1 bg-trf-paper px-2 py-3">
          <span className="text-[11px] font-bold uppercase tracking-wide">CEFR level</span>
          <span className="flex h-12 min-w-14 items-center justify-center border border-trf-ink/20 bg-trf-paper px-2 text-lg font-bold">
            {overall != null ? cefrLevel(overall) : '—'}
          </span>
          <span className="h-3" />
        </div>
      </div>

      {headline != null && (
        <div className="relative border-t border-trf-ink/10 px-4 py-3 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-wide text-trf-ink/50">
            {overall != null ? 'Overall band' : 'Band'} {headline.toFixed(1)}
          </p>
          <p className="text-base font-bold">{bandDescriptor(headline)}</p>
        </div>
      )}

      <footer className="relative flex flex-col gap-1 border-t border-trf-ink/10 bg-trf-ink/[0.02] px-4 py-2.5 text-[10px] leading-relaxed text-trf-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>
          {overall != null
            ? 'Overall band: the mean of the four section bands, rounded to the nearest half band.'
            : 'An overall band is given only when all four sections are sat in one full test.'}
        </span>
        <span className="font-bold uppercase tracking-wide">Practice estimate · not an official IELTS result</span>
      </footer>
    </section>
  );
}

function Tick({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <span className={cn('flex items-center gap-1.5 whitespace-nowrap', !checked && 'text-trf-ink/55')}>
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center border text-[11px] font-bold leading-none',
          checked ? 'border-trf-accent bg-trf-accent text-trf-paper' : 'border-trf-ink/30',
        )}
      >
        {checked ? '✓' : ''}
      </span>
      {children}
    </span>
  );
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative border-y border-trf-ink/10 bg-trf-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-trf-accent sm:px-6">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  big = false,
  accent = false,
  testId,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: boolean;
  testId?: string;
}) {
  return (
    <div className="min-w-0 bg-trf-paper px-4 py-2.5 sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-wide text-trf-ink/50">{label}</p>
      <p
        data-testid={testId}
        className={cn(
          'font-semibold uppercase',
          // The test type is the one value worth wrapping rather than cutting off.
          accent ? 'text-trf-accent leading-snug' : 'truncate',
          
          big ? 'text-base' : 'text-sm',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function BandBox({ value, strong = false, muted = false }: { value: number | null; strong?: boolean; muted?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-12 min-w-14 items-center justify-center border bg-trf-paper px-2 text-2xl font-bold tabular-nums',
        strong ? 'border-trf-accent/60 text-trf-accent' : 'border-trf-ink/25 shadow-sm',
        muted && 'border-dashed border-trf-ink/15 text-trf-ink/25 shadow-none',
      )}
    >
      {value != null ? value.toFixed(1) : '—'}
    </span>
  );
}

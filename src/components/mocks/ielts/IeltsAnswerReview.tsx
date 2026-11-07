import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, CircleMinus, CircleSlash, Mic, PenTool, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TestFeedback from '@/components/mocks/TestFeedback';
import EvaluationCard from '@/components/practice/EvaluationCard';
import { AnswerRecording, MarkedAnswer, MarkedAnswerLegend } from '@/components/practice/ResultParts';
import {
  ItemStatus,
  MockReview,
  ReviewItem,
  ReviewSection,
  ReviewTask,
  ReviewTurn,
  itemStatus,
  recordingUrl,
} from '@/lib/mockReview';

const SKILL_LABEL: Record<string, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

const STATUS: Record<ItemStatus, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  correct: { label: 'Correct', icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
  partial: { label: 'Partly right', icon: CircleMinus, tone: 'text-amber-600 dark:text-amber-400' },
  wrong: { label: 'Wrong', icon: XCircle, tone: 'text-rose-600 dark:text-rose-400' },
  blank: { label: 'Not answered', icon: CircleSlash, tone: 'text-muted-foreground' },
};

/** A review card: lifts and turns brand blue on hover, and opens its details on click. */
const CARD =
  'group cursor-pointer rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-all duration-200 ' +
  'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 active:translate-y-0 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const PART_HEADING = 'px-1 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-primary';
/** The details button follows its card's hover. */
const DETAILS =
  'h-8 shrink-0 border-primary/40 text-xs text-primary group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground';

/** Lets a card open with Enter or Space, as a button would. */
const activate = (open: () => void) => (event: React.KeyboardEvent) => {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    open();
  }
};

const SPEAKING_PART: Record<number, string> = {
  1: 'Part 1 · Introduction and interview',
  2: 'Part 2 · Long turn',
  3: 'Part 3 · Discussion',
};

/** Each speaking part keeps one accent: the heading badge and the mic, which fills on hover. */
const PART_TONE: Record<number, { badge: string; chip: string }> = {
  1: { badge: 'bg-primary text-primary-foreground', chip: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' },
  2: { badge: 'bg-violet-600 text-white', chip: 'bg-violet-500/10 text-violet-600 group-hover:bg-violet-600 group-hover:text-white dark:text-violet-400' },
  3: { badge: 'bg-teal-600 text-white', chip: 'bg-teal-500/10 text-teal-700 group-hover:bg-teal-600 group-hover:text-white dark:text-teal-400' },
};

/** A band as a pill tinted by how strong it is. */
function BandPill({ band }: { band: number }) {
  const tone =
    band >= 7 ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400'
    : band >= 6 ? 'bg-primary/10 text-primary ring-primary/30'
    : band >= 5 ? 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-400'
    : 'bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-400';
  return (
    <span className={cn('shrink-0 rounded-lg px-2.5 py-1 font-mono text-base font-black tabular-nums ring-1', tone)}>
      {band.toFixed(1)}
    </span>
  );
}

const numbers = (item: ReviewItem) => (item.to > item.from ? `${item.from}–${item.to}` : String(item.from));
const blankless = (text: string) => text.replace(/_{3,}/g, '……');

/** Every question of the attempt, section by section, each opening into its details. */
export default function IeltsAnswerReview({ review }: { review: MockReview }) {
  const sections = review.sections;
  if (sections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        This attempt has no question-by-question review.
      </p>
    );
  }
  return (
    <Tabs defaultValue={sections[0].skill} className="space-y-4 font-report" data-testid="ielts-answer-review">
      {sections.length > 1 && (
        <TabsList className="min-h-0 justify-start overflow-x-auto">
          {sections.map(section => (
            <TabsTrigger key={section.skill} value={section.skill}>
              {SKILL_LABEL[section.skill]}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
      {sections.map(section => (
        <TabsContent key={section.skill} value={section.skill} className="mt-0">
          {section.items && <ObjectiveReview section={section} />}
          {section.tasks && <WritingReview tasks={section.tasks} />}
          {section.turns && <SpeakingReview attemptId={review.attempt.id} section={section} />}
        </TabsContent>
      ))}
    </Tabs>
  );
}

type Filter = 'all' | 'wrong' | 'blank';

/** A Listening or Reading paper as cards, each opening into its details. The teacher's review uses it too. */
export function ObjectiveReview({ section }: { section: ReviewSection }) {
  const items = section.items ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<number | null>(null);
  const counts = useMemo(() => {
    const c = { correct: 0, partial: 0, wrong: 0, blank: 0 };
    items.forEach(item => c[itemStatus(item)]++);
    return c;
  }, [items]);
  const shown = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const status = itemStatus(item);
      if (filter === 'wrong') return status === 'wrong' || status === 'partial';
      if (filter === 'blank') return status === 'blank';
      return true;
    });
  const partName = section.skill === 'listening' ? 'Part' : 'Passage';
  const parts = [...new Set(shown.map(({ item }) => item.part))];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground">
          <strong className="text-lg">{section.correct ?? 0}</strong>
          <span className="text-muted-foreground"> / {section.total ?? items.length} marks</span>
          <span className="ml-3 text-xs text-muted-foreground">
            {counts.correct} correct · {counts.wrong + counts.partial} wrong · {counts.blank} not answered
          </span>
        </p>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs font-semibold" role="group" aria-label="Show">
          {(['all', 'wrong', 'blank'] as Filter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn('rounded-md px-2.5 py-1', filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
            >
              {f === 'all' ? 'All' : f === 'wrong' ? 'Wrong' : 'Not answered'}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing to show here.</p>}

      {parts.map(part => (
        <div key={part} className="space-y-2">
          {part > 0 && (
            <h4 className={PART_HEADING}>
              {partName} {part}
            </h4>
          )}
          <ul className="space-y-2">
            {shown
              .filter(({ item }) => item.part === part)
              .map(({ item, index }) => {
                const status = STATUS[itemStatus(item)];
                const Icon = status.icon;
                return (
                  <li
                    key={index}
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpen(index)}
                    onKeyDown={activate(() => setOpen(index))}
                    className={cn(CARD, 'flex items-center gap-3')}
                    data-testid="review-item"
                  >
                    <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-muted px-1.5 text-sm font-bold tabular-nums text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      {numbers(item)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="line-clamp-2 text-sm text-foreground">{blankless(item.question)}</p>
                      <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                        <span className="text-muted-foreground">
                          Your answer:{' '}
                          <strong className={cn(status.tone, 'font-semibold')}>{item.response || '—'}</strong>
                        </span>
                        {itemStatus(item) !== 'correct' && (
                          <span className="text-muted-foreground">
                            Answer: <strong className="font-semibold text-emerald-700 dark:text-emerald-400">{item.correct}</strong>
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={cn('hidden items-center gap-1 text-xs font-semibold sm:flex', status.tone)}>
                      <Icon className="h-4 w-4" /> {status.label}
                    </span>
                    <Icon className={cn('h-4 w-4 shrink-0 sm:hidden', status.tone)} aria-label={status.label} />
                    <Button size="sm" variant="outline" className={DETAILS} tabIndex={-1}>
                      View details
                    </Button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}

      <ItemDialog
        section={section}
        index={open}
        onIndex={setOpen}
        partName={partName}
      />
    </div>
  );
}

function ItemDialog({
  section,
  index,
  onIndex,
  partName,
}: {
  section: ReviewSection;
  index: number | null;
  onIndex: (index: number | null) => void;
  partName: string;
}) {
  const items = section.items ?? [];
  const item = index == null ? null : items[index];
  const [showScript, setShowScript] = useState(false);
  if (!item) return <Dialog open={false} onOpenChange={() => onIndex(null)} />;
  const status = itemStatus(item);
  const tone = STATUS[status];
  const Icon = tone.icon;
  const chosen = new Set(item.response.split(',').map(s => s.trim().split(' · ')[0]));
  const right = new Set(item.correct.split(',').map(s => s.trim().split(' · ')[0]));
  const script = section.skill === 'listening' ? section.scripts?.[item.part - 1] : undefined;

  return (
    <Dialog open onOpenChange={next => !next && onIndex(null)}>
      <DialogContent className="font-report sm:max-w-2xl" data-testid="review-item-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Question {numbers(item)}
            <span className={cn('flex items-center gap-1 text-sm font-semibold', tone.tone)}>
              <Icon className="h-4 w-4" /> {tone.label}
            </span>
          </DialogTitle>
          <DialogDescription>
            {SKILL_LABEL[section.skill]}
            {item.part > 0 ? ` · ${partName} ${item.part}` : ''} · {item.marks} of {item.outOf} mark{item.outOf === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{blankless(item.question)}</p>

          {item.options && item.options.length > 0 && (
            <ul className="space-y-1.5">
              {item.options.map(option => {
                const isRight = right.has(option.id) || right.has(option.text);
                const isChosen = chosen.has(option.id) || chosen.has(option.text);
                return (
                  <li
                    key={option.id}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                      isRight
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : isChosen
                          ? 'border-rose-500/50 bg-rose-500/10'
                          : 'border-border',
                    )}
                  >
                    <span className="font-mono font-bold">{option.id.length === 1 ? option.id : ''}</span>
                    <span className="flex-1">{option.text}</span>
                    {isChosen && <span className="text-xs font-semibold text-muted-foreground">Your choice</span>}
                    {isRight && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn('rounded-xl border p-3', status === 'correct' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5')}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your answer</p>
              <p className={cn('text-base font-semibold', status === 'blank' ? 'italic text-muted-foreground' : tone.tone)}>
                {item.response || 'Not answered'}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Correct answer</p>
              <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">{item.correct}</p>
            </div>
          </div>

          {item.explanation && (
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Why</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{item.explanation}</p>
            </div>
          )}

          {script && (
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="-ml-2 font-semibold" onClick={() => setShowScript(s => !s)}>
                {showScript ? 'Hide' : 'Show'} the Part {item.part} transcript
              </Button>
              {showScript && (
                <p className="max-h-64 overflow-y-auto whitespace-pre-line rounded-xl border border-border p-3 text-xs leading-relaxed text-muted-foreground">
                  {/* Each speaker's turn on its own line ("Receptionist: …", "Caller: …"). */}
                  {script.replace(/\s+(?=[A-Z][a-z]+(?: [A-Z][a-z]+)?:\s)/g, '\n')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" disabled={index === 0} onClick={() => onIndex(index! - 1)} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {index! + 1} of {items.length}
          </span>
          <Button variant="outline" size="sm" disabled={index === items.length - 1} onClick={() => onIndex(index! + 1)} className="gap-1">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WritingReview({ tasks }: { tasks: ReviewTask[] }) {
  const [open, setOpen] = useState<ReviewTask | null>(null);
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {tasks.map(task => {
          const band = task.evaluation?.estimatedScore ?? null;
          const fixes = task.evaluation?.sentenceFeedback?.length ?? 0;
          return (
            <li
              key={task.key}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(task)}
              onKeyDown={activate(() => setOpen(task))}
              className={cn(CARD, 'flex items-center gap-3')}
              data-testid="review-task"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <PenTool className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-bold text-foreground">{task.key === 'task1' ? 'Task 1' : 'Task 2'}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{task.prompt || task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.words} words{fixes > 0 ? ` · ${fixes} correction${fixes === 1 ? '' : 's'}` : ''}
                </p>
              </div>
              {band != null ? <BandPill band={band} /> : <span className="font-mono text-lg font-black text-muted-foreground">—</span>}
              <Button size="sm" variant="outline" className={DETAILS} tabIndex={-1}>
                View details
              </Button>
            </li>
          );
        })}
      </ul>

      <Dialog open={open != null} onOpenChange={next => !next && setOpen(null)}>
        {open && (
          <DialogContent className="font-report sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Writing {open.key === 'task1' ? 'Task 1' : 'Task 2'}</DialogTitle>
              <DialogDescription>{open.words} words</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">The question</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{open.prompt}</p>
                {open.imageUrl && <img src={open.imageUrl} alt="" className="max-h-72 rounded-lg border border-border bg-white" />}
              </div>
              {open.evaluation ? (
                <TestFeedback evaluation={open.evaluation} answer={open.answer} />
              ) : (
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your answer</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{open.answer || 'Nothing was written.'}</p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function SpeakingReview({ attemptId, section }: { attemptId: string; section: ReviewSection }) {
  const turns = section.turns ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(false);
  const parts = [...new Set(turns.map(t => t.part))];
  const fixes = section.evaluation?.sentenceFeedback ?? [];
  const rated = section.evaluation?.estimatedScore != null;
  const turn = open == null ? null : turns[open];

  return (
    <div className="space-y-3">
      {section.evaluation && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] px-4 py-3">
          <p className="text-sm text-foreground">
            <strong>Examiner feedback</strong>
            <span className="text-muted-foreground"> · each criterion, what went well and what to work on</span>
          </p>
          <Button size="sm" onClick={() => setFeedback(true)}>Open feedback</Button>
        </div>
      )}

      {parts.map(part => (
        <div key={part} className="space-y-2">
          <h4 className="flex items-center gap-2 px-1 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-foreground">
            <span className={cn('flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px]', (PART_TONE[part] ?? PART_TONE[1]).badge)}>{part}</span>
            {(SPEAKING_PART[part] ?? `Part ${part}`).replace(/^Part \d+ · /, '')}
          </h4>
          <ul className="space-y-2">
            {turns.map((t, index) =>
              t.part !== part ? null : (
                <li
                  key={t.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpen(index)}
                  onKeyDown={activate(() => setOpen(index))}
                  className={cn(CARD, 'px-5 py-4')}
                  data-testid="review-turn"
                >
                  <div className="flex items-center gap-4">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200', (PART_TONE[part] ?? PART_TONE[1]).chip)}>
                      <Mic className="h-5 w-5" />
                    </span>
                    <p className="min-w-0 flex-1 text-[15px] font-medium text-foreground transition-colors group-hover:text-primary">{t.question}</p>
                    {t.evaluation?.estimatedScore != null && <BandPill band={t.evaluation.estimatedScore} />}
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">{t.seconds}s</span>
                    <Button size="sm" variant="outline" className={DETAILS} tabIndex={-1}>
                      View details
                    </Button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}

      <Dialog open={turn != null} onOpenChange={next => !next && setOpen(null)}>
        {turn && (
          <DialogContent className="font-report sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>{SPEAKING_PART[turn.part] ?? `Part ${turn.part}`}</DialogTitle>
              <DialogDescription>You spoke for {turn.seconds} seconds</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Examiner</p>
                <p className="text-sm font-medium text-foreground">{turn.question}</p>
              </div>
              {/* The learner's own voice sits under the score, as on a practice result; on its own when unrated. */}
              {!turn.hasRecording ? (
                <p className="text-xs text-muted-foreground">No recording is kept for this answer (recordings are kept for 30 days).</p>
              ) : !turn.evaluation && <AnswerRecording src={recordingUrl(attemptId, turn.key)} />}
              {turn.evaluation ? (
                // The same card as a practice answer's result.
                <EvaluationCard
                  evaluation={turn.evaluation}
                  xpAwarded={0}
                  belowScore={turn.hasRecording ? <AnswerRecording src={recordingUrl(attemptId, turn.key)} /> : undefined}
                  notes={['This rates this answer alone, from its transcript. Pronunciation was not assessed.']}
                  answer={<MarkedAnswer text={turn.transcript} fixes={turn.evaluation.sentenceFeedback ?? []} />}
                  answerLegend={<MarkedAnswerLegend />}
                />
              ) : null}
              {turn.evaluation ? (
                <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5" data-dictionary>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">How to improve</h4>
                  {turn.evaluation.summary && <p className="text-sm leading-relaxed text-foreground">{turn.evaluation.summary}</p>}
                  <ul className="space-y-2">
                    {(turn.evaluation.criteria ?? []).filter(c => c.feedback).map(c => (
                      <li key={c.name} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="leading-relaxed text-muted-foreground">{c.feedback}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <>
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-primary">What you said</p>
                    {turn.transcript.trim() ? (
                      <MarkedAnswer text={turn.transcript} fixes={fixes} rated={rated} />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">No answer was heard.</p>
                    )}
                  </div>
                  <TurnFixes turn={turn} fixes={fixes} />
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" disabled={open === 0} onClick={() => setOpen(open! - 1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {open! + 1} of {turns.length}
              </span>
              <Button variant="outline" size="sm" disabled={open === turns.length - 1} onClick={() => setOpen(open! + 1)} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={feedback} onOpenChange={setFeedback}>
        {section.evaluation && (
          <DialogContent className="font-report sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Speaking feedback</DialogTitle>
              <DialogDescription>Rated across all three parts.</DialogDescription>
            </DialogHeader>
            <TestFeedback evaluation={section.evaluation} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** The corrections the rater made to sentences of this answer. */
function TurnFixes({ turn, fixes }: { turn: ReviewTurn; fixes: { original: string; correction: string; explanation?: string }[] }) {
  const mine = fixes.filter(f => f.original && turn.transcript.includes(f.original));
  if (mine.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mistakes in this answer</p>
      <ul className="space-y-2">
        {mine.map((fix, i) => (
          <li key={i} className="rounded-lg bg-muted/40 px-3 py-2 text-sm space-y-1">
            <p>
              <span className="text-rose-600 line-through decoration-rose-400 dark:text-rose-400">{fix.original}</span>
            </p>
            <p className="text-emerald-700 dark:text-emerald-400">{fix.correction}</p>
            {fix.explanation && <p className="text-xs text-muted-foreground">{fix.explanation}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}


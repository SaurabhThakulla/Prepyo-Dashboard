import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Lightbulb, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import OptionContent, { MarkedText } from '@/components/practice/OptionContent';
import QuestionDrawer from '@/components/practice/QuestionDrawer';
import QuestionHeader from '@/components/practice/QuestionHeader';
import PracticeActionBar from '@/components/practice/flow/PracticeActionBar';
import { ResultSummary, toneFor } from '@/components/practice/ResultParts';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { Question } from '@/lib/types';
import { CdsPaperType, cdsApi } from './cdsApi';
import { cdsKeys, cdsPaperName, cdsQuestion, cdsSubtask, cdsText, setLevel, setName, useCdsMocks, useCdsSets, useCdsExam } from './cdsShared';

interface Checked {
  isCorrect: boolean;
  correctOption: string;
  explanation: string;
}

/** Questions on one page: a set is answered and checked together, as the paper is worked in runs. */
export const SET_SIZE = 5;

// A question's level, coloured as the practice list colours it.
const LEVEL_TONE: Record<string, string> = {
  easy: 'border border-emerald-500/25 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  medium: 'border border-amber-500/25 bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  hard: 'border border-rose-500/25 bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
};

// The practice page's pill buttons, as on the other exams' practice.
const PILL = 'h-9 gap-1.5 rounded-full px-3 text-xs font-bold sm:px-4';

/**
 * CDS practice, one question type at a time (?type=) or a whole paper's types
 * (?paper=), five questions to a page, checked together. Questions come from
 * the CDS papers; a wrong answer goes to the Mistake Bank.
 */
export default function CdsTaskPractice() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const found = cdsSubtask(params.get('type'));
  const exam = useCdsExam();
  const paperType = (found?.paper ?? params.get('paper') ?? (exam === 'NCC' ? 'ncc_common' : 'english')) as CdsPaperType;
  // CDS mocks are listed by paper; NCC's two mocks share one list.
  const mocksHref = exam === 'NCC' ? '/mocks' : `/mocks?paper=${paperType}`;
  const title = found?.subtask.name ?? `${cdsPaperName(paperType)}: all question types`;

  const { papers, isPending: papersPending } = useCdsMocks(true);
  const ofPaper = papers.filter(p => p.paperType === paperType);
  const results = useQueries({
    queries: ofPaper.map(paper => ({
      queryKey: ['cds', 'paper', paper.id],
      queryFn: () => cdsApi.getPaper(paper.id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const loading = papersPending || results.some(r => r.isPending);

  const questions = useMemo(() => {
    const topics = found ? new Set(found.subtask.topics) : null;
    return results
      .flatMap(r => r.data?.questions ?? [])
      // A question belongs to a type by its name, or by an older topic name mapped to it.
      .filter(q => !found || !topics || topics.has(q.topic) || q.topic === found.subtask.name)
      .map(q => cdsQuestion(q, paperType));
  }, [results, found, paperType]);

  // No ?set= shows the list of sets, as the other exams' practice opens on its question list.
  const setParam = Number(params.get('set'));
  const page = setParam > 0 ? setParam - 1 : -1;
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, Checked>>({});
  const [checking, setChecking] = useState(false);
  // Help asked for, by question: the right option and why (practice only; mocks have no Help).
  const [help, setHelp] = useState<Record<string, { correctOption: string; explanation: string } | 'loading'>>({});
  const explain = async (questionId: string) => {
    if (help[questionId]) return;
    setHelp(prev => ({ ...prev, [questionId]: 'loading' }));
    try {
      const res = await api.get<{ correctOption: string; explanation: string }>(`/cds/questions/${questionId}/explain`);
      setHelp(prev => ({ ...prev, [questionId]: res }));
    } catch (err) {
      setHelp(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      toast.error('Could not load help', errorMessage(err));
    }
  };
  // Sets the learner has submitted, by index.
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  // What this practice is called when its sets are saved: a question type, or a whole paper.
  const practice = found ? found.subtask.key : `paper:${paperType}`;
  // Sets submitted before, so the list marks them done after a reload too.
  const savedSets = useCdsSets(true).data ?? [];

  // ?review=<set id> reopens a saved set (from the Mistake Bank) with its answers marked.
  const reviewId = params.get('review');
  const review = useQuery({ queryKey: ['cds', 'set', reviewId], queryFn: () => cdsApi.getSet(reviewId!), enabled: Boolean(reviewId) });
  useEffect(() => {
    if (!review.data) return;
    const { set, results } = review.data;
    setChosen(prev => ({ ...prev, ...set.answers }));
    setChecked(prev => ({ ...prev, ...results }));
    setSubmitted(prev => ({ ...prev, [set.setNumber - 1]: true }));
  }, [review.data]);

  const pages = Math.max(1, Math.ceil(questions.length / SET_SIZE));
  const set = page < 0 ? [] : questions.slice(page * SET_SIZE, page * SET_SIZE + SET_SIZE);
  const sets = Array.from({ length: Math.ceil(questions.length / SET_SIZE) }, (_, i) => {
    const items = questions.slice(i * SET_SIZE, i * SET_SIZE + SET_SIZE);
    return {
      id: String(i + 1),
      // Named for what it is about, not its number; the list numbers it already.
      title: setName(items[0]?.contextPassage || items[0]?.prompt || ''),
      prompt: `${items.length} questions`,
      difficulty: setLevel(items.map(q => q.difficulty)),
      typeNames: [...new Set(items.map(q => q.typeName))],
      done: Boolean(submitted[i]) || savedSets.some(s => s.practice === practice && s.setNumber === i + 1),
    };
  });
  const toCheck = set.filter(q => chosen[q.id] && !checked[q.id]);
  const setDone = set.length > 0 && (Boolean(submitted[page]) || set.every(q => checked[q.id]));

  const checkSet = async () => {
    if (toCheck.length === 0 || checking) return;
    setChecking(true);
    try {
      // The set is marked and saved whole, so the Mistake Bank can list it as one entry.
      const { results } = await cdsApi.submitSet({
        practice,
        setNumber: page + 1,
        answers: Object.fromEntries(toCheck.map(q => [q.id, chosen[q.id]])),
      });
      setChecked(prev => ({ ...prev, ...results }));
      setSubmitted(prev => ({ ...prev, [page]: true }));
      window.scrollTo({ top: 0 });
      void queryClient.invalidateQueries({ queryKey: cdsKeys.mistakes });
      void queryClient.invalidateQueries({ queryKey: cdsKeys.sets });
    } catch (err) {
      toast.error('Could not check your answers', errorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  const goTo = (next: number) => {
    const nextParams = new URLSearchParams(params);
    nextParams.delete('review');
    if (next < 0) nextParams.delete('set');
    else nextParams.set('set', String(next + 1));
    setParams(nextParams);
    window.scrollTo({ top: 0 });
  };

  if (page < 0) {
    return (
      <QuestionDrawer
        exam={exam}
        skill="reading"
        typeKey={found?.subtask.key ?? null}
        isMock={false}
        questions={sets}
        completedIds={sets.filter(s => s.done).map(s => s.id)}
        isLoading={loading}
        onSelectQuestion={item => goTo(Number(item.id) - 1)}
      />
    );
  }

  const done = Object.keys(checked).length;
  const right = Object.values(checked).filter(c => c.isCorrect).length;
  // The task badge, as the other exams' practice shows one: the type's initials.
  const code = found ? found.subtask.name.split(/[\s&/()-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'CDS';
  const answeredCount = set.filter(q => chosen[q.id]).length;
  const level = setLevel(set.map(q => q.difficulty));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      {loading ? (
        <Card className="mt-6 p-8 text-sm text-muted-foreground">Loading questions…</Card>
      ) : set.length === 0 ? (
        <Card className="mt-6 p-10 text-center space-y-3">
          <h2 className="font-display text-base font-bold text-foreground">No {title} questions yet</h2>
          <p className="text-xs text-muted-foreground">
            They are being added. Meanwhile, sit a full {exam === 'NCC' ? 'NCC mock test' : `${cdsPaperName(paperType)} paper`}.
          </p>
          <Button asChild size="sm" className="font-bold text-xs gap-1.5">
            <Link to={mocksHref}>
              <ClipboardCheck className="w-3.5 h-3.5" /> {exam === 'NCC' ? 'NCC mock tests' : `${cdsPaperName(paperType)} papers`}
            </Link>
          </Button>
        </Card>
      ) : (
        // The same screen as the other exams' practice: its header band, the question, the blue action bar.
        <div className="space-y-3.5">
          <QuestionHeader
            code={code}
            title={found?.subtask.name ?? `${cdsPaperName(paperType)} practice`}
            actions={
              <>
                {/* The set's level, in the header rather than on each question. */}
                {level && (
                  <span className={`${PILL} inline-flex items-center capitalize ${LEVEL_TONE[level]}`}>{level}</span>
                )}
                <span className={`${PILL} inline-flex items-center border border-border bg-card text-muted-foreground`}>
                  Set {page + 1} of {pages}
                </span>
                <Button variant="outline" onClick={() => goTo(-1)} className={`${PILL} gap-2`}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to sets</span>
                </Button>
              </>
            }
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              {exam === 'NCC' ? 'NCC' : 'UPSC CDS'} · {found?.subtask.group ?? cdsPaperName(paperType)}
              {found ? ` · ${found.subtask.weight} a paper · ${found.subtask.detail}` : ''}
            </p>
          </QuestionHeader>

          {setDone && <SetScoreCard set={set} checked={checked} maths={paperType === 'maths'} ncc={exam === 'NCC'} />}

          {/* All five on one page, each with its question beside its answers. */}
          {set.map((question, i) => (
            <QuestionView
              key={question.id}
              // Numbered within the set, 1 to 5.
              number={i + 1}
              question={question}
              answer={chosen[question.id]}
              // Marked once the set is submitted.
              result={setDone ? checked[question.id] : undefined}
              locked={setDone}
              help={help[question.id]}
              onHelp={() => void explain(question.id)}
              onChoose={option => setChosen(prev => ({ ...prev, [question.id]: option }))}
            />
          ))}

          {/* The shared bar, pinned edge to edge at the bottom of the screen (above the phone tab bar). */}
          <div className="sticky bottom-[var(--mobile-nav-h,0px)] z-20 -mx-4 sm:-mx-6 lg:-mx-8 [&>div]:rounded-none [&>div]:border-x-0 [&>div]:border-b-0 [&>div]:px-4 sm:[&>div]:px-6 lg:[&>div]:px-8">
          <PracticeActionBar
            middle={
              // The set's questions: answered ones filled; tap one to scroll to it.
              <div className="flex items-center gap-1.5">
                {set.map((q, i) => {
                  const mark = setDone ? checked[q.id] : undefined;
                  const fill = mark
                    ? mark.isCorrect ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-rose-400 bg-rose-500 text-white'
                    : chosen[q.id]
                      ? 'border-white bg-white text-[#13307f] dark:border-primary dark:bg-primary dark:text-primary-foreground'
                      : 'border-white/40 text-white dark:border-border dark:text-muted-foreground dark:hover:border-primary/60 dark:hover:text-foreground';
                  return (
                    <button
                      key={q.id}
                      type="button"
                      aria-label={`Go to question ${i + 1}`}
                      onClick={() => document.getElementById(`cds-q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${fill}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            }
            actions={
              <Button variant="ghost" disabled={page === 0} onClick={() => goTo(page - 1)} className={`${PILL} text-white hover:bg-white/15 hover:text-white dark:text-foreground dark:hover:bg-accent dark:hover:text-foreground disabled:opacity-40`}>
                <ArrowLeft className="h-3.5 w-3.5" /> Previous set
              </Button>
            }
            // Where Next sits on the other exams' bar: this set's one action.
            end={
              !setDone ? (
                <Button disabled={toCheck.length === 0 || checking} onClick={checkSet} className={`${PILL} bg-white text-[#13307f] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90`}>
                  {checking ? 'Checking…' : `Submit set (${answeredCount}/${set.length})`}
                </Button>
              ) : page < pages - 1 ? (
                <Button onClick={() => goTo(page + 1)} className={`${PILL} bg-white text-[#13307f] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90`}>
                  Next {SET_SIZE} questions <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button asChild className={`${PILL} bg-white text-[#13307f] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90`}>
                  <Link to={mocksHref}>Try a full paper</Link>
                </Button>
              )
            }
          />
          </div>
        </div>
      )}
    </div>
  );
}

/** Marks for one question: UPSC's 0.833 (a third off when wrong) in English and GK, 1 in Maths; NCC's 2, half a mark off. */
const MARKS = { english: [0.833, 0.277], maths: [1, 0.333], ncc: [2, 0.5] } as const;

/** The result of a submitted set, as the other exams' practice shows a result: the shared summary card. */
function SetScoreCard({ set, checked, maths, ncc }: { set: Question[]; checked: Record<string, Checked>; maths: boolean; ncc: boolean }) {
  const right = set.filter(q => checked[q.id]?.isCorrect).length;
  const wrong = set.filter(q => checked[q.id] && !checked[q.id].isCorrect).length;
  const skipped = set.length - right - wrong;
  const [mark, penalty] = ncc ? MARKS.ncc : maths ? MARKS.maths : MARKS.english;
  const net = right * mark - wrong * penalty;
  const fraction = set.length ? right / set.length : 0;
  return (
    <Card className="p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <ResultSummary
        label="Your score"
        score={right}
        outOf={set.length}
        fraction={fraction}
        tone={toneFor(fraction)}
        verdict={right === set.length ? 'All correct' : right > 0 ? 'Partly right' : 'Not quite'}
        meta={[`${wrong} wrong`, `${skipped} skipped`, `${ncc ? 'NCC' : 'UPSC'} marks ${net.toFixed(2)} of ${(set.length * mark).toFixed(2)}`]}
        summary={ncc
          ? 'Each answer is marked below. As in the NCC written paper, a right answer earns 2 marks, a wrong one loses half a mark and a skipped question costs nothing.'
          : 'Each answer is marked below. As in the UPSC paper, a wrong answer costs a third of a right one and a skipped question costs nothing.'}
        notes={wrong > 0 ? ['Wrong answers are saved to your Mistake Bank.'] : []}
      />
    </Card>
  );
}

/**
 * A passage with the blank this question asks about picked out, and the
 * learner's chosen word written into it (cloze): the sentence reads as answered.
 */
function PassageText({ text, blank, filled }: { text: string; blank?: string; filled?: string }) {
  // Spotting errors: "part (a) / part (b) / part (c) / No error (d)" as one row a part, its letter in a badge.
  const parts = text.split(' / ').map(part => part.trim());
  if (parts.length >= 3 && parts.every(part => /\([a-d]\)$/.test(part))) {
    return (
      <span className="block space-y-2 whitespace-normal">
        {parts.map(part => {
          const letter = part.slice(-2, -1);
          const none = /^no error/i.test(part);
          return (
            <span key={part} className={`flex items-start gap-3 rounded-lg px-2.5 py-2 ${none ? 'bg-slate-100 dark:bg-muted/70' : 'border border-transparent bg-white dark:border-border dark:bg-card'}`}>
              <span
                className={`flex h-7 min-w-[2.25rem] shrink-0 items-center justify-center rounded-md text-xs font-black ${
                  none ? 'bg-slate-300 text-slate-700 dark:bg-muted dark:text-muted-foreground' : 'bg-primary text-primary-foreground'
                }`}
              >
                ({letter})
              </span>
              <span className={`pt-0.5 ${none ? 'text-slate-600 dark:text-muted-foreground' : 'text-foreground'}`}>
                <MarkedText text={part.slice(0, -3).trim()} />
              </span>
            </span>
          );
        })}
      </span>
    );
  }
  // Sentence-ordering items (S1, P, Q, R, S, S6) as rows: a badge for each label, S1 and S6 marked as fixed.
  const lines = text.split('\n').filter(line => line.trim());
  const labelled = lines.length > 1 && lines.every(line => /^(S\d|[PQRS]):\s/.test(line));
  if (labelled) {
    return (
      <span className="block space-y-2 whitespace-normal">
        {lines.map(line => {
          const [label, ...words] = line.split(':');
          const fixed = /^S\d$/.test(label);
          return (
            <span
              key={line}
              className={`flex items-start gap-3 rounded-lg px-2.5 py-2 ${
                fixed ? 'bg-slate-100 dark:bg-muted/70' : 'border border-transparent bg-white dark:border-border dark:bg-card'
              }`}
            >
              <span
                className={`flex h-7 min-w-[2.25rem] shrink-0 items-center justify-center rounded-md text-xs font-black ${
                  fixed ? 'bg-slate-300 text-slate-700 dark:bg-muted dark:text-muted-foreground' : 'bg-primary text-primary-foreground'
                }`}
              >
                {label}
              </span>
              <span className={`pt-0.5 ${fixed ? 'text-slate-600 dark:text-muted-foreground' : 'text-foreground'}`}>
                <MarkedText text={words.join(':').trim()} />
              </span>
            </span>
          );
        })}
      </span>
    );
  }
  const token = blank ? `(${blank}) ＿＿＿＿` : '';
  if (!token || !text.includes(token)) return <MarkedText text={text} />;
  const [before, ...rest] = text.split(token);
  return (
    <>
      <MarkedText text={before} />
      <mark className="rounded-md bg-amber-200/80 px-1.5 py-0.5 font-semibold text-foreground dark:bg-amber-500/30">
        ({blank}) {filled ?? '＿＿＿＿'}
      </mark>
      <MarkedText text={rest.join(token)} />
    </>
  );
}

/** One question, laid out as the other exams' practice lays one out: #n and the question, its text, the option rows. */
function QuestionView({
  number, question, answer, result, onChoose, locked, help, onHelp,
}: {
  onHelp: () => void;
  number: number;
  locked: boolean;
  question: Question;
  answer?: string;
  result?: Checked;
  help?: { correctOption: string; explanation: string } | 'loading';
  onChoose: (option: string) => void;
}) {
  // Spotting-errors options carry their own letter, which the row already shows.
  const label = (text: string) => text.replace(/^\([a-d]\)\s*/, '');
  const chosenText = question.options?.find(o => o.id === answer)?.text;
  const blank = question.prompt.match(/blank \((\d+)\)/i)?.[1];
  return (
    // A solid card, so the page's dotted backdrop never shows through the text; Atkinson Hyperlegible is made for reading.
    <div
      id={`cds-q-${question.id}`}
      className="scroll-mt-24 space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm font-['Atkinson_Hyperlegible',Inter,sans-serif] sm:p-5"
    >
      {/* The question across the top on a soft band, with its Help. */}
      <div className="-mx-4 -mt-4 flex items-start gap-3 rounded-t-2xl border-b border-blue-100 bg-blue-50 px-4 py-3.5 sm:-mx-5 sm:-mt-5 sm:px-5 dark:border-border dark:bg-white/[0.035]">
        <span className="shrink-0 whitespace-nowrap rounded-md bg-primary px-2.5 py-1 text-sm font-bold tabular-nums text-primary-foreground">#{number}</span>
        <h3 className="min-w-0 flex-1 pt-0.5 text-[17px] font-bold leading-snug text-foreground whitespace-pre-line font-['Atkinson_Hyperlegible',Inter,sans-serif]">
          <MarkedText text={question.prompt} />
        </h3>
        {!result && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onHelp}
            disabled={help !== undefined}
            className="h-8 shrink-0 gap-1 rounded-full border border-amber-200/80 bg-white px-3 text-xs font-bold text-amber-700 shadow-sm hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 dark:hover:text-amber-200"
          >
            {help === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
            Help
          </Button>
        )}
      </div>

      {/* Below it, two matching soft panels side by side on a wide screen: the text, and the answers. */}
      <div className={question.contextPassage || question.imageUrl ? 'grid gap-4 lg:grid-cols-2 lg:items-stretch' : ''}>
      {(question.contextPassage || question.imageUrl) && (
        <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50 p-4 dark:border-border/80 dark:bg-background/60">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Read</p>
          {question.contextPassage && (
            <div className="text-[16px] sm:text-[17px] font-medium leading-8 text-foreground whitespace-pre-line">
              <PassageText text={question.contextPassage} blank={blank} filled={chosenText ? label(chosenText) : undefined} />
            </div>
          )}
          {question.imageUrl && <img src={question.imageUrl} alt="" className="max-h-72 rounded-xl border border-border bg-white p-1" />}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50 p-4 dark:border-border/80 dark:bg-background/60">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Choose your answer</p>
        <div className={question.contextPassage || question.imageUrl ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
          {question.options?.map((option, optionIndex) => {
            const picked = answer === option.id;
            const right = result && option.id === result.correctOption;
            const wrong = result && picked && !right;
            // Solid fills and a border on every row: nothing behind shows through.
            const tone = right
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15'
              : wrong
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15'
                : picked
                  ? 'border-primary bg-blue-50 dark:bg-primary/15 dark:shadow-sm'
                  : 'border-slate-200/70 bg-white shadow-sm hover:border-primary/40 dark:border-border dark:bg-card dark:hover:border-primary/60 dark:hover:bg-accent/50';
            const dotTone = right
              ? 'border-emerald-500 bg-emerald-500'
              : wrong
                ? 'border-rose-500 bg-rose-500'
                : picked
                  ? 'border-primary bg-primary'
                  : 'border-slate-300 bg-white dark:border-muted-foreground/50 dark:bg-transparent';
            const letterTone = right
              ? 'text-emerald-700 dark:text-emerald-400'
              : wrong
                ? 'text-rose-700 dark:text-rose-400'
                : picked
                  ? 'text-primary'
                  : 'text-muted-foreground';
            return (
              <label
                key={option.id}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-[16px] font-semibold leading-snug text-foreground transition-colors ${locked ? '' : 'cursor-pointer'} ${tone}`}
              >
                <input
                  type="radio"
                  name={`cds-${question.id}`}
                  value={option.id}
                  checked={picked}
                  disabled={locked}
                  onChange={() => onChoose(option.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${dotTone}`}
                >
                  {(picked || right || wrong) && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <span className={`w-4 shrink-0 font-bold ${letterTone}`}>{option.id}</span>
                <OptionContent option={{ ...option, text: label(option.text) }} index={optionIndex} />
                {right && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct answer" />}
                {wrong && <XCircle className="ml-auto h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-label="Your answer, wrong" />}
              </label>
            );
          })}
        </div>
      </div>
      </div>

      {help && help !== 'loading' && !result && (
        <div className="flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">The answer is {help.correctOption}</p>
            {help.explanation && <p className="text-sm text-foreground/85">{cdsText(help.explanation)}</p>}
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-xl border p-4 space-y-1.5 ${result.isCorrect ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            {result.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            {result.isCorrect ? 'Correct' : `Not quite: the answer is ${result.correctOption}`}
          </p>
          {result.explanation && <p className="text-sm text-foreground/85">{cdsText(result.explanation)}</p>}
          {!result.isCorrect && <p className="text-[11px] text-muted-foreground">Saved to your Mistake Bank.</p>}
        </div>
      )}
    </div>
  );
}

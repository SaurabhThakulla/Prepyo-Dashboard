import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  ArrowUpDown,
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Filter,
  Play,
  RefreshCw,
  WifiOff,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EXAM_LABELS, EXAM_MAX_SCORE, ExamType, SkillType } from '@/lib/types';
import { SYLLABUS, taskInstruction } from '@/lib/syllabus';
import { getTaskMetadata } from '@/lib/taskMetadata';
import {
  formatQuestionDisplayNumber,
  getExamQuestionRecords,
  resetTaskPracticeRecords,
  QuestionRecord,
} from '@/lib/questionStorage';
import { Skeleton } from '@/components/ui/skeleton';

/** What a row needs: a question, or a reading passage (reading is practised by passage). */
export interface DrawerItem {
  id: string;
  title: string;
  prompt?: string;
  difficulty?: string;
  imageKind?: string;
  typeName?: string;
  /** Several task types (a reading passage); the type filter matches any of them. */
  typeNames?: string[];
}

const typesOf = (item: DrawerItem) => item.typeNames ?? (item.typeName ? [item.typeName] : []);

const LEVELS = ['easy', 'medium', 'hard'];
const IMAGE_KINDS: Record<string, string> = {
  bar: 'Bar chart',
  line: 'Line graph',
  pie: 'Pie chart',
  table: 'Table',
  process: 'Process',
  map: 'Map',
  mixed: 'Mixed',
  diagram: 'Diagram',
};

/** The values of a field present in the list, in the given order, with how many have each. */
function present(items: DrawerItem[], field: 'difficulty' | 'imageKind' | 'typeName', order: string[]) {
  const has = (item: DrawerItem, value: string) => (field === 'typeName' ? typesOf(item).includes(value) : item[field] === value);
  return order
    .map(value => [value, items.filter(item => has(item, value)).length] as const)
    .filter(([, count]) => count > 0);
}

/** One filter as a dropdown in the header; hidden when there is nothing to choose between. */
function FilterSelect({ label, allLabel, options, value, onChange, total: allCount }: {
  label: string;
  allLabel: string;
  options: (readonly [string, number])[];
  value: string;
  onChange: (value: string) => void;
  /** The count beside "All": the list's length where one item can hold several values (a recording's task types). */
  total?: number;
}) {
  if (options.length < 2) return null;
  const nameOf = (id: string) => IMAGE_KINDS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
  const total = allCount ?? options.reduce((sum, [, count]) => sum + count, 0);
  const item = (id: string, text: string, count: number) => (
    <DropdownMenuRadioItem
      key={id}
      value={id}
      className="gap-3 py-2.5 pl-3 pr-3 text-sm data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary [&>span:first-child]:hidden"
    >
      <span className="min-w-0 flex-1 leading-snug">{text}</span>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{count}</span>
      <Check className={`h-4 w-4 shrink-0 ${value === id ? 'text-primary' : 'invisible'}`} aria-hidden />
    </DropdownMenuRadioItem>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-left text-sm shadow-lg shadow-black/10 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-white/30 sm:w-52 sm:flex-none dark:bg-white/10 dark:hover:bg-white/15"
      >
        <span className="shrink-0 text-xs font-medium text-slate-400 dark:text-slate-300">{label}</span>
        <span className="min-w-0 flex-1 truncate font-semibold text-slate-800 dark:text-white">
          {value === 'all' ? 'All' : nameOf(value)}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {item('all', allLabel, total)}
          {options.map(([id, count]) => item(id, nameOf(id), count))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface QuestionDrawerProps<T extends DrawerItem> {
  /** Shown as "Back to question" when a question is already open behind the list. */
  onClose?: () => void;
  exam: ExamType;
  skill: SkillType;
  typeKey?: string | null;
  isMock?: boolean;
  questions: T[];
  currentQuestionId?: string | null;
  completedIds: string[];
  isLoading?: boolean;
  /** Set when the list could not be fetched: shows a retry instead of "No questions found". */
  onRetry?: () => void;
  onSelectQuestion: (question: T) => void;
  onResetCompleted?: () => void;
}

type FilterTab = 'all' | 'done' | 'remaining';

const PAGE_SIZE = 20;

/** The task's question list, shown as a page of its own. Picking a question opens it. */
export default function QuestionDrawer<T extends DrawerItem>({
  onClose,
  exam,
  skill,
  typeKey,
  isMock,
  questions,
  currentQuestionId,
  completedIds,
  isLoading = false,
  onRetry,
  onSelectQuestion,
  onResetCompleted,
}: QuestionDrawerProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [level, setLevel] = useState('all');
  const [imageKind, setImageKind] = useState('all');
  const [taskType, setTaskType] = useState('all');
  const [scoresMap, setScoresMap] = useState<Record<string, QuestionRecord>>(() => getExamQuestionRecords(exam));

  // Infinite scroll windowing
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerSentinelRef = useRef<HTMLDivElement | null>(null);

  // Re-read local storage records when the list shows or questions change
  useEffect(() => {
    setScoresMap(getExamQuestionRecords(exam));
  }, [exam, completedIds]);

  // Another task's list starts unfiltered.
  useEffect(() => {
    setLevel('all');
    setImageKind('all');
    setTaskType('all');
  }, [exam, skill, typeKey]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, activeFilter, level, imageKind, taskType, questions]);

  // PTE always offers the level filter, even while a task's bank sits at one level.
  const levels = useMemo(
    () => exam === 'PTE'
      ? LEVELS.map(value => [value, questions.filter(q => q.difficulty === value).length] as const)
      : present(questions, 'difficulty', LEVELS),
    [questions, exam],
  );
  const imageKinds = useMemo(() => present(questions, 'imageKind', Object.keys(IMAGE_KINDS)), [questions]);
  // Shown when one link holds several task types, as IELTS Writing Task 2 holds the essay types.
  // Names outside the syllabus (IELTS Listening's whole-part recordings) come first.
  const taskTypes = useMemo(() => {
    const syllabus = SYLLABUS[exam]?.[skill] ?? [];
    const extra = questions.flatMap(typesOf).filter(name => !syllabus.includes(name));
    return present(questions, 'typeName', [...new Set(extra), ...syllabus]);
  }, [questions, exam, skill]);

  const taskMeta = useMemo(() => getTaskMetadata(exam, skill, typeKey, isMock), [exam, skill, typeKey, isMock]);
  // The exam's own instruction line, where it prints one (EPS-TOPIK's Korean 지시문).
  const instruction = !isMock && typeKey ? taskInstruction(exam, skill, typeKey) : undefined;

  // Filter & sort questions
  const filteredQuestions = useMemo(() => {
    let result = [...questions];

    // Search query filter (matches title, prompt, or #number)
    const qLower = searchQuery.trim().toLowerCase();
    if (qLower) {
      const qNum = qLower.replace('#', '');
      result = result.filter(q => {
        const origIdx = questions.indexOf(q);
        const dispNum = String(formatQuestionDisplayNumber(q.id, q.title, origIdx >= 0 ? origIdx : 0));
        return (
          dispNum === qNum ||
          dispNum.includes(qNum) ||
          q.title?.toLowerCase().includes(qLower) ||
          q.prompt?.toLowerCase().includes(qLower) ||
          q.id.toLowerCase().includes(qLower)
        );
      });
    }

    // Tab filter: All Questions, Done, Remaining
    if (activeFilter === 'done') {
      result = result.filter(q => completedIds.includes(q.id) || (scoresMap[q.id]?.attemptsCount ?? 0) > 0);
    } else if (activeFilter === 'remaining') {
      result = result.filter(q => !completedIds.includes(q.id) && (scoresMap[q.id]?.attemptsCount ?? 0) === 0);
    }
    if (level !== 'all') result = result.filter(q => q.difficulty === level);
    if (imageKind !== 'all') result = result.filter(q => q.imageKind === imageKind);
    if (taskType !== 'all') result = result.filter(q => typesOf(q).includes(taskType));

    // Sorting by question order ascending (1, 2, 3...)
    result.sort((a, b) => {
      const idxA = questions.indexOf(a);
      const idxB = questions.indexOf(b);
      const numA = formatQuestionDisplayNumber(a.id, a.title, idxA >= 0 ? idxA : 0);
      const numB = formatQuestionDisplayNumber(b.id, b.title, idxB >= 0 ? idxB : 0);
      return numA - numB;
    });

    return result;
  }, [questions, searchQuery, activeFilter, level, imageKind, taskType, completedIds, scoresMap]);

  // Slice questions for infinite scroll optimization
  const displayedQuestions = useMemo(() => {
    return filteredQuestions.slice(0, visibleCount);
  }, [filteredQuestions, visibleCount]);

  const hasMore = visibleCount < filteredQuestions.length;

  // Infinite scroll intersection observer
  useEffect(() => {
    const sentinel = observerSentinelRef.current;
    if (typeof IntersectionObserver === 'undefined' || !sentinel || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          // Micro-delay for smooth rendering transition
          setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredQuestions.length));
            setLoadingMore(false);
          }, 150);
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, filteredQuestions.length]);

  const doneCount = useMemo(() => {
    return questions.filter(q => completedIds.includes(q.id) || (scoresMap[q.id]?.attemptsCount ?? 0) > 0).length;
  }, [questions, completedIds, scoresMap]);


  return (
    <section
      id="question-list-page"
      aria-label="Practice questions"
      className="w-full flex-1 flex flex-col sm:px-6 lg:px-8 sm:py-5"
    >
      <div className="flex flex-col bg-slate-50 dark:bg-[#0c111b] sm:border border-slate-200 dark:border-white/10 sm:rounded-2xl overflow-hidden shadow-sm">
        {/* 1. Header: the sidebar's blue, with the search box on it */}
        <div className="relative overflow-hidden p-4 sm:p-5 space-y-4 bg-gradient-to-br from-[#2a56cf] via-primary to-[#132e7d] dark:from-blue-900 dark:via-blue-950 dark:to-slate-950 text-white shrink-0">
          <span aria-hidden className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full border-[24px] border-white/10" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-display font-black text-base bg-white text-primary dark:text-blue-950 shrink-0 shadow-lg shadow-black/15">
                {(taskMeta.code || taskMeta.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base sm:text-lg font-bold truncate">{taskMeta.name}</h2>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 border border-white/20 shrink-0">
                    {EXAM_LABELS[exam]}
                  </span>
                </div>
                <p className="text-xs text-white/70 truncate mt-0.5">{taskMeta.scoreWeight}</p>
                {instruction && (
                  <p lang="ko" className="text-xs text-white/85 font-medium truncate mt-0.5">
                    {instruction}
                  </p>
                )}
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to question"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 transition-colors shrink-0 cursor-pointer"
              >
                <span className="sm:hidden">Back</span>
                <span className="hidden sm:inline">Back to question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search, with All/Done/Remaining and the filters on its right (under it on a smaller screen). */}
          <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Question Content / Title / #ID"
              className="w-full bg-white dark:bg-white/10 border border-transparent rounded-xl pl-10 pr-9 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 shadow-lg shadow-black/10 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {!isLoading && (
            <div className="flex flex-wrap gap-2">
              <FilterSelect label="Level" allLabel="All levels" options={levels} value={level} onChange={setLevel} />
              <FilterSelect label="Type" allLabel="All types" options={taskTypes} value={taskType} onChange={setTaskType} total={questions.length} />
              <FilterSelect label="Picture" allLabel="All pictures" options={imageKinds} value={imageKind} onChange={setImageKind} />
              {/* Done or not, last: in the row's corner. */}
              <FilterSelect
                label="Show"
                allLabel="All questions"
                options={[['done', doneCount], ['remaining', questions.length - doneCount]]}
                value={activeFilter}
                onChange={value => setActiveFilter(value as FilterTab)}
              />
            </div>
          )}
          </div>
        </div>

        {/* 2. Progress */}
        <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3 bg-white dark:bg-[#111622] border-b border-slate-100 dark:border-white/5 shrink-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Loading {taskMeta.name} questions…</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>
                  <span className="font-bold text-slate-900 dark:text-white">{doneCount}</span> of {questions.length} done
                </span>
                <span>
                  Showing <span className="font-bold text-slate-900 dark:text-white">{filteredQuestions.length}</span>
                </span>
              </div>
              <div className="h-2 rounded-none bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-none bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                  style={{ width: `${questions.length ? Math.round((doneCount / questions.length) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* 3. Infinite Scroll Questions List, one card per question */}
        <div data-question-list className="p-3 sm:p-4 space-y-2 bg-slate-50 dark:bg-[#0c111b]">
          {isLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading questions">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`drawer-skeleton-${i}`}
                  className="p-3 sm:p-3.5 rounded-none border border-slate-200/70 dark:border-white/5 bg-white dark:bg-white/[0.03] flex items-center gap-3 animate-pulse"
                >
                  <Skeleton className="h-10 w-10 rounded-full bg-slate-200/80 dark:bg-slate-800 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton
                      className="h-4 bg-slate-200/80 dark:bg-slate-800 rounded-none"
                      style={{ width: `${Math.max(40, 75 - ((i * 11) % 35))}%` }}
                    />
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-3.5 w-12 rounded-none bg-slate-100 dark:bg-slate-800/60" />
                      {skill === 'speaking' && (
                        <Skeleton className="h-3.5 w-12 rounded-none bg-slate-100 dark:bg-slate-800/60" />
                      )}
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-none bg-slate-200/70 dark:bg-slate-800/70 shrink-0" />
                </div>
              ))}
            </div>
          ) : onRetry ? (
            <div className="p-10 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <WifiOff className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Couldn't load the questions</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Check your internet connection and try again.</p>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          ) : displayedQuestions.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No questions found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No questions match your current search or filter criteria.
              </p>
              {(searchQuery || activeFilter !== 'all' || level !== 'all' || imageKind !== 'all' || taskType !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    setLevel('all');
                    setImageKind('all');
                    setTaskType('all');
                  }}
                  className="text-xs font-bold text-primary hover:underline pt-1"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            displayedQuestions.map((question, idx) => {
              const origIdx = questions.indexOf(question);
              const displayNumber = formatQuestionDisplayNumber(question.id, question.title, origIdx >= 0 ? origIdx : idx);
              const isSelected = currentQuestionId === question.id;
              const isDone = completedIds.includes(question.id) || (scoresMap[question.id]?.attemptsCount ?? 0) > 0;
              const record = scoresMap[question.id];

              // Clean title (remove redundant "#1234" prefix if present)
              const displayTitle = question.title
                ? question.title.replace(/^#\d+[:\s-]*/i, '').replace(/^question\s*\d+[:\s-]*/i, '')
                : `Question ${displayNumber}`;

              return (
                <div
                  key={question.id}
                  onClick={() => onSelectQuestion(question)}
                  className={`group p-3 sm:p-3.5 rounded-none border flex items-center gap-3 transition-all cursor-pointer ${isSelected
                    ? 'bg-white dark:bg-primary/10 border-primary ring-2 ring-primary/20 shadow-md'
                    : 'bg-white dark:bg-white/[0.03] border-slate-200/70 dark:border-white/5 hover:border-primary/40 hover:shadow-md hover:-translate-y-px'
                    }`}
                >
                  {/* Status badge: play, or a green tick once done */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isDone
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-primary/10 text-primary dark:text-blue-300 group-hover:bg-primary group-hover:text-white'
                      }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </div>

                  {/* Title and badges */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-white transition-colors truncate">
                      #{displayNumber} {displayTitle}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {question.difficulty && (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-none capitalize ${question.difficulty === 'hard'
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                            : question.difficulty === 'medium'
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                            }`}
                        >
                          {question.difficulty}
                        </span>
                      )}
                      {/* Shadow tag for speaking tasks */}
                      {skill === 'speaking' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-none bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                          Shadow
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-none bg-primary text-white">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score and Practice button */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {record?.score !== undefined ? (
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                          {record.score}
                          <span className="text-xs font-normal text-slate-400">/{record.maxScore ?? EXAM_MAX_SCORE[exam]}</span>
                        </span>
                      </div>
                    ) : isDone ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Done</span>
                    ) : null}

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectQuestion(question);
                      }}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-none transition-all cursor-pointer ${isSelected
                        ? 'bg-primary text-white shadow-md shadow-primary/30'
                        : 'bg-primary/10 text-primary dark:text-blue-300 hover:bg-primary hover:text-white'
                        }`}
                    >
                      {record?.attemptsCount ? `Practice * ${record.attemptsCount}` : 'Practice'}
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Infinite Scroll Observer Sentinel */}
          {hasMore && (
            <div ref={observerSentinelRef} className="py-4 text-center">
              {loadingMore ? (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading more questions…</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">Scroll for more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Takes the learner from an open question back to the task's question list. */
export function BackToQuestions({ onClick, label = 'All questions' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 self-start rounded-full bg-muted/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  X,
  ChevronRight,
  ChevronLeft,
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
} from 'lucide-react';
import { EXAM_LABELS, EXAM_MAX_SCORE, ExamType, SkillType } from '@/lib/types';
import { taskInstruction } from '@/lib/syllabus';
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
}

interface QuestionDrawerProps<T extends DrawerItem> {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
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

export default function QuestionDrawer<T extends DrawerItem>({
  isOpen,
  onToggle,
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
  const [scoresMap, setScoresMap] = useState<Record<string, QuestionRecord>>(() => getExamQuestionRecords(exam));

  // Infinite scroll windowing
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerSentinelRef = useRef<HTMLDivElement | null>(null);

  // Re-read local storage records when drawer opens or questions change
  useEffect(() => {
    if (isOpen) {
      setScoresMap(getExamQuestionRecords(exam));
    }
  }, [isOpen, exam, completedIds]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, activeFilter, questions]);

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

    // Sorting by question order ascending (1, 2, 3...)
    result.sort((a, b) => {
      const idxA = questions.indexOf(a);
      const idxB = questions.indexOf(b);
      const numA = formatQuestionDisplayNumber(a.id, a.title, idxA >= 0 ? idxA : 0);
      const numB = formatQuestionDisplayNumber(b.id, b.title, idxB >= 0 ? idxB : 0);
      return numA - numB;
    });

    return result;
  }, [questions, searchQuery, activeFilter, completedIds, scoresMap]);

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
    <>
      {/* Floating Sideway Toggle Button (visible always, matches coral pill in APEUni screenshot) */}
      {/* Floating Sideway Toggle Button (uses brand color, hidden when drawer is open) */}
      <button
        type="button"
        id="question-drawer-toggle"
        data-stay
        onClick={onToggle}
        title={isOpen ? 'Collapse Questions List' : 'Browse Questions List'}
        aria-label={isOpen ? 'Collapse Questions List' : 'Browse Questions List'}
        className={`fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300 flex items-center justify-center shadow-xl active:scale-95 group ${
          isOpen
            ? 'hidden'
            : 'right-0 sm:right-3 bg-primary hover:bg-primary/90 text-white w-7 h-12 sm:w-11 sm:h-11 rounded-l-2xl sm:rounded-full hover:scale-105 shadow-primary/30'
        }`}
      >
        <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
        {questions.length > 0 && (
          <span className="absolute -top-3 right-1 sm:-top-1.5 sm:right-auto sm:-left-1.5 whitespace-nowrap leading-4 bg-blue-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-white dark:border-slate-900 shadow-xs">
            {questions.length}
          </span>
        )}
      </button>

      {/* Clicking anywhere outside the drawer closes it. Dimmed on small
          screens; invisible on large ones, where the page stays in view. */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 lg:bg-transparent lg:backdrop-blur-none transition-opacity duration-300"
        />
      )}

      {/* Sliding Sideways Drawer Panel (inset-y-0 full height, no top gap) */}
      <aside
        id="question-drawer-panel"
        data-stay
        aria-label="Practice Questions Drawer"
        className={`fixed inset-y-0 right-0 w-full sm:w-[560px] md:w-[620px] lg:w-[680px] xl:w-[720px] max-w-full bg-slate-50 dark:bg-[#0c111b] border-l border-slate-200 dark:border-white/10 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
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
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 border border-white/20 shrink-0">
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

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0 cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
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
        </div>

        {/* 2. Progress and filter tabs */}
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
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                  style={{ width: `${questions.length ? Math.round((doneCount / questions.length) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
            {[
              { id: 'all' as const, label: 'All', fullLabel: 'All Questions' },
              { id: 'done' as const, label: 'Done', fullLabel: 'Done' },
              { id: 'remaining' as const, label: 'Remaining', fullLabel: 'Remaining' },
            ].map(tab => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline truncate">{tab.fullLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Infinite Scroll Questions List, one card per question */}
        <div data-question-list className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-slate-50 dark:bg-[#0c111b]">
          {isLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading questions">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`drawer-skeleton-${i}`}
                  className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-white/[0.03] flex items-center gap-3 animate-pulse"
                >
                  <Skeleton className="h-10 w-10 rounded-xl bg-slate-200/80 dark:bg-slate-800 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton
                      className="h-4 bg-slate-200/80 dark:bg-slate-800 rounded"
                      style={{ width: `${Math.max(40, 75 - ((i * 11) % 35))}%` }}
                    />
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-3.5 w-12 rounded bg-slate-100 dark:bg-slate-800/60" />
                      {skill === 'speaking' && (
                        <Skeleton className="h-3.5 w-12 rounded bg-slate-100 dark:bg-slate-800/60" />
                      )}
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800/70 shrink-0" />
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
              {(searchQuery || activeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
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
                  className={`group p-3 sm:p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-primary/10 border-primary ring-4 ring-primary/10 shadow-md'
                      : 'bg-white dark:bg-white/[0.03] border-slate-200/70 dark:border-white/5 hover:border-primary/40 hover:shadow-md hover:-translate-y-px'
                  }`}
                >
                  {/* Status badge: play, or a green tick once done */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isDone
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : isSelected
                          ? 'bg-primary text-white'
                          : 'bg-primary/10 text-primary dark:text-blue-300 group-hover:bg-primary group-hover:text-white'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Play className="w-4 h-4 fill-current" />}
                  </div>

                  {/* Title and badges */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-white transition-colors truncate">
                      #{displayNumber} {displayTitle}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {question.difficulty && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            question.difficulty === 'hard'
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
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                          Shadow
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-white">
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
                          <span className="text-[10px] font-normal text-slate-400">/{record.maxScore ?? EXAM_MAX_SCORE[exam]}</span>
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
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                        isSelected
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
      </aside>
    </>
  );
}

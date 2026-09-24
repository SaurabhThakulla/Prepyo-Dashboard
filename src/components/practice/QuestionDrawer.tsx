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
} from 'lucide-react';
import { Question, ExamType, SkillType } from '@/lib/types';
import { getTaskMetadata } from '@/lib/taskMetadata';
import {
  formatQuestionDisplayNumber,
  getExamQuestionRecords,
  resetTaskPracticeRecords,
  QuestionRecord,
} from '@/lib/questionStorage';

interface QuestionDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  exam: ExamType;
  skill: SkillType;
  typeKey?: string | null;
  isMock?: boolean;
  questions: Question[];
  currentQuestionId?: string | null;
  completedIds: string[];
  isLoading?: boolean;
  onSelectQuestion: (question: Question) => void;
  onResetCompleted?: () => void;
}

type FilterTab = 'all' | 'done' | 'remaining';

const PAGE_SIZE = 20;

export default function QuestionDrawer({
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
  onSelectQuestion,
  onResetCompleted,
}: QuestionDrawerProps) {
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
      {/* Floating Sideway Toggle Button (uses brand color) */}
      <button
        type="button"
        id="question-drawer-toggle"
        onClick={onToggle}
        title={isOpen ? 'Collapse Questions List' : 'Browse Questions List'}
        aria-label={isOpen ? 'Collapse Questions List' : 'Browse Questions List'}
        className={`fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300 flex items-center justify-center shadow-xl active:scale-95 group ${
          isOpen
            ? 'hidden sm:flex sm:right-[544px] md:right-[604px] lg:right-[664px] xl:right-[704px] bg-primary hover:bg-primary/90 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-primary/30'
            : 'right-2 sm:right-3 bg-primary hover:bg-primary/90 text-white w-10 h-10 sm:w-11 sm:h-11 rounded-full hover:scale-105 shadow-primary/30'
        }`}
      >
        {isOpen ? (
          <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
        ) : (
          <>
            <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
            {questions.length > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-blue-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-white dark:border-slate-900 shadow-xs">
                {questions.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sliding Sideways Drawer Panel (inset-y-0 full height, no top gap) */}
      <aside
        id="question-drawer-panel"
        aria-label="Practice Questions Drawer"
        className={`fixed inset-y-0 right-0 w-full sm:w-[560px] md:w-[620px] lg:w-[680px] xl:w-[720px] max-w-full bg-white dark:bg-[#0f141f] border-l border-slate-200 dark:border-white/10 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* 1. Header Section */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-white/5 space-y-3 bg-white dark:bg-[#111622] shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            {/* Task Info Pill */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm tracking-tight shrink-0 shadow-xs ${taskMeta.color}`}
              >
                {taskMeta.code}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
                    {taskMeta.name}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0">
                    {exam}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {taskMeta.scoreWeight}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
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
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

        {/* 2. Filter Tabs: All, Done, Remaining (mobile responsive) */}
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-[#131926] shrink-0">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              { id: 'all' as const, label: 'All', fullLabel: 'All Questions', count: questions.length },
              { id: 'done' as const, label: 'Done', fullLabel: 'Done', count: doneCount },
              { id: 'remaining' as const, label: 'Remaining', fullLabel: 'Remaining', count: Math.max(0, questions.length - doneCount) },
            ].map(tab => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5'
                  }`}
                >
                  <span className="sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline truncate">{tab.fullLabel}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                      active
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Stats Summary Strip */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-[#131926] border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
          <div>
            Done <span className="font-bold text-teal-600 dark:text-teal-400">{doneCount}</span>, Found{' '}
            <span className="font-bold text-slate-800 dark:text-white">{filteredQuestions.length}</span> Questions
          </div>
        </div>

        {/* 5. Infinite Scroll Questions List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          {isLoading ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading {taskMeta.name} questions…</p>
            </div>
          ) : displayedQuestions.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
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
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-1"
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
                  className={`group px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/80 dark:bg-teal-950/20 border-l-4 border-l-teal-500'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Left Column: Number, Title, Badges */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                        #{displayNumber} {displayTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                        #{displayNumber}
                      </span>
                      {question.difficulty && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            question.difficulty === 'hard'
                              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                              : question.difficulty === 'medium'
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {question.difficulty}
                        </span>
                      )}
                      {/* Shadow tag for speaking tasks matching screenshot */}
                      {skill === 'speaking' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500 text-white">
                          Shadow
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500 text-white">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Score, Practice Button (no bookmark, no dash) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Score display (only shown if question has a score or is marked done) */}
                    {record?.score !== undefined ? (
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                          {record.score}
                          <span className="text-[10px] font-normal text-slate-400">/{record.maxScore ?? (exam === 'PTE' ? 90 : 9)}</span>
                        </span>
                      </div>
                    ) : isDone ? (
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      </div>
                    ) : null}

                    {/* Practice * N Pill Button */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectQuestion(question);
                      }}
                      className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        isDone
                          ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white'
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
                  <div className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
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

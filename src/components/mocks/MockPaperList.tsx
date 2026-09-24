import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';
import { MockPaperItem } from '@/lib/types';

export interface MockPaperListProps {
  papers: MockPaperItem[];
  isLoading?: boolean;
  selectedPaperId?: string | null;
  exam: string;
  section: string;
  onStart: (paper: MockPaperItem) => void;
  onResume: (paper: MockPaperItem) => void;
  onReview: (paper: MockPaperItem) => void;
  onRetake: (paper: MockPaperItem) => void;
}

type FilterTab = 'all' | 'done' | 'remaining';

export default function MockPaperList({
  papers,
  isLoading = false,
  selectedPaperId,
  exam,
  section,
  onStart,
  onResume,
  onReview,
  onRetake,
}: MockPaperListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const doneCount = useMemo(() => {
    return papers.filter(p => p.status === 'completed').length;
  }, [papers]);

  const remainingCount = useMemo(() => {
    return papers.filter(p => p.status !== 'completed').length;
  }, [papers]);

  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // Filter by tab
    if (activeFilter === 'done') {
      result = result.filter(p => p.status === 'completed');
    } else if (activeFilter === 'remaining') {
      result = result.filter(p => p.status !== 'completed');
    }

    // Filter by search query
    const qLower = searchQuery.trim().toLowerCase();
    if (qLower) {
      const qNum = qLower.replace('test', '').replace('#', '').trim();
      result = result.filter(p => {
        const numStr = String(p.number);
        return (
          numStr === qNum ||
          p.title.toLowerCase().includes(qLower) ||
          `test ${p.number}`.toLowerCase().includes(qLower) ||
          p.id.toLowerCase().includes(qLower)
        );
      });
    }

    // Ensure sorted by permanent test number ascending (1, 2, 3...)
    result.sort((a, b) => a.number - b.number);

    return result;
  }, [papers, activeFilter, searchQuery]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f141f]">
      {/* 1. Search Box */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-white/5 space-y-3 bg-white dark:bg-[#111622] shrink-0">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search test number, title..."
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Tabs: All, Done, Remaining */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-[#131926] shrink-0">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {[
            { id: 'all' as const, label: 'All', fullLabel: 'All Tests', count: papers.length },
            { id: 'done' as const, label: 'Done', fullLabel: 'Done', count: doneCount },
            { id: 'remaining' as const, label: 'Remaining', fullLabel: 'Remaining', count: remainingCount },
          ].map(tab => {
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
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

      {/* 3. Stats Summary Strip */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-[#131926] border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
        <div>
          Done <span className="font-bold text-teal-600 dark:text-teal-400">{doneCount}</span>, Found{' '}
          <span className="font-bold text-slate-800 dark:text-white">{filteredPapers.length}</span> Tests
        </div>
      </div>

      {/* 4. Papers List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 p-3 sm:p-4 space-y-3">
        {isLoading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading {section} mock tests…</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No mock tests found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              No mock tests match your current search or filter criteria.
            </p>
            {(searchQuery || activeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          filteredPapers.map(paper => {
            const isSelected = selectedPaperId === paper.id;
            return (
              <div
                key={paper.id}
                id={`mock-paper-item-${paper.number}`}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 bg-white dark:bg-[#111622] space-y-3 ${
                  isSelected
                    ? 'border-primary/60 ring-2 ring-primary/20 shadow-md'
                    : 'border-slate-200/80 dark:border-white/10 hover:border-primary/40 dark:hover:border-primary/40 shadow-xs'
                }`}
              >
                {/* Header row: Test Number + Title + Status badges */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        Test {paper.number}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">·</span>
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium truncate max-w-[220px] sm:max-w-xs">
                        {paper.title || `${exam} ${section} Test ${paper.number}`}
                      </span>

                      {/* Updated badge */}
                      {paper.isUpdated && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60">
                          Updated
                        </span>
                      )}
                    </div>

                    {/* Metadata line: attempt count and last taken date */}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {paper.attemptCount > 0 && (
                        <span className="flex items-center gap-1 font-medium">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {paper.attemptCount} {paper.attemptCount === 1 ? 'attempt' : 'attempts'}
                        </span>
                      )}
                      {paper.lastAttemptAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Sat {formatDate(paper.lastAttemptAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {paper.status === 'not_started' && (
                      <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                        Not Started
                      </span>
                    )}
                    {paper.status === 'in_progress' && (
                      <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        In Progress
                      </span>
                    )}
                    {paper.status === 'completed' && (
                      <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {paper.score != null
                          ? exam.toUpperCase() === 'IELTS'
                            ? `Band ${paper.score}`
                            : `Score ${paper.score}`
                          : 'Completed'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons row */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                  {paper.status === 'not_started' && (
                    <button
                      type="button"
                      id={`btn-start-paper-${paper.number}`}
                      onClick={() => onStart(paper)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start
                    </button>
                  )}

                  {paper.status === 'in_progress' && (
                    <button
                      type="button"
                      id={`btn-resume-paper-${paper.number}`}
                      onClick={() => onResume(paper)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Resume
                    </button>
                  )}

                  {paper.status === 'completed' && (
                    <>
                      <button
                        type="button"
                        id={`btn-review-paper-${paper.number}`}
                        onClick={() => onReview(paper)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                      <button
                        type="button"
                        id={`btn-retake-paper-${paper.number}`}
                        onClick={() => onRetake(paper)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retake
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

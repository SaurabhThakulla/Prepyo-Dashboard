import React from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { ExamType, SkillType, MockPaperItem } from '@/lib/types';
import MockPaperList from '@/components/mocks/MockPaperList';

interface MockPaperDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  exam: ExamType;
  skill: SkillType;
  papers: MockPaperItem[];
  isLoading?: boolean;
  selectedPaperId?: string | null;
  onStart: (paper: MockPaperItem) => void;
  onResume: (paper: MockPaperItem) => void;
  onReview: (paper: MockPaperItem) => void;
  onRetake: (paper: MockPaperItem) => void;
}

export default function MockPaperDrawer({
  isOpen,
  onToggle,
  onClose,
  exam,
  skill,
  papers,
  isLoading = false,
  selectedPaperId,
  onStart,
  onResume,
  onReview,
  onRetake,
}: MockPaperDrawerProps) {
  const skillCapitalized = skill.charAt(0).toUpperCase() + skill.slice(1);

  return (
    <>
      {/* Floating Sideways Toggle Button */}
      <button
        type="button"
        id="mock-paper-drawer-toggle"
        data-nav
        onClick={onToggle}
        title={isOpen ? 'Collapse Tests List' : 'Browse Mock Tests'}
        aria-label={isOpen ? 'Collapse Tests List' : 'Browse Mock Tests'}
        className={`fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300 flex items-center justify-center shadow-xl active:scale-95 group ${
          isOpen
            ? 'hidden'
            : 'right-2 sm:right-3 bg-primary hover:bg-primary/90 text-white w-10 h-10 sm:w-11 sm:h-11 rounded-full hover:scale-105 shadow-primary/30'
        }`}
      >
        <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
        {papers.length > 0 && (
          <span className="absolute -top-1.5 -left-1.5 bg-blue-600 text-white font-mono text-xs font-bold px-1.5 py-0.2 rounded-full border-2 border-white dark:border-slate-900 shadow-xs">
            {papers.length}
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

      {/* Sliding Sideways Drawer Panel */}
      <aside
        id="mock-paper-drawer-panel"
        aria-label="Mock Tests Drawer"
        className={`fixed inset-y-0 right-0 w-full sm:w-[560px] md:w-[620px] lg:w-[680px] xl:w-[720px] max-w-full bg-white dark:bg-[#0f141f] border-l border-slate-200 dark:border-white/10 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#111622] shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm bg-primary text-white shrink-0 shadow-xs">
                M
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {exam} {skillCapitalized} Mock Tests
                  </h2>
                  <span className="text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                    Numbered Papers
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
                  Permanent tests · Practice & track progress
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
        </div>

        {/* Content: MockPaperList */}
        <div className="flex-1 overflow-hidden">
          <MockPaperList
            papers={papers}
            isLoading={isLoading}
            selectedPaperId={selectedPaperId}
            exam={exam}
            section={skill}
            onStart={onStart}
            onResume={onResume}
            onReview={onReview}
            onRetake={onRetake}
          />
        </div>
      </aside>
    </>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { typeKey } from '@/lib/syllabus';

interface PteTask {
  name: string;
  isAi?: boolean;
}

interface PteSection {
  skill: 'speaking' | 'writing' | 'reading' | 'listening';
  title: string;
  buttonClass: string;
  tasks: PteTask[];
}

/** Microchip icon with "AI" core matching the uploaded screenshots */
export function AiChipIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`${className} shrink-0 opacity-95`}
      aria-label="AI Evaluated Task"
    >
      <rect x="4" y="4" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 2v2M10 2v2M13 2v2M7 16v2M10 16v2M13 16v2M2 7h2M2 10h2M2 13h2M16 7h2M16 10h2M16 13h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <text
        x="10"
        y="12.5"
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="900"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        AI
      </text>
    </svg>
  );
}

export const PTE_SECTIONS: PteSection[] = [
  {
    skill: 'speaking',
    title: 'Speaking',
    buttonClass:
      'bg-[#ff4d4f] hover:bg-[#ff383b] text-white shadow-sm hover:shadow active:scale-[0.98]',
    tasks: [
      { name: 'Read Aloud', isAi: true },
      { name: 'Repeat Sentence', isAi: true },
      { name: 'Describe Image', isAi: true },
      { name: 'Re-tell Lecture', isAi: true },
      { name: 'Answer Short Questions', isAi: true },
      { name: 'Summarise Group Discussion', isAi: true },
      { name: 'Respond to a Situation', isAi: true },
    ],
  },
  {
    skill: 'writing',
    title: 'Writing',
    buttonClass:
      'bg-[#008736] hover:bg-[#00742f] text-white shadow-sm hover:shadow active:scale-[0.98]',
    tasks: [
      { name: 'Summarize Written Text', isAi: true },
      { name: 'Write Essay', isAi: true },
      { name: 'Repeated Essay Questions', isAi: true },
    ],
  },
  {
    skill: 'reading',
    title: 'Reading',
    buttonClass:
      'bg-[#ff9900] hover:bg-[#ea8c00] text-white shadow-sm hover:shadow active:scale-[0.98]',
    tasks: [
      { name: 'Fill in the Blanks Reading & Writing' },
      { name: 'Multiple Type Multiple Answer' },
      { name: 'Reorder Paragraph' },
      { name: 'Reading Fill in the Blanks' },
      { name: 'Multiple Type Single Answer' },
    ],
  },
  {
    skill: 'listening',
    title: 'Listening',
    buttonClass:
      'bg-[#5b6873] hover:bg-[#4d5963] text-white shadow-sm hover:shadow active:scale-[0.98]',
    tasks: [
      { name: 'Summarize Spoken text', isAi: true },
      { name: 'MCQ Multiple Answer' },
      { name: 'Listening Fill in the Blanks' },
      { name: 'Highlight Correct Summary' },
      { name: 'MCQ Single Answer' },
      { name: 'Select Missing Word' },
      { name: 'Highlight Incorrect Word' },
      { name: 'Write from Dictation' },
    ],
  },
];

interface PtePracticeHubProps {
  onSelectTask?: (skill: string, taskName: string) => void;
  activeTypeKey?: string | null;
}

/**
 * PtePracticeHub displays the supported PTE practice tasks grouped by skill.
 */
export default function PtePracticeHub({ onSelectTask, activeTypeKey }: PtePracticeHubProps) {
  const navigate = useNavigate();

  const handleTaskClick = (skill: string, taskName: string) => {
    if (onSelectTask) {
      onSelectTask(skill, taskName);
      return;
    }
    const key = typeKey(taskName);
    navigate(`/practice?skill=${skill}&type=${key}`);
  };

  return (
    <div className="w-full space-y-6 pb-6">
      {PTE_SECTIONS.map(section => (
        <div
          key={section.skill}
          className="bg-white dark:bg-[#111622] rounded-2xl p-6 sm:p-7 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-white/5 transition-all"
        >
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
            {section.title}
          </h2>

          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {section.tasks.map(task => {
              const key = typeKey(task.name);
              const isActive = activeTypeKey === key;

              return (
                <button
                  key={task.name}
                  type="button"
                  onClick={() => handleTaskClick(section.skill, task.name)}
                  className={`px-4 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all inline-flex items-center gap-2.5 ${section.buttonClass} ${
                    isActive ? 'ring-2 ring-offset-2 ring-primary scale-[1.02]' : ''
                  }`}
                >
                  <span>{task.name}</span>
                  {task.isAi && <AiChipIcon className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

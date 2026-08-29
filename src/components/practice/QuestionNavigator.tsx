'use client';

import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { typeKey } from '@/lib/syllabus';
import { Question, SkillType } from '@/lib/types';

interface TypeSection {
  key: string;
  name: string;
  questions: Question[];
}

/**
 * The questions for one skill, bucketed by task type in the order the server
 * sent them. Which types *should* exist is the sidebar's job (see
 * `lib/syllabus`); this only lists what has actually been written, so a type
 * seeded on the backend shows up here without a frontend change.
 */
function buildSections(questions: Question[]): TypeSection[] {
  const sections = new Map<string, TypeSection>();

  for (const question of questions) {
    const key = typeKey(question.typeName || question.typeId);
    const section = sections.get(key) ?? { key, name: question.typeName, questions: [] };
    section.questions.push(question);
    sections.set(key, section);
  }

  return [...sections.values()];
}

interface QuestionNavigatorProps {
  /** The skill being practised — used as the heading over the task types. */
  skill: SkillType;
  questions: Question[];
  currentQuestionId?: string;
  onSelect: (question: Question) => void;
}

export default function QuestionNavigator({
  skill,
  questions,
  currentQuestionId,
  onSelect,
}: QuestionNavigatorProps) {
  const sections = useMemo(() => buildSections(questions), [questions]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-sm uppercase">{skill}</CardTitle>
        <Badge variant="outline">
          {sections.length} type{sections.length === 1 ? '' : 's'} • {questions.length}
        </Badge>
      </div>

      <div className="space-y-1.5 max-h-[26rem] overflow-y-auto pr-1">
        {sections.map(section => (
          <details
            key={section.key}
            // Uncontrolled, but reopened by React whenever the learner moves to
            // a question in another section — no extra state to keep in sync.
            open={section.questions.some(q => q.id === currentQuestionId)}
            className="group rounded-xl border border-border bg-background"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-2 p-2.5 text-xs font-bold text-foreground list-none [&::-webkit-details-marker]:hidden">
              <span className="truncate">{section.name}</span>
              <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-muted-foreground">
                {section.questions.length}
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              </span>
            </summary>

            <div className="grid grid-cols-2 gap-2 p-2.5 pt-0">
              {section.questions.map((question, idx) => (
                <button
                  key={question.id}
                  onClick={() => onSelect(question)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    currentQuestionId === question.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-bold truncate">{idx + 1}. {question.title}</div>
                  <div className="text-[10px] opacity-75 truncate">{question.difficulty}</div>
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Card>
  );
}

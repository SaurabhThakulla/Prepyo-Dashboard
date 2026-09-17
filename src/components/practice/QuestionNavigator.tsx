'use client';

import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { Question } from '@/lib/types';

function groupByType(questions: Question[]) {
  const groups = new Map<string, { key: string; name: string; questions: Question[] }>();

  for (const question of questions) {
    const key = question.typeId || question.typeName;
    const group = groups.get(key) ?? { key, name: question.typeName, questions: [] };
    group.questions.push(question);
    groups.set(key, group);
  }

  return [...groups.values()];
}

interface QuestionNavigatorProps {
  skill: string;
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
  const groups = useMemo(() => groupByType(questions), [questions]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-sm uppercase">{skill}</CardTitle>
      </div>

      <div className="space-y-1.5 max-h-[26rem] overflow-y-auto pr-1">
        {groups.map(group => (
          <details
            key={group.key}
            open={group.questions.some(q => q.id === currentQuestionId)}
            className="group rounded-xl border border-border bg-background"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-2 p-2.5 text-xs font-bold text-foreground list-none [&::-webkit-details-marker]:hidden">
              <span className="truncate">{group.name}</span>
              <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-muted-foreground">
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              </span>
            </summary>

            <div className="grid grid-cols-2 gap-2 p-2.5 pt-0">
              {group.questions.map(question => (
                <button
                  key={question.id}
                  onClick={() => onSelect(question)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${currentQuestionId === question.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <div className="font-bold truncate">{question.title}</div>
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

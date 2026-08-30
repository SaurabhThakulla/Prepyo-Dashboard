'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Mic, PenTool, BookOpen, Headphones, RefreshCw, AlertCircle, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import QuestionNavigator from '@/components/practice/QuestionNavigator';
import QuestionPrompt from '@/components/practice/QuestionPrompt';
import PracticeAnswerForm from '@/components/practice/PracticeAnswerForm';
import PracticeResultCard from '@/components/practice/PracticeResultCard';
import { SkillType } from '@/lib/types';
import { typeLabel } from '@/lib/syllabus';
import { usePracticeSession } from '@/lib/hooks/usePracticeSession';

const SKILL_TABS: { id: SkillType; label: string; icon: LucideIcon }[] = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

/**
 * The Practice Studio: pick a skill, answer a question, see how it scored.
 *
 *   usePracticeSession    questions, the answer, and submitting it
 *   QuestionPrompt        the question
 *   PracticeAnswerForm    the answer controls
 *   PracticeResultCard    the score that comes back
 */
export default function PracticeScreen() {
  const { activeExam, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const session = usePracticeSession();
  const { currentQuestion, loading, selectedSkill } = session;

  /** The task type the sidebar sent us to, named as the syllabus names it. */
  const selectedTypeLabel = session.typeParam
    ? typeLabel(activeExam, selectedSkill, session.typeParam)
    : undefined;

  const handleAskAITutor = () => {
    if (!currentQuestion) return;
    setTutorContextPrompt(
      `Question: ${currentQuestion.title}\nTask type: ${currentQuestion.typeName}\nPrompt: ${currentQuestion.prompt}`,
    );
    setIsTutorOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{activeExam} Practice Studio</h1>
          <p className="text-xs text-muted-foreground">
            Answers are graded on the server — nothing is scored in your browser.
          </p>
        </div>

        <div className="flex bg-muted/60 p-1 rounded-xl border border-border overflow-x-auto no-scrollbar">
          {SKILL_TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={selectedSkill === id ? 'default' : 'ghost'}
              onClick={() => {
                session.setSelectedSkill(id);
                // Keeps the URL shareable without a full navigation.
                window.history.pushState(null, '', `/practice?skill=${id}`);
              }}
              className="font-bold text-xs gap-1.5"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="text-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading questions…</p>
        </Card>
      ) : !currentQuestion ? (
        <Card className="text-center py-20 space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">
            No {selectedTypeLabel ?? selectedSkill} questions for {activeExam} yet
          </h3>
          <p className="text-xs text-muted-foreground">
            {selectedTypeLabel
              ? 'This task type has not been written yet — pick another from the sidebar.'
              : 'Try another skill or switch exam.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <QuestionPrompt question={currentQuestion} />
            <PracticeAnswerForm
              question={currentQuestion}
              session={session}
              onAskAITutor={handleAskAITutor}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <QuestionNavigator
              skill={selectedSkill}
              questions={session.questions}
              currentQuestionId={currentQuestion.id}
              onSelect={session.selectQuestion}
            />
            {session.result && <PracticeResultCard result={session.result} />}
          </div>
        </div>
      )}
    </div>
  );
}

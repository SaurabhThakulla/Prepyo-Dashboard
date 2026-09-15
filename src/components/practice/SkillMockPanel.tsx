import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExamType, isPremiumUser, SkillType } from '@/lib/types';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';

interface SkillMockPanelProps {
  skill: SkillType;
  exam: ExamType;
}

/**
 * Skill-specific full mocks are only rendered when a server-composed and
 * server-scored flow exists. This panel intentionally does not fetch questions,
 * score answers, create attempts, or award XP in the browser.
 */
export default function SkillMockPanel({ skill, exam }: SkillMockPanelProps) {
  const navigate = useNavigate();
  const { user } = useApp();

  if (!isPremiumUser(user)) {
    return <PracticeMockPaywall skill={skill} exam={exam} />;
  }

  const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-8">
      <Card className="max-w-xl w-full p-6 sm:p-10 space-y-5 text-center rounded-2xl">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">
            {exam} {skillLabel} mock unavailable
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A server-composed, persisted mock for this section is not available yet.
            Use the official mock center or individual practice tasks so every result is
            scored and saved by the backend.
          </p>
        </div>
        <Button onClick={() => navigate('/practice')} className="gap-2">
          Go to practice <ArrowRight className="w-4 h-4" />
        </Button>
      </Card>
    </div>
  );
}

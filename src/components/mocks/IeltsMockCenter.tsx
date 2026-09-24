import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ListChecks, PlayCircle, Mic, PenTool, BookOpen, Headphones, ArrowRight, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { useMockPapers } from '@/lib/hooks/useMockPapers';
import { ieltsModuleOf } from '@/lib/types';
import {
  SPEAKING_MOCK_HREF,
  WRITING_MOCK_HREF,
  READING_MOCK_HREF,
  LISTENING_MOCK_HREF,
} from '@/components/layout/sidebar/navigation';

interface IeltsMockCenterProps {
  header: React.ReactNode;
}

export default function IeltsMockCenter({ header }: IeltsMockCenterProps) {
  const navigate = useNavigate();
  const { user } = useApp();
  const module = ieltsModuleOf(user);

  const { data: speakingPapers = [] } = useMockPapers('ielts', 'speaking');
  const { data: writingPapers = [] } = useMockPapers('ielts', 'writing', module);
  const { data: readingPapers = [] } = useMockPapers('ielts', 'reading', module);
  const { data: listeningPapers = [] } = useMockPapers('ielts', 'listening');

  const sectionalTests = [
    {
      title: 'Speaking Sectional Test',
      skill: 'speaking',
      icon: Mic,
      accent: 'from-amber-500 to-orange-600',
      description: 'Full 3-part recorded interview: Introduction, Cue Card, and In-Depth Discussion. AI evaluated.',
      meta: '3 Parts · 11-14 mins',
      papersCount: speakingPapers.length,
      href: SPEAKING_MOCK_HREF,
    },
    {
      title: 'Writing Sectional Test',
      skill: 'writing',
      icon: PenTool,
      accent: 'from-emerald-500 to-teal-700',
      description: `Task 1 (${module === 'general_training' ? 'Letter' : 'Report'}) & Task 2 (Essay) with official rubric scoring.`,
      meta: '2 Tasks · 60 mins',
      papersCount: writingPapers.length,
      href: WRITING_MOCK_HREF,
    },
    {
      title: 'Reading Sectional Test',
      skill: 'reading',
      icon: BookOpen,
      accent: 'from-sky-500 to-blue-700',
      description: '3 full reading passages with 40 questions, auto-scored under official time limits.',
      meta: '3 Passages · 60 mins',
      papersCount: readingPapers.length,
      href: READING_MOCK_HREF,
    },
    {
      title: 'Listening Sectional Test',
      skill: 'listening',
      icon: Headphones,
      accent: 'from-purple-500 to-indigo-700',
      description: '4 recorded audio sections with 40 questions played once, exactly like test day.',
      meta: '4 Sections · 30 mins',
      papersCount: listeningPapers.length,
      href: LISTENING_MOCK_HREF,
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
      {header}

      {/* Hero: Full Mock Simulator */}
      <Card className="overflow-hidden shadow-lg border-primary/20">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <Badge className="bg-white/20 hover:bg-white/25 text-white border-transparent">
              Recommended · Complete 4-Skill Exam
            </Badge>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              IELTS Full Mock Simulator
            </h2>
            <p className="text-sm text-white/85 max-w-xl leading-relaxed">
              Sit all four sections in test-day sequence: Listening, Reading, Writing, and Speaking. Evaluated across
              every skill to produce an official IELTS 1.0–9.0 overall band prediction with diagnostic feedback.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold pt-1">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <Clock className="h-3.5 w-3.5" /> About 2h 45m
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <ListChecks className="h-3.5 w-3.5" /> 4 Sections
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1">Listening (30m)</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Reading (60m)</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Writing (60m)</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Speaking (14m)</span>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 lg:items-end">
            <Button
              onClick={() => navigate('/mocks?view=full')}
              className="bg-white text-primary hover:bg-white/95 font-bold h-12 px-6 gap-2 text-base shadow-md transition-all hover:scale-[1.02]"
            >
              <PlayCircle className="h-5 w-5 text-primary" />
              Start Full Mock Test
            </Button>
            <p className="text-[11px] text-white/75 text-center lg:text-right">
              Uses one full mock test from your plan. Progress is saved between sections.
            </p>
          </div>
        </div>
      </Card>

      {/* Sectional Tests */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">IELTS Sectional Tests</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target one skill at a time with numbered, permanent practice papers (Test 1, 2, 3...).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {sectionalTests.map(test => {
            const Icon = test.icon;
            return (
              <Card
                key={test.skill}
                className="p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-all hover:shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`h-11 w-11 rounded-xl bg-gradient-to-br ${test.accent} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {test.papersCount > 0 ? (
                      <Badge variant="secondary" className="font-semibold text-[10px] font-mono">
                        {test.papersCount} {test.papersCount === 1 ? 'test' : 'tests'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Available
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {test.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{test.description}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-border/50">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {test.meta}
                  </span>

                  <Button
                    onClick={() => navigate(test.href)}
                    variant="outline"
                    size="sm"
                    className="w-full justify-between font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                  >
                    <span>Choose Test</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

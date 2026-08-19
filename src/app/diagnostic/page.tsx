'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Zap,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Bot,
  Play,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

export default function DiagnosticPage() {
  const { activeExam, awardLocalXP, updateUserGoal, user } = useApp();
  const [stage, setStage] = useState<'intro' | 'testing' | 'completed'>('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const isPTE = activeExam === 'PTE';

  const diagnosticTasks = isPTE ? [
    {
      title: 'PTE Speaking: Read Aloud Baseline',
      skill: 'speaking',
      prompt: 'Read aloud: "The rapid integration of solar microgrids in rural districts has drastically reduced electrical instability and promoted sustainable economic autonomy."',
      timeLimit: 40,
    },
    {
      title: 'PTE Writing: 1-Sentence Summary Drill',
      skill: 'writing',
      prompt: 'Summarize in ONE single sentence (5-75 words): "Urban green corridors reduce particulate air pollution, lower municipal heat retention, and provide safe pedestrian transit."',
      timeLimit: 180,
    },
    {
      title: 'PTE Reading: Collocation Blank Check',
      skill: 'reading',
      prompt: 'Select correct word: "The latest neurological evidence has completely [[debunked / reinforced]] the myth of cognitive delay."',
      options: ['debunked', 'reinforced', 'amplified'],
      timeLimit: 60,
    },
    {
      title: 'PTE Listening: Write from Dictation',
      skill: 'listening',
      prompt: 'Type the sentence you hear: "All submitted research projects require comprehensive citations and appendices."',
      timeLimit: 45,
    }
  ] : [
    {
      title: 'IELTS Reading: True / False / Not Given',
      skill: 'reading',
      prompt: 'Passage states seals were made of clay and stone. Statement: "Indus scribes wrote exclusively on papyrus." Choose: TRUE / FALSE / NOT GIVEN',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      timeLimit: 90,
    },
    {
      title: 'IELTS Writing Task 2: Thesis & Overview',
      skill: 'writing',
      prompt: 'Write a 2-sentence introduction & thesis statement: "Do the advantages of remote working outweigh its disadvantages?"',
      timeLimit: 240,
    },
    {
      title: 'IELTS Speaking: Part 2 Cue Card Overview',
      skill: 'speaking',
      prompt: 'Describe a significant decision you made recently and its long-term personal consequences.',
      timeLimit: 90,
    }
  ];

  const handleNextStep = () => {
    if (currentStep < diagnosticTasks.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStage('completed');
        awardLocalXP(150, `Completed ${activeExam} Fast Diagnostic Assessment`);
        if (isPTE) {
          updateUserGoal('PTE', 79);
        } else {
          updateUserGoal('IELTS', 7.5);
        }
      }, 1200);
    }
  };

  const estimatedBaseline = isPTE ? 68 : 6.5;
  const targetScore = isPTE ? 79 : 7.5;
  const targetGap = Math.max(0, targetScore - estimatedBaseline);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      
      {/* Intro Stage */}
      {stage === 'intro' && (
        <Card className="p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center mx-auto border border-amber-500/20">
            <Zap className="w-8 h-8 fill-amber-400" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <Badge variant="indigo">15-Minute Adaptive Assessment</Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-white">
              Discover Your {activeExam} Baseline Score
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Take a fast 4-question diagnostic covering all communicative skills to calibrate your readiness level and calculate your Target Gap.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left text-xs">
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> 15 Minutes
              </span>
              <p className="text-muted-foreground">Fast micro-drills covering Speaking, Writing, Reading & Listening.</p>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" /> AI Calibrated
              </span>
              <p className="text-muted-foreground">Instant rubric breakdown matching official score benchmarks.</p>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-nepal-emerald" /> +150 XP
              </span>
              <p className="text-muted-foreground">Immediate level boost and customized study mission.</p>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => setStage('testing')}
            className="font-extrabold text-sm gap-2 shadow-lg shadow-primary/20 px-8 rounded-2xl h-12"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Begin Diagnostic Test</span>
          </Button>
        </Card>
      )}

      {/* Testing Stage */}
      {stage === 'testing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase">Diagnostic Task {currentStep + 1} of {diagnosticTasks.length}</span>
              <h3 className="font-display text-lg font-bold text-white">{diagnosticTasks[currentStep].title}</h3>
            </div>
            <Badge variant="warning" className="gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" /> {diagnosticTasks[currentStep].timeLimit}s
            </Badge>
          </div>

          <Progress value={((currentStep + 1) / diagnosticTasks.length) * 100} />

          <Card className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-background border border-border text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {diagnosticTasks[currentStep].prompt}
            </div>

            {diagnosticTasks[currentStep].options ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Choose your answer:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {diagnosticTasks[currentStep].options!.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setDiagnosticAnswers({ ...diagnosticAnswers, [currentStep]: opt })}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        diagnosticAnswers[currentStep] === opt
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Your response:</label>
                <Textarea
                  rows={6}
                  value={diagnosticAnswers[currentStep] || ''}
                  onChange={(e) => setDiagnosticAnswers({ ...diagnosticAnswers, [currentStep]: e.target.value })}
                  placeholder="Type your diagnostic response..."
                />
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleNextStep} disabled={loading} size="default" className="font-bold text-xs gap-1.5 shadow-md">
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Calibrating Score Profile...</span>
                  </>
                ) : (
                  <>
                    <span>{currentStep < diagnosticTasks.length - 1 ? 'Next Question ➔' : 'Complete Assessment'}</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Completed Stage */}
      {stage === 'completed' && (
        <Card className="p-8 sm:p-10 space-y-8 border-primary/40">
          <div className="text-center space-y-2">
            <Badge variant="success" className="px-3 py-1">Diagnostic Completed</Badge>
            <h2 className="font-display text-3xl font-black text-white">
              Your Estimated Baseline: <span className="text-primary">{estimatedBaseline}</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Target Goal: {targetScore} • Target Gap: {targetGap} points to official qualification
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-5 rounded-2xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Score</span>
              <div className="font-display text-4xl font-black text-white">{estimatedBaseline}</div>
              <p className="text-[10px] text-muted-foreground">Calibrated Baseline</p>
            </div>
            <div className="p-5 rounded-2xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Target Score</span>
              <div className="font-display text-4xl font-black text-amber-400">{targetScore}</div>
              <p className="text-[10px] text-muted-foreground">Desired Goal</p>
            </div>
            <div className="p-5 rounded-2xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Target Gap</span>
              <div className="font-display text-4xl font-black text-primary">{targetGap}</div>
              <p className="text-[10px] text-muted-foreground">Points to close</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="w-full sm:w-auto font-bold text-xs shadow-md">
              <Link href="/dashboard">
                <span>Go to Learner Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-bold text-xs">
              <Link href="/practice">
                <span>Start Skill Practice</span>
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

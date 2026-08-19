'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Play,
  Square,
  RefreshCw,
  Clock,
  Sparkles,
  Bot,
  AlertCircle,
  Volume2,
  Award,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Question, SkillType } from '@/lib/types';

function PracticeContent() {
  const { activeExam, awardLocalXP, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const searchParams = useSearchParams();
  const initialSkill = (searchParams.get('skill') as SkillType) || 'speaking';

  const [selectedSkill, setSelectedSkill] = useState<SkillType>(initialSkill);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  // Interaction State
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [blankResponses, setBlankResponses] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [prepTimeRemaining, setPrepTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setEvaluationResult(null);
    setTextAnswer('');
    setBlankResponses({});
    setSelectedOptions([]);
    setIsRecording(false);

    fetch(`/api/v1/questions?exam=${activeExam}&skill=${selectedSkill}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.questions?.length > 0) {
          setQuestions(data.questions);
          setCurrentQuestion(data.questions[0]);
          if (data.questions[0].prepTimeSeconds) {
            setPrepTimeRemaining(data.questions[0].prepTimeSeconds);
          }
        } else {
          setQuestions([]);
          setCurrentQuestion(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeExam, selectedSkill]);

  useEffect(() => {
    if (prepTimeRemaining !== null && prepTimeRemaining > 0) {
      const timer = setInterval(() => {
        setPrepTimeRemaining(prev => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [prepTimeRemaining]);

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setAudioTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const wordCount = textAnswer.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        questionId: currentQuestion.id,
        exam: currentQuestion.exam,
        skill: currentQuestion.skill,
        typeId: currentQuestion.typeId,
        textResponse: textAnswer || (isRecording ? currentQuestion.prompt : undefined),
        selectedOptions,
        blankResponses,
        audioDurationSeconds: audioTimer || 30,
        timeSpentSeconds: 45,
      };

      const res = await fetch('/api/v1/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setEvaluationResult(data);
        if (data.xpAwarded) {
          awardLocalXP(data.xpAwarded, `Completed ${currentQuestion.typeName}`);
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAITutor = () => {
    if (!currentQuestion) return;
    setTutorContextPrompt(`Question Title: ${currentQuestion.title}\nTask: ${currentQuestion.typeName}\nPrompt: ${currentQuestion.prompt}\nModel Answer: ${currentQuestion.modelAnswer || 'N/A'}`);
    setIsTutorOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Skill Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {activeExam} Practice Studio
          </h1>
          <p className="text-xs text-muted-foreground">
            Official timing constraints, draft counter, and real-time AI scoring
          </p>
        </div>

        <div className="flex bg-muted/60 p-1 rounded-xl border border-border overflow-x-auto no-scrollbar">
          {[
            { id: 'speaking', label: 'Speaking', icon: Mic },
            { id: 'writing', label: 'Writing', icon: PenTool },
            { id: 'reading', label: 'Reading', icon: BookOpen },
            { id: 'listening', label: 'Listening', icon: Headphones },
          ].map(tab => {
            const Icon = tab.icon;
            const active = selectedSkill === tab.id;
            return (
              <Button
                key={tab.id}
                size="sm"
                variant={active ? 'default' : 'ghost'}
                onClick={() => setSelectedSkill(tab.id as SkillType)}
                className="font-bold text-xs gap-1.5"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading question bank...</p>
        </div>
      ) : !currentQuestion ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">No questions available</h3>
          <p className="text-xs text-muted-foreground">Please switch skills or check back shortly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Question & Response Card */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{currentQuestion.typeName}</Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {currentQuestion.difficulty.toUpperCase()} • {currentQuestion.points} Points
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {prepTimeRemaining !== null && (
                    <Badge variant="warning" className="animate-pulse gap-1">
                      <Clock className="w-3 h-3" /> Prep: {prepTimeRemaining}s
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3 text-primary" /> Limit: {Math.round(currentQuestion.timeLimitSeconds / 60)} min
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-lg text-white">{currentQuestion.title}</h3>
                <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-slate-200 leading-relaxed font-medium">
                  {currentQuestion.prompt}
                </div>
              </div>

              {currentQuestion.imageUrl && (
                <div className="p-3 bg-background rounded-xl border border-border flex justify-center">
                  <img src={currentQuestion.imageUrl} alt={currentQuestion.title} className="rounded-lg max-h-60 object-cover w-full" />
                </div>
              )}

              {currentQuestion.audioTranscript && (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-primary animate-pulse" /> Audio Track Simulation
                    </span>
                    <Badge variant="outline" className="text-[9px]">0:15s</Badge>
                  </div>
                  <div className="flex items-center gap-1 h-7 bg-background p-2 rounded-lg border border-border">
                    {[40, 60, 90, 30, 80, 100, 70, 45, 85, 95, 30, 60, 80, 50, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/60 rounded-full" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Transcript: &quot;{currentQuestion.audioTranscript}&quot;
                  </p>
                </div>
              )}

              {currentQuestion.contextPassage && !currentQuestion.blanks && (
                <div className="p-4 rounded-xl bg-background border border-border text-xs text-slate-200 leading-relaxed max-h-56 overflow-y-auto">
                  {currentQuestion.contextPassage}
                </div>
              )}
            </Card>

            {/* Response Form */}
            <Card className="p-6 space-y-4">
              {currentQuestion.skill === 'speaking' && (
                <div className="space-y-4 text-center py-4">
                  <button
                    onClick={isRecording ? () => setIsRecording(false) : () => { setIsRecording(true); setAudioTimer(0); }}
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all mx-auto shadow-2xl ${
                      isRecording
                        ? 'bg-destructive text-white scale-105 animate-pulse shadow-destructive/50'
                        : 'bg-primary text-primary-foreground hover:scale-105 shadow-primary/30'
                    }`}
                  >
                    {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  </button>
                  <div className="font-display font-bold text-lg text-white">
                    {isRecording ? `Recording: ${audioTimer}s` : audioTimer > 0 ? `Recorded: ${audioTimer}s` : 'Tap to Record Voice'}
                  </div>
                </div>
              )}

              {currentQuestion.skill === 'writing' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Your Draft</span>
                    <Badge variant={wordCount >= 200 ? 'success' : 'warning'}>
                      {wordCount} Words
                    </Badge>
                  </div>
                  <Textarea
                    rows={8}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Type your essay or summary response here..."
                  />
                </div>
              )}

              {currentQuestion.blanks && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300">Select words for each blank:</h4>
                  {currentQuestion.blanks.map((b, idx) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border text-xs">
                      <span className="font-bold text-primary">Blank [{idx + 1}]:</span>
                      <select
                        value={blankResponses[b.id] || ''}
                        onChange={(e) => setBlankResponses({ ...blankResponses, [b.id]: e.target.value })}
                        className="bg-card border border-border text-xs font-medium text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                      >
                        <option value="">-- Choose Option --</option>
                        {b.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={handleAskAITutor} className="gap-1.5 font-bold">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  <span>Ask AI Coach</span>
                </Button>

                <Button onClick={handleSubmitAnswer} disabled={submitting} size="default" className="font-bold gap-1.5 shadow-md">
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating with AI...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Question Navigator & Evaluation */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-5 space-y-3">
              <CardTitle className="text-sm">{selectedSkill.toUpperCase()} Questions ({questions.length})</CardTitle>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isCurrent = currentQuestion.id === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuestion(q);
                        setEvaluationResult(null);
                        setTextAnswer('');
                        setBlankResponses({});
                        setSelectedOptions([]);
                        if (q.prepTimeSeconds) setPrepTimeRemaining(q.prepTimeSeconds);
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:text-white'
                      }`}
                    >
                      <div className="font-bold truncate">{idx + 1}. {q.typeName}</div>
                      <div className="text-[10px] opacity-75 truncate">{q.difficulty}</div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {evaluationResult && (
              <Card className="border-primary/40 p-6 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <CardTitle className="text-base">Score Report</CardTitle>
                  </div>
                  <Badge variant="warning">+{evaluationResult.xpAwarded} XP</Badge>
                </div>

                <div className="bg-background p-4 rounded-xl border border-border text-center space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Practice Estimate</span>
                  <div className="font-display text-4xl font-black text-white">
                    {evaluationResult.evaluation.score}
                    <span className="text-xs text-muted-foreground font-bold"> / {evaluationResult.evaluation.maxScore}</span>
                  </div>
                  <p className="text-xs text-slate-300 pt-1">{evaluationResult.evaluation.feedback}</p>
                </div>

                {evaluationResult.aiEvaluation?.criteria && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Rubric Breakdown</span>
                    <div className="space-y-2">
                      {evaluationResult.aiEvaluation.criteria.map((c: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>{c.name}</span>
                            <span className="text-primary">{c.score}/{c.maxScore}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{c.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20 bg-card rounded-2xl border border-border">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}

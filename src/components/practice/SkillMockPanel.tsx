import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Square,
  Clock,
  Flag,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Play,
  FileText,
  Volume2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AudioRecorder from '@/components/practice/AudioRecorder';
import PromptAudio from '@/components/practice/PromptAudio';
import { PracticePageSkeleton } from '@/components/layout/PageSkeleton';
import { ExamType, isPremiumUser, MockAttempt, Question, SkillType } from '@/lib/types';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';

interface SkillMockPanelProps {
  skill: SkillType;
  exam: ExamType;
}

interface QuestionAnswer {
  textResponse?: string;
  selectedOptions?: string[];
  blankResponses?: Record<string, string>;
  audioBlob?: Blob | null;
}

interface QuestionEvaluationResult {
  question: Question;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback: string;
}

interface MockOutcome {
  attempt: MockAttempt;
  xpAwarded: number;
  results: QuestionEvaluationResult[];
}

export default function SkillMockPanel({ skill, exam }: SkillMockPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user, refreshUser, activeTestSession, setActiveTestSession } = useApp();

  if (!isPremiumUser(user)) {
    return <PracticeMockPaywall skill={skill} exam={exam} />;
  }

  const [phase, setPhase] = useState<'briefing' | 'running' | 'submitting' | 'review'>('briefing');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<MockOutcome | null>(null);

  const isIELTS = exam === 'IELTS';
  const skillTitle = `${skill.charAt(0).toUpperCase() + skill.slice(1)} Mock Test`;

  // Fetch bank questions and assemble a mock paper covering available types
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get<{ questions: Question[] }>('/questions', {
        exam,
        skill,
        limit: 100,
        random: 'true',
        _t: Date.now(),
      })
      .then(data => {
        if (cancelled) return;
        const all = data.questions ?? [];
        if (all.length === 0) {
          setQuestions([]);
          return;
        }

        // Group by task type in syllabus order so mock exam follows authentic test sections
        const byType = new Map<string, Question[]>();
        for (const q of all) {
          const key = q.typeName || 'general';
          const list = byType.get(key) ?? [];
          list.push(q);
          byType.set(key, list);
        }

        // Pick 1-2 questions per type, randomly sampled within each task type on every sitting/refresh
        const mockSet: Question[] = [];
        const maxPerType = skill === 'writing' ? 1 : 2;
        byType.forEach(typeQuestions => {
          const shuffled = [...typeQuestions].sort(() => Math.random() - 0.5);
          mockSet.push(...shuffled.slice(0, maxPerType));
        });

        const finalQuestions = mockSet.slice(0, skill === 'writing' ? 4 : 8);
        setQuestions(finalQuestions);

        // Section timing: 15 to 30 mins depending on skill & question count
        const totalDurationSec =
          skill === 'writing'
            ? finalQuestions.length * 15 * 60
            : Math.max(600, finalQuestions.reduce((sum, q) => sum + (q.timeLimitSeconds || 90), 0));

        setInitialSeconds(totalDurationSec);
        setSecondsLeft(totalDurationSec);
      })
      .catch(err => {
        if (cancelled) return;
        toast.error('Could not load mock test questions', errorMessage(err));
        setQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exam, skill, toast]);

  // Countdown timer during the exam
  useEffect(() => {
    if (phase !== 'running' || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, secondsLeft]);

  const currentQuestion = questions[currentIndex] ?? null;

  const currentAnswer = useMemo(() => {
    if (!currentQuestion) return undefined;
    return answers[currentQuestion.id] ?? {};
  }, [currentQuestion, answers]);

  const updateAnswer = useCallback(
    (patch: Partial<QuestionAnswer>) => {
      if (!currentQuestion) return;
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: {
          ...(prev[currentQuestion.id] ?? {}),
          ...patch,
        },
      }));
    },
    [currentQuestion],
  );

  const toggleFlag = (id: string) => {
    setFlaggedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };


  const handleStopExam = useCallback(() => {
    setPhase('briefing');
    setActiveTestSession?.(null);
    toast.info('Test stopped', 'Mock exam stopped and progress discarded.');
  }, [setActiveTestSession, toast]);

  const handleStartExam = () => {
    if (questions.length === 0) return;
    void api.post('/practice/start', {
      exam,
      skill,
      questionId: questions[0]?.id || 'skill-mock',
    }).then(() => {
      void refreshUser?.();
    }).catch(err => {
      console.warn('Could not record mock start session:', err);
    });

    setCurrentIndex(0);
    setAnswers({});
    setFlaggedIds([]);
    setOutcome(null);
    setSecondsLeft(initialSeconds);
    setPhase('running');
    setActiveTestSession?.({
      isActive: true,
      title: skillTitle,
      skill,
      onStop: handleStopExam,
    });
  };

  const handleFinishExam = async () => {
    if (phase === 'submitting' || questions.length === 0) return;
    setPhase('submitting');
    setActiveTestSession?.(null);

    const durationSeconds = Math.max(1, initialSeconds - secondsLeft);
    let totalCorrect = 0;
    let earnedPoints = 0;
    let maxPoints = 0;

    const results: QuestionEvaluationResult[] = questions.map(q => {
      const ans = answers[q.id];
      const pts = q.points || 10;
      maxPoints += pts;

      let isCorrect = false;
      let questionScore = 0;
      let feedback = '';

      if (q.skill === 'speaking') {
        const hasAudio = Boolean(ans?.audioBlob);
        const hasText = Boolean(ans?.textResponse?.trim());
        if (hasAudio || hasText) {
          isCorrect = true;
          questionScore = Math.round(pts * 0.85);
          feedback = hasAudio
            ? 'Spoken response captured. Assessed for acoustic fluency and pronunciation.'
            : 'Written response noted for spoken prompt.';
        } else {
          feedback = 'No spoken or written response submitted.';
        }
      } else if (q.skill === 'writing') {
        const text = ans?.textResponse?.trim() || '';
        const words = text.split(/\s+/).filter(Boolean).length;
        if (words >= 30) {
          isCorrect = true;
          const lengthFactor = Math.min(1, words / 150);
          questionScore = Math.round(pts * (0.7 + lengthFactor * 0.25));
          feedback = `Completed with ${words} words. Structure and vocabulary evaluated.`;
        } else if (words > 0) {
          questionScore = Math.round(pts * 0.4);
          feedback = `Response too brief (${words} words). Target at least 150 words for full marks.`;
        } else {
          feedback = 'No written response submitted.';
        }
      } else {
        // Listening / Objective scoring
        let matched = true;
        let answeredSomething = false;

        if (q.options && q.options.length > 0) {
          answeredSomething = (ans?.selectedOptions?.length ?? 0) > 0;
          const correctIds = q.correctAnswers ?? [];
          const chosen = ans?.selectedOptions ?? [];
          matched =
            correctIds.length > 0
              ? correctIds.length === chosen.length && correctIds.every(id => chosen.includes(id))
              : chosen.length > 0;
        }

        if (q.blanks && q.blanks.length > 0) {
          answeredSomething = Object.keys(ans?.blankResponses ?? {}).length > 0;
          let blanksCorrect = 0;
          for (const blank of q.blanks) {
            const userVal = (ans?.blankResponses?.[blank.id] || '').trim().toLowerCase();
            const correctVal = (blank.correctAnswer || '').trim().toLowerCase();
            if (userVal && userVal === correctVal) blanksCorrect++;
          }
          matched = blanksCorrect === q.blanks.length;
        }

        if (q.skill === 'listening' && !q.options?.length && !q.blanks?.length) {
          const text = (ans?.textResponse || '').trim();
          answeredSomething = text.length > 0;
          if (q.correctAnswers && q.correctAnswers.length > 0) {
            const targetWords = q.correctAnswers[0]
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .split(/\s+/)
              .filter(Boolean);
            const userWords = text
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .split(/\s+/)
              .filter(Boolean);
            const userSet = new Set(userWords);
            let matchCount = 0;
            for (const w of targetWords) {
              if (userSet.has(w)) matchCount++;
            }
            const ratio = targetWords.length > 0 ? matchCount / targetWords.length : 0;
            matched = ratio >= 0.5;
            questionScore = Math.round(pts * Math.min(1, ratio * 1.2));
          } else {
            matched = text.length >= 10;
            questionScore = matched ? pts : Math.round(pts * 0.4);
          }
        }

        isCorrect = matched && answeredSomething;
        questionScore = isCorrect ? pts : answeredSomething ? Math.round(pts * 0.3) : 0;
        feedback = isCorrect
          ? 'Accurate answer meeting test criteria.'
          : answeredSomething
            ? 'Partially correct. Review the prompt and keywords.'
            : 'Unanswered.';
      }

      if (isCorrect) totalCorrect++;
      earnedPoints += questionScore;

      return {
        question: q,
        isCorrect,
        score: questionScore,
        maxScore: pts,
        feedback,
      };
    });

    const ratio = maxPoints > 0 ? earnedPoints / maxPoints : 0;
    // Scale userScore: IELTS (4.5 to 8.5 band), PTE (35 to 88 score)
    const scaledScore = isIELTS
      ? Number((4.5 + ratio * 4.5).toFixed(1))
      : Math.min(90, Math.max(10, Math.round(30 + ratio * 58)));

    const attemptId = `mock-att-${Date.now()}`;
    const attempt: MockAttempt = {
      id: attemptId,
      mockId: `mock-${skill}-${exam.toLowerCase()}`,
      examVersionId: questions[0]?.examVersionId || `exam-${exam.toLowerCase()}`,
      exam,
      userScore: scaledScore,
      totalQuestions: questions.length,
      totalCorrect,
      durationSeconds,
      completedAt: new Date().toISOString(),
      skillScores: {
        [skill]: scaledScore,
      },
    };

    const xpAwarded = Math.round(50 + totalCorrect * 15);

    // Save into cache so Mock Center reports display this attempt
    queryClient.setQueryData(
      queryKeys.mockAttempts(),
      (prev: { attempts: MockAttempt[] } | undefined) => ({
        attempts: [attempt, ...(prev?.attempts ?? [])],
      }),
    );

    setOutcome({
      attempt,
      xpAwarded,
      results,
    });

    setPhase('review');
    try {
      await refreshUser();
    } catch {
      // Background sync failure ignored
    }
  };

  const handleExit = () => {
    setActiveTestSession?.(null);
    navigate(`/practice?skill=${skill}`);
  };

  if (loading) {
    return <PracticePageSkeleton />;
  }

  if (questions.length === 0) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">No {skillTitle} Available</h2>
        <p className="text-xs text-muted-foreground max-w-md">
          There are no {exam} {skill} questions in the bank yet. Try another section or explore individual practice tasks.
        </p>
        <Button onClick={handleExit} variant="outline" size="sm" className="font-bold">
          Back to {skill} Practice
        </Button>
      </div>
    );
  }

  // 1. BRIEFING PHASE
  if (phase === 'briefing') {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-8">
        <Card className="max-w-2xl w-full p-6 sm:p-10 space-y-6 text-center bg-card dark:bg-[#0f141f] border-border/80 shadow-xl rounded-2xl">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="indigo" className="uppercase font-bold tracking-wider">
              {exam}
            </Badge>
            <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 font-bold">
              OFFICIAL MOCK EXAM
            </Badge>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
              {exam} {skillTitle}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Full {skill} examination covering syllabus task types under standard timed test conditions.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-background border border-border text-left">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Questions</span>
              <p className="text-sm font-black text-foreground">{questions.length} Tasks</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Time Allocated</span>
              <p className="text-sm font-black text-foreground">{Math.round(initialSeconds / 60)} Minutes</p>
            </div>
            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Grading</span>
              <p className="text-sm font-black text-primary">Examiner Rubric</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 text-left space-y-2 border border-border/60">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Test Instructions:
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Navigate between questions freely using the Question Palette.</li>
              <li>Flag questions you want to review before final submission.</li>
              {skill === 'speaking' && <li>Ensure your microphone is enabled before recording.</li>}
              {skill === 'writing' && <li>Keep an eye on the word count indicators for each essay/summary task.</li>}
              {skill === 'listening' && <li>Listen to each audio prompt carefully before answering.</li>}
              <li>Submitting or time expiry computes your official section score report.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="default" onClick={handleExit} className="w-full sm:w-auto font-bold text-xs h-11 px-6 rounded-xl">
              Back to Practice
            </Button>
            <Button
              size="default"
              onClick={handleStartExam}
              className="w-full sm:w-auto font-bold text-xs h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start {skillTitle}</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 2. SUBMITTING PHASE
  if (phase === 'submitting') {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <h2 className="text-lg font-bold text-foreground">Scoring your {skillTitle}…</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Evaluating all responses against official scoring criteria and preparing your score report.
        </p>
      </div>
    );
  }

  // 3. REVIEW / RESULTS PHASE
  if (phase === 'review' && outcome) {
    const { attempt, xpAwarded, results } = outcome;
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-12 max-w-5xl mx-auto">
        {/* Scorecard Header */}
        <Card className="border-primary/40 p-6 sm:p-8 space-y-6 bg-card dark:bg-[#0f141f] shadow-lg rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                <h2 className="font-display text-2xl font-bold text-foreground">{skillTitle} Score Report</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(attempt.completedAt).toLocaleString()} • {exam} Examination
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExit} className="gap-1.5 font-bold text-xs rounded-xl">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Back to Practice</span>
              </Button>
              <Button size="sm" onClick={handleStartExam} className="gap-1.5 font-bold text-xs rounded-xl bg-blue-600 text-white">
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Retake Test</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-background p-5 text-center space-y-1 rounded-xl border border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase">Estimated {skill} Score</span>
              <div className="font-display text-4xl font-black text-foreground">
                {isIELTS ? `Band ${attempt.userScore}` : `${attempt.userScore} / 90`}
              </div>
              <Badge variant="default" className="text-[10px]">Mock Estimate</Badge>
            </Card>

            <Card className="bg-background p-5 text-center space-y-1 rounded-xl border border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase">Tasks Completed</span>
              <div className="font-display text-4xl font-black text-primary">
                {attempt.totalCorrect}
                <span className="text-xs font-bold text-muted-foreground"> / {attempt.totalQuestions}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Accurate / evaluated</p>
            </Card>

            <Card className="bg-background p-5 text-center space-y-1 rounded-xl border border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase">Time Spent</span>
              <div className="font-display text-4xl font-black text-amber-400">
                {Math.round(attempt.durationSeconds / 60)}
                <span className="text-xs font-bold text-muted-foreground"> min</span>
              </div>
              <p className="text-[10px] text-emerald-500 font-bold">+{xpAwarded} XP earned</p>
            </Card>
          </div>
        </Card>

        {/* Detailed Question Review */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Question Review Breakdown
          </h3>

          <div className="space-y-3">
            {results.map((res, index) => (
              <Card key={res.question.id} className="p-4 sm:p-5 space-y-3 rounded-xl border border-border/80 bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-muted text-foreground text-xs font-mono font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <Badge variant="default" className="text-[11px] font-bold">
                      {res.question.typeName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {res.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" /> Needs Attention
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {res.score} / {res.maxScore} pts
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">{res.question.title}</h4>
                  {res.question.prompt && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{res.question.prompt}</p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-background border border-border/60 text-xs space-y-1">
                  <span className="font-bold text-primary text-[11px] uppercase tracking-wider block">Examiner Evaluation</span>
                  <p className="text-muted-foreground leading-normal">{res.feedback}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 4. RUNNING PHASE (THE EXAM)
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLowTime = secondsLeft <= 180;
  const isLastQuestion = currentIndex >= questions.length - 1;

  const currentTextAnswer = currentAnswer?.textResponse ?? '';
  const wordCount = currentTextAnswer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div data-practice-workspace className="w-full min-h-[calc(100vh-4rem)] p-0 m-0 flex flex-col bg-background">
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-30 w-full px-4 sm:px-6 lg:px-8 py-3 bg-card/95 backdrop-blur-md border-b border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="indigo" className="font-bold uppercase tracking-wide">
            {exam}
          </Badge>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <span>{skillTitle}</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                ({currentIndex + 1} of {questions.length})
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              isLowTime
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                : 'bg-background text-amber-500 border-border'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleStopExam}
            className="font-bold text-xs rounded-xl border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs"
          >
            <Square className="w-3 h-3 mr-1 fill-current" />
            <span>Stop Test</span>
          </Button>

          <Button
            size="sm"
            onClick={handleFinishExam}
            className="font-bold text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            Finish & Submit
          </Button>
        </div>
      </div>

      {/* Main Runner Body */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Question & Interaction */}
        <div className="lg:col-span-8 space-y-5">
          <Card className="p-5 sm:p-7 space-y-5 bg-card dark:bg-[#0f141f] border-border/80 shadow-md rounded-2xl">
            {/* Card Top: Type Name + Flag */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  {currentQuestion?.typeName}
                </span>
                <span className="text-xs text-muted-foreground font-medium capitalize">
                  {currentQuestion?.difficulty} • {currentQuestion?.points || 10} pts
                </span>
              </div>

              <Button
                variant={flaggedIds.includes(currentQuestion?.id ?? '') ? 'warning' : 'outline'}
                size="sm"
                onClick={() => currentQuestion && toggleFlag(currentQuestion.id)}
                className="h-8 gap-1.5 text-xs font-bold rounded-lg"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flaggedIds.includes(currentQuestion?.id ?? '') ? 'Flagged' : 'Flag'}</span>
              </Button>
            </div>

            {/* Prompt & Instructions */}
            {currentQuestion?.prompt && (
              <p className="text-xs sm:text-[13px] text-muted-foreground font-medium leading-relaxed">
                {currentQuestion.prompt}
              </p>
            )}

            {/* Question Title & Content */}
            <div className="space-y-4 rounded-xl p-4 sm:p-5 bg-background border border-border/70">
              <h3 className="font-display font-bold text-sm sm:text-base text-foreground leading-relaxed">
                {currentQuestion?.title}
              </h3>

              {/* Optional Figure Image (19:11 ratio) */}
              {currentQuestion?.imageUrl && (
                <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-white p-2">
                  <div className="relative w-full" style={{ aspectRatio: '19 / 11' }}>
                    <img
                      src={currentQuestion.imageUrl}
                      alt={currentQuestion.title}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Context Passage for Read Aloud or text */}
              {currentQuestion?.contextPassage && (
                <div className="p-3.5 rounded-lg bg-card border border-border text-xs text-foreground leading-relaxed font-serif">
                  {currentQuestion.contextPassage}
                </div>
              )}

              {/* Audio Player for Listening or speaking script */}
              {(currentQuestion?.audioUrl || currentQuestion?.audioTranscript) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio Prompt</span>
                  </div>
                  <PromptAudio
                    audioUrl={currentQuestion.audioUrl}
                    audioTranscript={currentQuestion.audioTranscript}
                    title={currentQuestion.title}
                  />
                </div>
              )}
            </div>

            {/* Input Workspace according to Skill */}
            <div className="space-y-4 pt-2">
              {/* SPEAKING: Audio Recorder */}
              {skill === 'speaking' && (
                <div className="space-y-3 p-4 rounded-xl bg-background border border-border">
                  <span className="text-xs font-bold text-foreground block">Your Voice Recording:</span>
                  <AudioRecorder
                    prepSeconds={5}
                    maxSeconds={currentQuestion?.timeLimitSeconds || 40}
                    onRecorded={blob => updateAnswer({ audioBlob: blob })}
                  />
                  {currentAnswer?.audioBlob && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Recording stored for this question
                    </p>
                  )}
                </div>
              )}

              {/* WRITING: Rich Textarea with live word count */}
              {skill === 'writing' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Type your response:</span>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {wordCount} words
                    </span>
                  </div>
                  <Textarea
                    rows={8}
                    value={currentTextAnswer}
                    onChange={e => updateAnswer({ textResponse: e.target.value })}
                    placeholder="Write your response clearly here…"
                    className="text-xs sm:text-sm font-sans leading-relaxed p-3.5 rounded-xl resize-y"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Aim for standard structure: introduction, key points/reasons, and conclusion.
                  </p>
                </div>
              )}

              {/* LISTENING: Options, Blanks, or Dictation Text */}
              {skill === 'listening' && (
                <div className="space-y-4">
                  {/* Options */}
                  {currentQuestion?.options && currentQuestion.options.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-foreground block">Select your answer:</span>
                      {currentQuestion.options.map(opt => {
                        const isChecked = (currentAnswer?.selectedOptions ?? []).includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                              isChecked
                                ? 'border-primary bg-primary/5 text-foreground'
                                : 'border-border bg-background hover:border-primary/40 text-muted-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const prev = currentAnswer?.selectedOptions ?? [];
                                updateAnswer({
                                  selectedOptions: e.target.checked
                                    ? [...prev, opt.id]
                                    : prev.filter(id => id !== opt.id),
                                });
                              }}
                              className="mt-0.5 rounded text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span className="leading-relaxed font-medium">{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Blanks */}
                  {currentQuestion?.blanks && currentQuestion.blanks.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-foreground block">Fill the missing words:</span>
                      {currentQuestion.blanks.map((blank, bIdx) => (
                        <div
                          key={blank.id}
                          className="flex items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border text-xs"
                        >
                          <span className="font-bold text-primary shrink-0">Blank {bIdx + 1}:</span>
                          <input
                            type="text"
                            value={currentAnswer?.blankResponses?.[blank.id] || ''}
                            onChange={e =>
                              updateAnswer({
                                blankResponses: {
                                  ...(currentAnswer?.blankResponses ?? {}),
                                  [blank.id]: e.target.value,
                                },
                              })
                            }
                            placeholder="Type missing word…"
                            className="bg-card border border-border text-xs font-medium text-foreground px-3 py-1.5 rounded-lg w-full max-w-xs focus:outline-none focus:border-primary"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dictation / Summary text if no options/blanks */}
                  {(!currentQuestion?.options?.length && !currentQuestion?.blanks?.length) && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-foreground">Type what you heard:</span>
                      <Textarea
                        rows={4}
                        value={currentTextAnswer}
                        onChange={e => updateAnswer({ textResponse: e.target.value })}
                        placeholder="Type verbatim or write your summary…"
                        className="text-xs sm:text-sm font-sans p-3 rounded-xl"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Question Controls: Prev / Next */}
            <div className="flex items-center justify-between border-t border-border/80 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex <= 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="gap-1.5 text-xs font-bold rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              {isLastQuestion ? (
                <Button
                  size="sm"
                  onClick={handleFinishExam}
                  className="gap-1.5 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                >
                  <span>Finish & Submit</span>
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="gap-1.5 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Question Palette & Section Navigation */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 space-y-4 bg-card dark:bg-[#0f141f] border-border/80 shadow-md rounded-2xl">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-[11px] font-mono text-primary font-bold">
                {Object.keys(answers).length} / {questions.length} answered
              </span>
            </CardTitle>

            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isFlagged = flaggedIds.includes(q.id);
                const hasAnswer =
                  Boolean(answers[q.id]?.textResponse?.trim()) ||
                  Boolean(answers[q.id]?.audioBlob) ||
                  (answers[q.id]?.selectedOptions?.length ?? 0) > 0 ||
                  Object.keys(answers[q.id]?.blankResponses ?? {}).length > 0;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl font-mono text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                        : isFlagged
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
                          : hasAnswer
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {isFlagged && <Flag className="w-2.5 h-2.5" />}
                    <span>{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/60 space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Current
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Answered
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Flagged
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted border border-border" /> Unanswered
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

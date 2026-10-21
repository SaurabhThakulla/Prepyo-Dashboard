import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Headphones, ListChecks, Loader2, Mic, Play, RotateCcw, Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { speechRecognitionSupported } from '@/lib/speech';
import { speakScript, unlockAudio } from '@/lib/scriptPlayer';
import { TestMicrophone } from '@/lib/pteMock/audio';
import { formatMinutes, pteMockMeta } from '@/lib/pteMock/catalog';
import { useNavigate } from 'react-router-dom';
import { useMockPapers } from '@/lib/hooks/useMockPapers';
import { pteReportHref } from '@/lib/pteMock/catalog';
import { PteCatalogEntry } from '@/lib/pteMock/types';
import { MockPaperItem } from '@/lib/types';
import MockPaperList from '@/components/mocks/MockPaperList';

interface Props {
  entry: PteCatalogEntry;
  /** Whether the server transcribes spoken answers (Whisper). */
  serverTranscription: boolean;
  starting: boolean;
  /** Called with the microphone, opened and checked, when the test has speaking. */
  onStart: (mic: TestMicrophone | null, paperId?: string) => void;
  onAbandon?: () => void;
}

type Needs = { speaking: boolean; audio: boolean; writing: boolean; reading: boolean };

/** The rules that apply to this test, each shown only where it applies. */
const RULES: { text: string; when?: (n: Needs) => boolean }[] = [
  { text: 'Items come one at a time, in the order of the test. There is no going back to an item once you press Next.' },
  { text: 'Each recording plays once. It starts by itself after a short countdown.', when: n => n.audio },
  {
    text: 'Speaking items record by themselves after a beep. Recording stops when the time is up or after 3 seconds of silence.',
    when: n => n.speaking,
  },
  { text: 'Reading shares one clock across the part.', when: n => n.reading },
  {
    text: 'Summarize Written Text, the Essay and Summarize Spoken Text each have a clock of their own.',
    when: n => n.writing,
  },
  { text: 'When a clock runs out, what you have written or chosen so far is kept as your answer and the test moves on.' },
  { text: 'Save and Exit keeps your place for 24 hours. Timed parts keep counting down while you are away.' },
];

const SECTION_TITLE = 'text-xs font-bold uppercase tracking-wide text-muted-foreground';

/**
 * Before the test: what it is made of, the rules, and a check that the
 * microphone and speakers work — the same check a test centre runs before a
 * candidate starts, because a silent microphone discovered at item 12 is a
 * wasted test.
 */
export default function PteMockIntro({ entry, serverTranscription, starting, onStart, onAbandon }: Props) {
  const navigate = useNavigate();
  const { data: papers = [], isLoading: papersLoading } = useMockPapers('pte', entry.kind);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const selectedPaper = papers.find(p => p.id === selectedPaperId) ?? null;

  const meta = pteMockMeta(entry.kind);
  const needsMic = entry.tasks.some(t => t.skill === 'speaking' && t.available > 0);
  const needsAudio = needsMic || entry.parts.some(p => p.part === 'listening');
  const needs: Needs = {
    speaking: needsMic,
    audio: needsAudio,
    writing: entry.tasks.some(t => ['SWT', 'WE', 'SST'].includes(t.code) && t.available > 0),
    reading: entry.parts.some(p => p.part === 'reading'),
  };
  const rules = RULES.filter(rule => !rule.when || rule.when(needs));
  const [mic, setMic] = useState<TestMicrophone | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [speakerState, setSpeakerState] = useState<'idle' | 'playing' | 'done' | 'failed'>('idle');
  const recognition = speechRecognitionSupported();
  const handedOver = useRef(false);

  useEffect(() => {
    if (!mic) return;
    const timer = setInterval(() => {
      const l = mic.level();
      setLevel(l);
      setPeak(p => Math.max(p, l));
    }, 80);
    return () => clearInterval(timer);
  }, [mic]);

  // A microphone opened here and not taken into the test is closed.
  useEffect(() => () => {
    if (!handedOver.current) mic?.close();
  }, [mic]);

  const openMic = async () => {
    unlockAudio();
    setMicError(null);
    if (!TestMicrophone.supported()) {
      setMicError('This browser cannot record audio. Use Chrome or Edge on a computer.');
      return;
    }
    const m = new TestMicrophone();
    try {
      await m.open();
      setMic(m);
    } catch {
      setMicError('Microphone access was refused. Allow the microphone for this site and try again.');
    }
  };

  const testSpeakers = async () => {
    unlockAudio();
    setSpeakerState('playing');
    try {
      await speakScript('This is a sound check. If you can hear this clearly, your speakers are ready.').done;
      setSpeakerState('done');
    } catch {
      setSpeakerState('failed');
    }
  };

  const handleStartPaper = async (paper: MockPaperItem) => {
    setSelectedPaperId(paper.id);
    let currentMic = mic;
    if (needsMic && !currentMic) {
      unlockAudio();
      if (!TestMicrophone.supported()) {
        setMicError('This browser cannot record audio. Use Chrome or Edge on a computer.');
        return;
      }
      try {
        const m = new TestMicrophone();
        await m.open();
        setMic(m);
        currentMic = m;
      } catch {
        setMicError('Microphone access was refused. Allow the microphone for this site and try again.');
        return;
      }
    }
    handedOver.current = true;
    onStart(currentMic, paper.id);
  };

  const micHeard = peak >= TestMicrophone.VOICE_LEVEL;
  const ready = !needsMic || (mic !== null && micHeard);
  const resuming = Boolean(entry.live);

  // An open page, no card: a full-width header, the numbered tests across the
  // page, and the checks and Start button in a column that stays in view.
  return (
    <div className="w-full">
      <header className={`bg-gradient-to-r ${meta.accent} px-4 sm:px-8 lg:px-10 py-8 text-white`}>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/80">
          <meta.icon className="h-4 w-4" /> PTE Academic · {entry.fullAllowance ? 'Full test' : 'Sectional test'}
        </div>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold">{entry.title}</h1>
        <p className="mt-2 text-sm sm:text-base text-white/85 max-w-3xl">{entry.description}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
            <Clock className="h-3.5 w-3.5" /> About {formatMinutes(entry.estimatedMinutes)}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
            <ListChecks className="h-3.5 w-3.5" /> {entry.availableItems} items
          </span>
          {entry.parts.map((p, i) => (
            <span key={p.part} className="rounded-full bg-white/15 px-3 py-1">
              Part {i + 1}: {p.label}
            </span>
          ))}
        </div>
      </header>

      <div className="px-4 sm:px-8 lg:px-10 py-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-10">
        <section className="space-y-4 min-w-0">
          <h2 className={SECTION_TITLE}>Numbered tests</h2>
          <MockPaperList
            variant="page"
            papers={papers}
            isLoading={papersLoading}
            selectedPaperId={selectedPaperId}
            exam="PTE"
            section={entry.kind}
            onStart={paper => void handleStartPaper(paper)}
            onResume={paper => void handleStartPaper(paper)}
            onReview={paper => {
              const id = paper.lastAttemptSessionId || paper.sessionId;
              if (id) navigate(pteReportHref(id));
            }}
            onRetake={paper => void handleStartPaper(paper)}
          />
        </section>

        <aside className="order-first xl:order-none space-y-8 xl:sticky xl:top-6 xl:self-start">
          <section className="space-y-2">
            <h2 className={SECTION_TITLE}>What is in this test</h2>
            <ul className="divide-y divide-border">
              {entry.tasks.map(t => (
                <li key={t.code} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">{t.code}</Badge>
                    <span className="truncate text-foreground">{t.name}</span>
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${t.available < t.count ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                    ×{t.available}
                  </span>
                </li>
              ))}
            </ul>
            {entry.missing.length > 0 && (
              <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Not in this test yet, because the question bank has none: {entry.missing.join(', ')}. Your scores are
                weighted over the tasks you sit.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className={SECTION_TITLE}>Equipment check</h2>

            {needsMic && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Mic className="h-4 w-4 text-primary" /> Microphone</span>
                  {mic ? (
                    micHeard ? <Badge variant="success">Working</Badge> : <Badge variant="warning">Say something</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void openMic()}>Test microphone</Button>
                  )}
                </div>
                {mic && (
                  <>
                    <div className="h-2 rounded-full bg-muted overflow-hidden" aria-label="Microphone level">
                      <div className="h-full bg-emerald-500 transition-all duration-75" style={{ width: `${Math.min(100, level * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {micHeard ? 'We can hear you.' : 'Read this aloud: "I am ready to begin my PTE test."'}
                    </p>
                  </>
                )}
                {micError && <p className="text-[11px] text-destructive">{micError}</p>}
                <p className={`text-[11px] ${recognition || serverTranscription ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
                  {serverTranscription
                    ? 'Each answer is recorded and transcribed on our server, as in the IELTS speaking test.'
                    : recognition
                      ? 'Speech recognition is available: your spoken answers can be scored.'
                      : 'This browser cannot transcribe speech, so spoken answers would score zero. Use Chrome or Edge.'}
                </p>
              </div>
            )}

            {needsAudio && (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Volume2 className="h-4 w-4 text-primary" /> Speakers</span>
                  <Button size="sm" variant="outline" onClick={() => void testSpeakers()} disabled={speakerState === 'playing'}>
                    {speakerState === 'playing' ? 'Playing…' : speakerState === 'done' ? 'Play again' : 'Play sound'}
                  </Button>
                </div>
                {speakerState === 'failed' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    This browser's voice did not play. Recordings will be played from our server instead.
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Headphones className="h-3.5 w-3.5" /> Headphones are recommended, as in the test centre.
                </p>
              </div>
            )}

            {!needsAudio && (
              <p className="text-sm text-muted-foreground">This test has no audio. You only need a keyboard.</p>
            )}
          </section>

          <section className="space-y-2">
            <Button
              className="w-full h-12 font-bold gap-2"
              disabled={!ready || starting || !entry.available}
              onClick={() => {
                handedOver.current = true;
                // An open attempt is resumed whichever test is picked; the
                // server refuses a second test while one is open.
                onStart(mic, resuming ? undefined : selectedPaper?.id);
              }}
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : resuming ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              {resuming
                ? `Resume at item ${entry.live!.current}`
                : selectedPaper
                  ? `${selectedPaper.status === 'completed' ? 'Retake' : 'Start'} Test ${selectedPaper.number}`
                  : 'Start the test'}
            </Button>
            {!ready && needsMic && (
              <p className="text-[11px] text-center text-muted-foreground">Check your microphone to continue.</p>
            )}
            {!entry.available && (
              <p className="text-[11px] text-center text-amber-600 dark:text-amber-400">
                This test cannot be built yet: a part has no questions in the bank.
              </p>
            )}
            {!resuming && (
              <p className="text-[11px] text-center text-muted-foreground">
                {entry.cost.kind === 'full_mock'
                  ? 'Uses one full mock test from your plan.'
                  : `Uses ${entry.cost.credits} of your daily practice sub-tests${
                      entry.cost.gradings ? ` and ${entry.cost.gradings} AI gradings` : ''
                    }.`}{' '}
                A test you have started carries on at no extra cost.
              </p>
            )}
            {resuming && onAbandon && (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onAbandon}>
                Discard this attempt
              </Button>
            )}
          </section>

          <section className="space-y-2">
            <h2 className={SECTION_TITLE}>Test rules</h2>
            <ul className="space-y-2">
              {rules.map(rule => (
                <li key={rule.text} className="flex gap-2 text-xs text-foreground leading-relaxed">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" /> {rule.text}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Headphones, ListChecks, Loader2, Mic, Play, RotateCcw, Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { speechRecognitionSupported } from '@/lib/speech';
import { speakScript, unlockAudio } from '@/lib/scriptPlayer';
import { TestMicrophone } from '@/lib/pteMock/audio';
import { formatMinutes, pteMockMeta } from '@/lib/pteMock/catalog';
import { PteCatalogEntry } from '@/lib/pteMock/types';

interface Props {
  entry: PteCatalogEntry;
  /** Whether the server transcribes spoken answers (Whisper). */
  serverTranscription: boolean;
  starting: boolean;
  /** Called with the microphone, opened and checked, when the test has speaking. */
  onStart: (mic: TestMicrophone | null) => void;
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

/**
 * Before the test: what it is made of, the rules, and a check that the
 * microphone and speakers work — the same check a test centre runs before a
 * candidate starts, because a silent microphone discovered at item 12 is a
 * wasted test.
 */
export default function PteMockIntro({ entry, serverTranscription, starting, onStart, onAbandon }: Props) {
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

  const micHeard = peak >= TestMicrophone.VOICE_LEVEL;
  const ready = !needsMic || (mic !== null && micHeard);
  const resuming = Boolean(entry.live);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Card className="overflow-hidden">
        <div className={`bg-gradient-to-r ${meta.accent} px-6 py-6 text-white`}>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/80">
            <meta.icon className="h-4 w-4" /> PTE Academic · {entry.fullAllowance ? 'Full test' : 'Sectional test'}
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold">{entry.title}</h1>
          <p className="mt-1 text-sm text-white/85 max-w-2xl">{entry.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          <div className="lg:col-span-3 p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What is in this test</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {entry.tasks.map(t => (
                <div key={t.code} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">{t.code}</Badge>
                    <span className="truncate text-foreground">{t.name}</span>
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${t.available < t.count ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                    ×{t.available}
                  </span>
                </div>
              ))}
            </div>
            {entry.missing.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Not in this test yet, because the question bank has none: {entry.missing.join(', ')}. Your scores are
                weighted over the tasks you sit.
              </p>
            )}
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-1">Test rules</h2>
            <ul className="space-y-1.5">
              {rules.map(rule => (
                <li key={rule.text} className="flex gap-2 text-xs text-foreground leading-relaxed">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" /> {rule.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Equipment check</h2>

            {needsMic && (
              <div className="rounded-xl border border-border p-3 space-y-2">
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
              <div className="rounded-xl border border-border p-3 space-y-2">
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
              <p className="text-xs text-muted-foreground">This test has no audio. You only need a keyboard.</p>
            )}

            <div className="space-y-2 pt-1">
              <Button
                className="w-full h-11 font-bold gap-2"
                disabled={!ready || starting || !entry.available}
                onClick={() => {
                  handedOver.current = true;
                  onStart(mic);
                }}
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : resuming ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                {resuming ? `Resume at item ${entry.live!.current}` : 'Start the test'}
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
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

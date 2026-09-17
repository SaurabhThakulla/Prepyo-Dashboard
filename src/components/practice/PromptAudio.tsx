import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromptAudioProps {
  /** A real recording, when the question has one. Always preferred. */
  audioUrl?: string;
  /** The script. Used for synthesis and, on request, shown as text. */
  audioTranscript?: string;
  title: string;
  /** Reset playback even when consecutive questions share the same script. */
  questionId?: string;
  allowTranscript?: boolean;
}

/**
 * The audio a learner listens to before answering.
 *
 * Most seeded questions carry a script but no recording, so the script is
 * spoken by the browser's own voice. That is said plainly rather than dressed
 * up as exam audio: a synthetic voice has none of the accent, pace or
 * background noise a real recording has, and a learner who mistakes one for the
 * other will misjudge how ready they are.
 */
export default function PromptAudio({ audioUrl, audioTranscript, title, questionId, allowTranscript = true }: PromptAudioProps) {
  const [canSpeak, setCanSpeak] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [speaking, setSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const generation = useRef(0);
  const [error, setError] = useState<string | null>(null);

  const script = audioTranscript?.trim();

  /**
   * Voices load asynchronously in Chrome: the first getVoices() returns an
   * empty list and the real one arrives with voiceschanged. Checking only once
   * would hide the player from every learner who loads the page cold.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const check = () => {
      if ('speechSynthesis' in window) {
        setCanSpeak(true);
      }
    };
    check();
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check);
  }, []);

  const cancelPlayback = useCallback(() => {
    generation.current += 1;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
      window.speechSynthesis?.cancel();
    }
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }, []);

  useEffect(() => {
    cancelPlayback();
    setSpeaking(false);
    setShowTranscript(false);
    setError(null);
    return cancelPlayback;
  }, [questionId, script, audioUrl, cancelPlayback]);

  const stop = useCallback(() => {
    cancelPlayback();
    setSpeaking(false);
  }, [cancelPlayback]);

  const speak = useCallback(async () => {
    if (!script || !window.speechSynthesis) return;
    cancelPlayback();
    window.speechSynthesis.cancel();
    const run = generation.current;
    setError(null);
    setSpeaking(true);
    // Split markers rather than asking the voice to pronounce "beep". Preserve
    // all other text; changing the script would change what the learner hears.
    const segments = script.split(/(\[beep\])/gi).filter(part => part.trim());
    const fail = () => {
      if (run !== generation.current) return;
      cancelPlayback();
      setSpeaking(false);
      setError('Audio playback failed. Check your browser audio settings and try again.');
    };
    try {
      if (segments.some(part => /^\[beep\]$/i.test(part))) {
        // Create/resume on the Play gesture, not later inside a speech callback.
        const context = new AudioContext();
        contextRef.current = context;
        await context.resume();
        if (run !== generation.current) return;
      }
      const next = (index: number) => {
        if (run !== generation.current) return;
        const segment = segments[index];
        if (!segment) {
          cancelPlayback();
          setSpeaking(false);
          return;
        }
        try {
          if (/^\[beep\]$/i.test(segment)) {
            const context = contextRef.current;
            if (!context || context.state !== 'running') { fail(); return; }
            const tone = context.createOscillator();
            const gain = context.createGain();
            tone.frequency.value = 1000;
            gain.gain.setValueAtTime(0, context.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.01);
            gain.gain.setValueAtTime(0.12, context.currentTime + 0.3);
            gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.35);
            tone.connect(gain);
            gain.connect(context.destination);
            tone.onended = () => {
              tone.disconnect();
              gain.disconnect();
              next(index + 1);
            };
            tone.start();
            tone.stop(context.currentTime + 0.35);
            return;
          }
          const utterance = new SpeechSynthesisUtterance(segment.trim());
          const voices = window.speechSynthesis.getVoices();
          const english = voices.find(voice => voice.lang.startsWith('en-GB')) ??
            voices.find(voice => voice.lang.startsWith('en'));
          if (english) utterance.voice = english;
          utterance.lang = english?.lang ?? 'en-GB';
          utterance.rate = 0.95;
          utterance.onend = () => next(index + 1);
          utterance.onerror = fail;
          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        } catch { fail(); }
      };
      next(0);
    } catch { fail(); }
  }, [script, cancelPlayback]);

  if (audioUrl) {
    return (
      <div className="p-4 rounded-xl bg-background border border-border space-y-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Volume2 className="w-4 h-4 text-primary" /> Audio
        </span>
        <audio controls src={audioUrl} className="w-full">
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  if (!script) return null;

  // A missing speech API is different from voices still loading.
  if (!canSpeak) {
    return (
      <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Volume2 className="w-4 h-4 text-muted-foreground" /> Transcript
        </span>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Your browser does not support text-to-speech. Try a browser with speech playback enabled.
        </p>
        {allowTranscript && <p className="text-xs text-foreground italic leading-relaxed">&ldquo;{script}&rdquo;</p>}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-background border border-border space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Volume2 className="w-4 h-4 text-primary" /> Listen
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Synthesised voice
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={speaking ? stop : speak}
          size="sm"
          variant={speaking ? 'destructive' : 'default'}
          className="font-bold gap-1.5"
          aria-label={speaking ? `Stop reading ${title}` : `Play ${title}`}
        >
          {speaking ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{speaking ? 'Stop' : 'Play audio'}</span>
        </Button>

        {allowTranscript && <Button
          type="button"
          onClick={() => setShowTranscript(open => !open)}
          size="sm"
          variant="ghost"
          className="font-bold gap-1.5 text-muted-foreground"
        >
          {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showTranscript ? 'Hide transcript' : 'Show transcript'}</span>
        </Button>}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        This question has no exam recording, so your browser reads the script aloud. A synthetic
        voice is clearer and flatter than the real thing — treat it as practice for the task, not
        as a measure of how well you cope with the exam&apos;s accents and pace.
      </p>

      {/* Collapsed by default: reading along while it plays turns a listening
          task into a reading one. */}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {allowTranscript && showTranscript && (
        <p className="text-xs text-foreground italic leading-relaxed border-t border-border pt-2">
          &ldquo;{script}&rdquo;
        </p>
      )}
    </div>
  );
}

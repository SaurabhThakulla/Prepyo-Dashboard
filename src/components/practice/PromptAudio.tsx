'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromptAudioProps {
  /** A real recording, when the question has one. Always preferred. */
  audioUrl?: string;
  /** The script. Used for synthesis and, on request, shown as text. */
  audioTranscript?: string;
  title: string;
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
export default function PromptAudio({ audioUrl, audioTranscript, title }: PromptAudioProps) {
  const [canSpeak, setCanSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const script = audioTranscript?.trim();

  /**
   * Voices load asynchronously in Chrome: the first getVoices() returns an
   * empty list and the real one arrives with voiceschanged. Checking only once
   * would hide the player from every learner who loads the page cold.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const check = () => setCanSpeak(window.speechSynthesis.getVoices().length > 0);
    check();
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check);
  }, []);

  // Synthesis is global to the tab, so leaving the page mid-sentence would keep
  // talking over whatever the learner opened next.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!script) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(script);
    // Exam audio is English; picking the voice explicitly stops a browser set to
    // another UI language from reading the passage in that accent.
    const english = window.speechSynthesis
      .getVoices()
      .find(voice => voice.lang.startsWith('en-GB')) ??
      window.speechSynthesis.getVoices().find(voice => voice.lang.startsWith('en'));
    if (english) utterance.voice = english;
    utterance.lang = english?.lang ?? 'en-GB';
    // Slightly under natural pace: exam recordings are deliberate, and the
    // default rate runs fast for a listener working in a second language.
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    // Held deliberately. Chrome and Safari collect an utterance that nothing
    // references, which cuts long passages off part-way through with no error.
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [script]);

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

  // No voices installed — a headless browser, or a stripped Linux build. The
  // script is all there is, so it is shown as it was before.
  if (!canSpeak) {
    return (
      <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Volume2 className="w-4 h-4 text-muted-foreground" /> Transcript
        </span>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          There is no recording for this question and your browser has no voices installed,
          so the script is shown instead.
        </p>
        <p className="text-xs text-foreground italic leading-relaxed">&ldquo;{script}&rdquo;</p>
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
          onClick={speaking ? stop : speak}
          size="sm"
          variant={speaking ? 'destructive' : 'default'}
          className="font-bold gap-1.5"
          aria-label={speaking ? `Stop reading ${title}` : `Play ${title}`}
        >
          {speaking ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{speaking ? 'Stop' : 'Play audio'}</span>
        </Button>

        <Button
          onClick={() => setShowTranscript(open => !open)}
          size="sm"
          variant="ghost"
          className="font-bold gap-1.5 text-muted-foreground"
        >
          {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showTranscript ? 'Hide transcript' : 'Show transcript'}</span>
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        This question has no exam recording, so your browser reads the script aloud. A synthetic
        voice is clearer and flatter than the real thing — treat it as practice for the task, not
        as a measure of how well you cope with the exam&apos;s accents and pace.
      </p>

      {/* Collapsed by default: reading along while it plays turns a listening
          task into a reading one. */}
      {showTranscript && (
        <p className="text-xs text-foreground italic leading-relaxed border-t border-border pt-2">
          &ldquo;{script}&rdquo;
        </p>
      )}
    </div>
  );
}

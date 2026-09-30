import React, { useMemo, useState } from 'react';
import { BookOpen, Headphones, Lightbulb, ListOrdered } from 'lucide-react';
import type { ChoiceExercise, MatchExercise, TaskIntroExercise, TeachExercise } from '@/data/learnKorean/types';
import { getTaskMetadata } from '@/lib/taskMetadata';
import { taskInstruction } from '@/lib/syllabus';
import { KoreanVoice } from '@/lib/learn/speakKorean';
import SpeakButton from './SpeakButton';

/** Draws `[part]` underlined, the way EPS-TOPIK marks the part a question asks about. */
export function Marked({ text }: { text: string }) {
  const parts = text.split(/\[(.+?)\]/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="underline decoration-2 underline-offset-4 decoration-amber-500">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

const hasHangul = (text: string) => /[가-힣ㄱ-ㅣ]/.test(text);

/** Shows a new letter, word or phrase: big Korean, its sound, its meaning. */
export function TeachCard({ ex, voice }: { ex: TeachExercise; voice: KoreanVoice }) {
  return (
    <div className="space-y-6">
      <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">New word</p>
      <div className="rounded-3xl border-2 border-border bg-card p-6 sm:p-8 text-center space-y-4 shadow-sm">
        {ex.picture && <div className="text-6xl sm:text-7xl leading-none" aria-hidden>{ex.picture}</div>}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span lang="ko" className="font-display text-4xl sm:text-5xl font-bold text-foreground break-keep">
            {ex.ko}
          </span>
          <SpeakButton text={ex.speak ?? ex.ko} voice={voice} autoPlay />
        </div>
        <p className="text-base font-semibold text-sky-700 dark:text-sky-300">{ex.roman}</p>
        <p className="text-lg text-foreground">{ex.en}</p>
      </div>
      {ex.note && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 text-sm text-amber-900 dark:text-amber-100">
          <Lightbulb className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="leading-relaxed">{ex.note}</p>
        </div>
      )}
    </div>
  );
}

interface ChoiceProps {
  ex: ChoiceExercise;
  voice: KoreanVoice;
  selected: number | null;
  checked: boolean;
  onSelect: (index: number) => void;
}

/** One question, a few options, one right answer. */
export function ChoiceCard({ ex, voice, selected, checked, onSelect }: ChoiceProps) {
  // Without a Korean voice a listening question could not be answered, so its
  // Korean is shown instead.
  const showKo = ex.ko ?? (ex.speak && (!ex.listenOnly || checked || voice === 'none') ? ex.speak : undefined);
  // The options are written with the answer anywhere, often first; shown in a
  // fresh order each time so the position gives nothing away. Selection is
  // still by the option's own index.
  const order = useMemo(() => shuffle(ex.options.map((_, i) => i)), [ex]);
  const tileState = (i: number) => {
    if (!checked) return selected === i ? 'selected' : 'idle';
    if (i === ex.answer) return 'right';
    return selected === i ? 'wrong' : 'idle';
  };
  const tileClass: Record<string, string> = {
    idle: 'border-border bg-card hover:bg-muted/60',
    selected: 'border-sky-400 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100',
    right: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100',
    wrong: 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100',
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">{ex.prompt}</h2>

      <div className="flex items-center gap-4 flex-wrap">
        {ex.speak && <SpeakButton text={ex.speak} voice={voice} size={ex.listenOnly ? 'lg' : 'sm'} autoPlay />}
        {ex.picture && <div className="text-7xl leading-none" aria-hidden>{ex.picture}</div>}
        {showKo &&
          (ex.sign ? (
            <div lang="ko" className="rounded-xl border-4 border-rose-600 bg-white px-6 py-3 font-display text-3xl font-black text-rose-600 shadow-md">
              {showKo}
            </div>
          ) : (
            <p lang="ko" className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-snug break-keep">
              <Marked text={showKo} />
            </p>
          ))}
      </div>
      {ex.listenOnly && voice === 'none' && !checked && (
        <p className="text-xs text-muted-foreground">No Korean voice on this device, so the words are shown instead.</p>
      )}

      <div className={ex.pictureOptions ? 'grid grid-cols-2 gap-3' : 'grid gap-3'}>
        {order.map(i => [ex.options[i], i] as const).map(([option, i]) => (
          <button
            key={i}
            type="button"
            disabled={checked}
            onClick={() => onSelect(i)}
            lang={hasHangul(option) ? 'ko' : undefined}
            aria-label={
              ex.pictureOptions
                ? `Picture ${order.indexOf(i) + 1}: ${option}`
                : option.includes('[')
                  ? `${option.replace(/[[\]]/g, '')} (underlined: ${option.match(/\[(.+?)\]/)?.[1]})`
                  : undefined
            }
            className={`rounded-2xl border-2 border-b-4 px-4 text-left font-semibold transition-colors active:translate-y-0.5 disabled:active:translate-y-0 ${
              ex.pictureOptions ? 'py-6 text-center text-5xl' : 'py-3.5 text-base break-keep'
            } ${tileClass[tileState(i)]}`}
          >
            {ex.pictureOptions ? option : <Marked text={option} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Tap an item on the left, then its partner on the right. A wrong pair flashes
 * and counts as a mistake; the exercise is done when every pair is found.
 */
export function MatchCard({ ex, onDone }: { ex: MatchExercise; onDone: (mistakes: number) => void }) {
  // The right-hand column is shuffled once, so the answer is not straight across.
  const right = useMemo(() => shuffle(ex.pairs.map(([, r]) => r)), [ex]);
  const [picked, setPicked] = useState<number | null>(null);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<{ left: number; right: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const pickRight = (value: string) => {
    if (picked === null) return;
    if (ex.pairs[picked][1] === value) {
      const next = new Set(found).add(picked);
      setFound(next);
      setPicked(null);
      if (next.size === ex.pairs.length) onDone(mistakes);
    } else {
      setMistakes(m => m + 1);
      setWrong({ left: picked, right: value });
      setTimeout(() => setWrong(null), 600);
      setPicked(null);
    }
  };

  const base = 'rounded-2xl border-2 border-b-4 px-3 py-3.5 text-base font-semibold transition-colors break-keep';
  const doneRight = new Set([...found].map(i => ex.pairs[i][1]));

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">{ex.prompt}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-3">
          {ex.pairs.map(([left], i) => (
            <button
              key={left}
              type="button"
              lang={hasHangul(left) ? 'ko' : undefined}
              disabled={found.has(i)}
              onClick={() => setPicked(i)}
              className={`${base} ${
                found.has(i)
                  ? 'border-border bg-muted/40 text-muted-foreground/50'
                  : wrong?.left === i
                    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40'
                    : picked === i
                      ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/40'
                      : 'border-border bg-card hover:bg-muted/60'
              }`}
            >
              {left}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {right.map(value => (
            <button
              key={value}
              type="button"
              lang={hasHangul(value) ? 'ko' : undefined}
              disabled={doneRight.has(value)}
              onClick={() => pickRight(value)}
              className={`${base} ${
                doneRight.has(value)
                  ? 'border-border bg-muted/40 text-muted-foreground/50'
                  : wrong?.right === value
                    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40'
                    : 'border-border bg-card hover:bg-muted/60'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Tap a word on the left, then its match on the right.</p>
    </div>
  );
}

/** A random order that is never the written one, so nothing lines up by position. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.length > 1 && copy.every((item, i) => item === items[i]) ? [...copy.slice(1), copy[0]] : copy;
}

/**
 * What an EPS-TOPIK task is. Its name, Korean instruction and place in the test
 * come from the same syllabus and task metadata the practice pages use.
 */
export function TaskIntroCard({
  ex,
  practice,
  voice,
}: {
  ex: TaskIntroExercise;
  practice: { code: string; skill: 'reading' | 'listening'; typeKey: string };
  voice: KoreanVoice;
}) {
  const meta = getTaskMetadata('EPS_TOPIK', practice.skill, practice.typeKey);
  const instruction = taskInstruction('EPS_TOPIK', practice.skill, practice.typeKey);
  const listening = practice.skill === 'listening';
  const SkillIcon = listening ? Headphones : BookOpen;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl font-display text-lg font-black ${meta.color}`}>
          {practice.code}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">{meta.name}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SkillIcon className="h-3.5 w-3.5" />
            {listening ? 'Listening' : 'Reading'} · {meta.scoreWeight}
          </p>
        </div>
      </div>

      <p className="text-base text-foreground leading-relaxed">{ex.what}</p>

      {instruction && (
        <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">The instruction you will see</p>
          <div className="flex items-start gap-3">
            <p lang="ko" className="flex-1 text-lg font-semibold text-foreground break-keep">{instruction}</p>
            <SpeakButton text={instruction} voice={voice} />
          </div>
          <p className="text-sm text-sky-700 dark:text-sky-300">{ex.instructionEn}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ex.keyWords.map(([ko, en]) => (
              <span key={ko} className="rounded-lg bg-muted px-2 py-1 text-xs">
                <span lang="ko" className="font-semibold text-foreground">{ko}</span>
                <span className="text-muted-foreground"> = {en}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <ListOrdered className="h-3.5 w-3.5" /> How to answer
        </p>
        <ol className="space-y-1.5 text-sm text-foreground">
          {ex.howTo.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">{i + 1}</span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 text-sm text-amber-900 dark:text-amber-100">
        <Lightbulb className="h-5 w-5 shrink-0 text-amber-500" />
        <p className="leading-relaxed">
          {ex.tip}
          {listening && ' In the test every recording plays twice.'}
        </p>
      </div>
    </div>
  );
}

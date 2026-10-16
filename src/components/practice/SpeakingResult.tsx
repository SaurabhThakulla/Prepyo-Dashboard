import { useEffect, useState } from 'react';
import { Lightbulb, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Evaluation, WordMark } from '@/lib/types';

interface Props {
  evaluation: Evaluation;
  xpAwarded: number;
  recording: Blob | null;
}

/** A spoken answer's result: trait table, the recording, and the text marked word by word. */
export default function SpeakingResult({ evaluation, xpAwarded, recording }: Props) {
  const recordingUrl = useObjectUrl(recording);
  const criteria = evaluation.criteria ?? [];
  const words = evaluation.words ?? [];
  const weaknesses = evaluation.weaknesses ?? [];
  const max = evaluation.exam === 'IELTS' ? 9 : 90;

  return (
    <div className="space-y-5">
      {evaluation.summary && <p className="text-xs leading-relaxed text-muted-foreground">{evaluation.summary}</p>}

      {criteria.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border text-sm">
          <table className="w-full border-collapse">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold sm:px-4">Component</th>
                <th className="px-3 py-2.5 font-semibold sm:px-4">Score</th>
                <th className="px-3 py-2.5 font-semibold sm:px-4">Suggestion</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map(c => (
                <tr key={c.name} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-3 font-medium sm:px-4">{c.name}</td>
                  <td className={cn('whitespace-nowrap px-3 py-3 tabular-nums font-semibold sm:px-4', partColour(c.score, c.maxScore))}>
                    {c.score}/{c.maxScore}
                  </td>
                  <td className="px-3 py-3 text-xs leading-relaxed text-muted-foreground sm:px-4">{c.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted/30 px-3 py-3 sm:px-4">
            <span className="text-sm">
              Max score: {max}, your score:{' '}
              <span className="font-display text-lg font-semibold text-rose-600 dark:text-rose-400">{evaluation.estimatedScore ?? '—'}</span>
            </span>
            {xpAwarded > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                <Zap className="h-3 w-3" aria-hidden /> +{xpAwarded} XP
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">A practice estimate, not an official result.</span>
          </div>
        </div>
      )}

      {recordingUrl && <audio controls src={recordingUrl} className="h-10 w-full max-w-sm" />}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Speech recognition:</span>
          {words.length > 0 && (
            <span className="flex items-center gap-3">
              <Legend className="bg-emerald-500">Good</Legend>
              {words.some(w => w.unclear) && <Legend className="bg-amber-500">Unclear</Legend>}
              <Legend className="bg-rose-500">Missed or changed</Legend>
              <span>/ Pause</span>
            </span>
          )}
        </div>
        {words.length > 0 ? (
          <p className="text-base leading-loose" data-testid="marked-passage">
            {words.map((w, i) => (
              <span key={i}>
                <span className={wordColour(w)}>
                  {w.text}
                </span>
                {w.pauseAfter && <span className="text-muted-foreground"> /</span>}{' '}
              </span>
            ))}
          </p>
        ) : (
          <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm italic leading-relaxed">
            {evaluation.transcript || 'No speech could be made out in that recording.'}
          </p>
        )}
      </div>

      {weaknesses.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Work on next
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {weaknesses.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-2.5 w-2.5 rounded-full', className)} aria-hidden /> {children}
    </span>
  );
}

function wordColour(w: WordMark) {
  if (!w.said) return 'text-rose-600 underline decoration-dotted dark:text-rose-400';
  if (w.unclear) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function partColour(score: number, max: number) {
  const part = max > 0 ? score / max : 0;
  if (part >= 0.75) return 'text-emerald-600 dark:text-emerald-400';
  if (part >= 0.45) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob || typeof URL.createObjectURL !== 'function') return setUrl(null);
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

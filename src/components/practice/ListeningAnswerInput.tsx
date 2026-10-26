import React, { useId } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Question } from '@/lib/types';
import { isWordHighlightTask, listeningTextTask } from '@/lib/listening';
import { writingWordCount } from '@/lib/writing';
import { answerMark, WORD_MARK_CLASS } from '@/lib/answerMarks';
import { cn } from '@/lib/utils';
import { FileText, Keyboard } from 'lucide-react';

type WordBand = 'none' | 'good' | 'near' | 'off';
const WORD_PILL: Record<WordBand, string> = {
  none: 'bg-muted text-muted-foreground',
  good: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  near: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  off: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
};
const WORD_BAR: Record<WordBand, string> = { none: 'bg-muted-foreground/30', good: 'bg-emerald-500', near: 'bg-amber-500', off: 'bg-rose-500' };

interface Props {
  question: Question;
  textAnswer: string;
  onTextChange: (text: string) => void;
  selectedOptions: string[];
  /** The answer key once marked; null before. */
  correctAnswers?: string[] | null;
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

export default function ListeningAnswerInput({
  question, textAnswer, onTextChange, selectedOptions, onSelectionChange, disabled = false, correctAnswers = null,
}: Props) {
  const id = useId();
  const task = listeningTextTask(question);
  if (task) {
    const summary = task === 'summary';
    const words = writingWordCount(textAnswer);
    // Summarize Spoken Text's Form bands: 50-70 full marks, 40-100 partial.
    const band = !summary || words === 0 ? 'none' : words >= 50 && words <= 70 ? 'good' : words >= 40 && words <= 100 ? 'near' : 'off';
    return (
      <div className="space-y-2 pt-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
          <div className="flex items-center gap-2.5 border-b border-border bg-muted/40 px-4 py-2.5">
            <label htmlFor={id} className="flex items-center gap-2 text-sm font-bold text-foreground">
              {summary ? <FileText className="h-4 w-4 text-primary" aria-hidden /> : <Keyboard className="h-4 w-4 text-primary" aria-hidden />}
              {summary ? 'Your summary' : 'Your dictation'}
            </label>
            <span aria-live="polite" className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums', WORD_PILL[band])}>
              {summary ? `${words} / 50–70 words` : `${words} words`}
            </span>
          </div>
          <Textarea
            id={id}
            aria-describedby={`${id}-hint`}
            rows={summary ? 7 : 3}
            value={textAnswer}
            onChange={event => onTextChange(event.target.value)}
            disabled={disabled}
            // The test has no spell checker, so practice has none either.
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            placeholder={summary ? 'Summarise the lecture in your own words…' : 'Type the sentence exactly as you hear it…'}
            className="min-h-0 resize-y rounded-none border-0 bg-transparent px-4 py-3.5 text-[15px] leading-7 text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {summary && (
            <div className="h-1 bg-muted" aria-hidden>
              <div className={cn('h-full transition-[width] duration-300', WORD_BAR[band])} style={{ width: `${Math.min(100, (words / 70) * 100)}%` }} />
            </div>
          )}
        </div>
        <p id={`${id}-hint`} className="px-1 text-xs text-muted-foreground">
          {summary ? 'Aim for 50–70 words. Include the main idea and key supporting details.' : 'Include every word you hear, in the same order. Check spelling before submitting.'}
        </p>
      </div>
    );
  }
  if (!isWordHighlightTask(question)) return null;
  return (
    <section aria-labelledby={id} className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={id} className="text-sm font-bold">Highlight incorrect words</h4>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" aria-live="polite">{selectedOptions.length} selected</span>
          <Button type="button" variant="ghost" size="sm" disabled={disabled || selectedOptions.length === 0} onClick={() => onSelectionChange([])}>Clear selection</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Tap or click each word that differs from the audio. Select it again to undo. You can also use Tab and Space or Enter.</p>
      <div className="rounded-xl border border-border bg-background p-4 sm:p-5 text-base leading-loose">
        {question.options?.map((option, index) => {
          const selected = selectedOptions.includes(option.id);
          const mark = answerMark(option.id, selected, correctAnswers);
          return (
            <React.Fragment key={option.id}>
              <button
                type="button"
                aria-label={`${option.text} (word ${index + 1})`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onSelectionChange(selected ? selectedOptions.filter(value => value !== option.id) : [...selectedOptions, option.id])}
                className={`inline rounded px-1 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed ${correctAnswers ? WORD_MARK_CLASS[mark] : selected ? 'bg-primary text-primary-foreground underline decoration-2 underline-offset-4' : 'text-foreground hover:bg-primary/10'}`}
              >{option.text}</button>{' '}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}

import React, { useId } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Question } from '@/lib/types';
import { isWordHighlightTask, listeningTextTask } from '@/lib/listening';
import { writingWordCount } from '@/lib/writing';

interface Props {
  question: Question;
  textAnswer: string;
  onTextChange: (text: string) => void;
  selectedOptions: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

export default function ListeningAnswerInput({
  question, textAnswer, onTextChange, selectedOptions, onSelectionChange, disabled = false,
}: Props) {
  const id = useId();
  const task = listeningTextTask(question);
  if (task) {
    const summary = task === 'summary';
    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <label htmlFor={id} className="font-bold">{summary ? 'Your summary' : 'Your dictation'}</label>
          <span className="text-xs text-muted-foreground" aria-live="polite">{writingWordCount(textAnswer)} words</span>
        </div>
        <Textarea
          id={id}
          aria-describedby={`${id}-hint`}
          rows={summary ? 6 : 3}
          value={textAnswer}
          onChange={event => onTextChange(event.target.value)}
          disabled={disabled}
          placeholder={summary ? 'Summarise the lecture in your own words…' : 'Type the sentence exactly as you hear it…'}
          className="text-sm leading-relaxed"
        />
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
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
          return (
            <React.Fragment key={option.id}>
              <button
                type="button"
                aria-label={`${option.text} (word ${index + 1})`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onSelectionChange(selected ? selectedOptions.filter(value => value !== option.id) : [...selectedOptions, option.id])}
                className={`inline rounded px-1 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed ${selected ? 'bg-primary text-primary-foreground underline decoration-2 underline-offset-4' : 'text-foreground hover:bg-primary/10'}`}
              >{option.text}</button>{' '}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}

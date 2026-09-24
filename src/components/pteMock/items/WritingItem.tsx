import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { writingWordCount } from '@/lib/writing';
import { ItemHandle, ItemProps } from './types';

/** How long typing must pause before the draft is saved. */
const DRAFT_DELAY_MS = 4000;

/**
 * Summarize Written Text and Write Essay. The test's writing box: no spelling
 * or grammar help from the browser, a running word count, and the text saved
 * as a draft while the learner types, so that if the clock runs out what they
 * had written is what is marked.
 */
const WritingItem = forwardRef<ItemHandle, ItemProps>(function WritingItem({ item, onDraft }, ref) {
  const { task, question } = item;
  const [text, setText] = useState(item.draft?.textResponse ?? '');
  const textRef = useRef(text);
  textRef.current = text;
  const words = writingWordCount(text);

  useEffect(() => {
    if (text === (item.draft?.textResponse ?? '')) return;
    const timer = setTimeout(() => onDraft({ questionId: question.id, textResponse: text }), DRAFT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, onDraft, question.id, item.draft?.textResponse]);

  useImperativeHandle(ref, () => ({
    hasAnswer: () => textRef.current.trim().length > 0,
    collect: async () => ({ response: { questionId: question.id, textResponse: textRef.current } }),
  }));

  const outOfRange = words > 0 && task.minWords != null && task.maxWords != null && (words < task.minWords || words > task.maxWords);
  const isEssay = task.code === 'WE';

  return (
    <div className="space-y-4">
      {question.contextPassage ? (
        <div className="rounded-xl border border-border bg-background p-5 text-sm leading-7 text-foreground whitespace-pre-line max-h-[40vh] overflow-y-auto">
          {question.contextPassage}
        </div>
      ) : null}
      {question.prompt && (
        <div className={isEssay ? 'rounded-xl border border-primary/20 bg-primary/5 p-4' : ''}>
          <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-line">{question.prompt}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <textarea
          aria-label="Your response"
          value={text}
          onChange={event => setText(event.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          rows={isEssay ? 14 : 5}
          className="w-full rounded-xl border border-input bg-card p-4 text-sm leading-7 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        />
        <div className="flex items-center justify-between text-xs">
          <span className={`font-semibold ${outOfRange ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} aria-live="polite">
            Total Word Count: {words}
          </span>
          {task.minWords != null && task.maxWords != null && (
            <span className="text-muted-foreground">
              {isEssay ? '200–300 words recommended' : 'One sentence'} · scored zero outside {task.minWords}–{task.maxWords} words
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default WritingItem;

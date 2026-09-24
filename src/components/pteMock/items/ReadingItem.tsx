import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { rendererFor } from '@/components/reading/renderers';
import { passageHasGaps } from '@/components/practice/InlineBlankPassage';
import { AnswerSubmission, ReadingParagraph } from '@/lib/types';
import { ItemHandle, ItemProps } from './types';

const DRAFT_DELAY_MS = 1500;

/** Whether an answer carries anything. */
export function hasResponse(answer: Partial<AnswerSubmission> | undefined): boolean {
  if (!answer) return false;
  if (answer.textResponse?.trim() || (answer.selectedOptions?.length ?? 0) > 0) return true;
  return Object.values(answer.blankResponses ?? {}).some(v => v.trim() !== '');
}

/**
 * A reading item, drawn by the same answer controls as reading practice (the
 * renderer registry), so the test and practice can never disagree about how a
 * task works. Multiple-choice items sit beside their passage, as on the test
 * screen; the gap-fills carry their own text.
 */
const ReadingItem = forwardRef<ItemHandle, ItemProps>(function ReadingItem({ item, onDraft }, ref) {
  const { question, passage } = item;
  const [answer, setAnswer] = useState<Partial<AnswerSubmission>>(item.draft ?? {});
  const answerRef = useRef(answer);
  answerRef.current = answer;
  const dirty = useRef(false);

  // Reading: Fill in the Blanks draws from one pool of words. A set brings it
  // as its resources; a standalone item has only its gaps' options to pool.
  const resources = useMemo<ReadingParagraph[] | undefined>(() => {
    if (item.resources?.length) return item.resources;
    if (item.task.code !== 'RFIB') return undefined;
    const words = Array.from(new Set((question.blanks ?? []).flatMap(b => b.options ?? [])));
    return words.map(word => ({ label: word, text: word }));
  }, [item.resources, item.task.code, question.blanks]);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => onDraft({ ...answerRef.current, questionId: question.id }), DRAFT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [answer, onDraft, question.id]);

  useImperativeHandle(ref, () => ({
    hasAnswer: () => hasResponse(answerRef.current),
    collect: async () => ({ response: { ...answerRef.current, questionId: question.id } }),
  }));

  const Renderer = rendererFor(question.typeId);
  // A gap-fill's text is the answer control itself. Any other text on the
  // question is what it asks about, and is shown as the passage.
  const gapped = passageHasGaps(question.contextPassage);
  const text = passage
    ? passage.paragraphs.map(p => p.text)
    : question.contextPassage && !gapped
      ? question.contextPassage.split(/\n\s*\n/)
      : null;
  const control = (
    <div className="space-y-4">
      {question.prompt && !gapped && (
        <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-line">{question.prompt}</p>
      )}
      <Renderer
        question={question}
        answer={{ questionId: question.id, ...answer }}
        locked={false}
        resources={resources}
        onChange={patch => {
          dirty.current = true;
          setAnswer(previous => ({ ...previous, ...patch }));
        }}
      />
    </div>
  );

  if (!text) return control;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <article className="rounded-xl border border-border bg-background p-5 max-h-[55vh] overflow-y-auto space-y-3">
        {passage?.title && <h3 className="font-display text-sm font-bold text-foreground">{passage.title}</h3>}
        {text.map((paragraph, i) => (
          <p key={i} className="text-sm leading-7 text-foreground">{paragraph}</p>
        ))}
      </article>
      {control}
    </div>
  );
});

export default ReadingItem;

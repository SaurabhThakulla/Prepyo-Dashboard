import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MockAnswerInput from '@/components/mocks/MockAnswerInput';
import InlineBlankPassage, { passageHasGaps } from '@/components/practice/InlineBlankPassage';
import { AnswerSubmission } from '@/lib/types';
import { isWordHighlightTask } from '@/lib/listening';
import { AudioStatusPanel } from './StatusPanels';
import { hasResponse } from './ReadingItem';
import { usePromptPlayback } from './usePromptPlayback';
import { ItemHandle, ItemProps } from './types';

const DRAFT_DELAY_MS = 1500;

/**
 * A listening item. The recording plays once after its countdown, with the
 * answer controls on screen throughout, as in the test: learners may choose,
 * type and click while they listen.
 */
const ListeningItem = forwardRef<ItemHandle, ItemProps>(function ListeningItem({ item, onDraft, sessionId }, ref) {
  const { question, task } = item;
  const [answer, setAnswer] = useState<Partial<AnswerSubmission>>(item.draft ?? {});
  const answerRef = useRef(answer);
  answerRef.current = answer;
  const dirty = useRef(false);
  const playback = usePromptPlayback(question, task.audioDelaySeconds ?? 7, undefined, `${sessionId}:${item.position}`);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => onDraft({ ...answerRef.current, questionId: question.id }), DRAFT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [answer, onDraft, question.id]);

  useImperativeHandle(ref, () => ({
    hasAnswer: () => hasResponse(answerRef.current),
    collect: async () => {
      playback.stop();
      return { response: { ...answerRef.current, questionId: question.id } };
    },
  }), [playback, question.id]);

  const change = (patch: Partial<AnswerSubmission>) => {
    dirty.current = true;
    setAnswer(previous => ({ ...previous, ...patch }));
  };

  const inlineGaps = Boolean(question.contextPassage && passageHasGaps(question.contextPassage));
  return (
    <div className="space-y-5">
      <AudioStatusPanel phase={playback.phase} countdown={playback.countdown} progress={playback.progress} />

      {question.prompt && (
        <p className="text-base font-semibold text-foreground leading-relaxed whitespace-pre-line">{question.prompt}</p>
      )}

      {inlineGaps && (
        <InlineBlankPassage
          passage={question.contextPassage!}
          blanks={question.blanks}
          responses={answer.blankResponses ?? {}}
          onChange={blankResponses => change({ blankResponses })}
          className="max-h-none"
        />
      )}
      {question.contextPassage && !inlineGaps && !isWordHighlightTask(question) && (
        <div className="rounded-xl bg-muted/40 p-4 sm:p-5 text-[15px] leading-7 text-foreground whitespace-pre-line">
          {question.contextPassage}
        </div>
      )}

      <MockAnswerInput question={question} answer={{ questionId: question.id, ...answer }} onChange={change} />
    </div>
  );
});

export default ListeningItem;

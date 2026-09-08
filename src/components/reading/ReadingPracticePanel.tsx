import React, { useEffect } from 'react';
import { AlertCircle, Bot, CheckCircle2, RefreshCw, Send, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useReadingPractice, useReadingTypes } from '@/lib/hooks/useReading';
import PassageReader from '@/components/reading/PassageReader';
import ReadingGroupCard from '@/components/reading/ReadingGroupCard';
import { READING_TYPES, TYPE_BY_SYLLABUS_KEY, needsParagraphLabels, isReadingMultipleChoice } from '@/lib/readingTypes';
import { ReadingTaskType } from '@/lib/types';
import { PracticePageSkeleton, ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';

interface ReadingPracticePanelProps {
  /** The `?type=` key the sidebar linked with, if any. */
  initialTypeKey?: string;
}

function EmptyState({
  message,
  onRetry,
  types = [],
  onPick,
}: {
  message: string;
  onRetry?: () => void;
  types?: ReadingTaskType[];
  onPick?: (typeId: string) => void;
}) {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card/20">
      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
      <h3 className="text-sm font-bold text-foreground">{message}</h3>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 mt-2">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </Button>
      )}
      {onPick && types.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-lg">
          {types.map(type => (
            <Button
              key={type.typeId}
              variant="ghost"
              size="sm"
              onClick={() => onPick(type.typeId)}
              className="text-xs font-bold rounded-lg h-8"
            >
              {type.typeName}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Reading practice: IELTS-style split-pane screen.
 * Left pane: Reading passage with centered title and continuous natural paragraphs.
 * Right pane: Question notes completion card with inline inputs and circled numbers.
 */
export default function ReadingPracticePanel({ initialTypeKey }: ReadingPracticePanelProps) {
  const { activeExam, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const toast = useToast();

  const typesQuery = useReadingTypes(activeExam);
  const types = typesQuery.data?.types ?? [];

  const practice = useReadingPractice(activeExam);
  const { set, deal } = practice;

  const currentTypeId = set?.groups[0]?.typeId;

  useEffect(() => {
    if (typesQuery.error) toast.error('Could not load reading tasks', errorMessage(typesQuery.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesQuery.error]);

  // Open on the type the sidebar linked to, or the first one with questions.
  useEffect(() => {
    if (types.length === 0) return;
    const linked = initialTypeKey ? TYPE_BY_SYLLABUS_KEY[initialTypeKey] : undefined;
    const wanted = (linked ? types.find(type => type.typeId === linked) : undefined) ?? (set ? undefined : types[0]);
    if (wanted && wanted.typeId !== currentTypeId) {
      void deal(wanted.typeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, initialTypeKey, activeExam]);

  const askTutor = () => {
    if (!set) return;
    const group = set.groups[0];
    const subject = set.passage
      ? `Reading passage: ${set.passage.title}`
      : `Reading task: ${group?.typeName}`;
    setTutorContextPrompt(
      `${subject}\nTask type: ${group?.typeName}\nInstructions: ${group?.instructions}`,
    );
    setIsTutorOpen(true);
  };

  const linked = initialTypeKey ? TYPE_BY_SYLLABUS_KEY[initialTypeKey] : undefined;
  const targetTypeId = linked ?? currentTypeId ?? types[0]?.typeId;
  const isMCQ =
    isReadingMultipleChoice(initialTypeKey) ||
    isReadingMultipleChoice(targetTypeId) ||
    isReadingMultipleChoice(set?.groups[0]?.typeName);

  const skeleton = isMCQ ? <ReadingPracticeSkeleton /> : <PracticePageSkeleton />;

  if (typesQuery.isPending) {
    return skeleton;
  }

  if (types.length === 0) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card/20">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">No {activeExam} reading passages yet</h3>
        <p className="text-xs text-muted-foreground">Switch exam, or try another skill.</p>
      </div>
    );
  }

  if (practice.dealing) {
    return skeleton;
  }

  if (!set) {
    // A failed deal is usually a 404 on a type with nothing behind it, so
    // retrying that same type just fails again. Offer the ones that do have
    // questions instead.
    const alternatives = types.filter(
      type => type.questionCount > 0 && type.typeId !== targetTypeId,
    );
    return (
      <EmptyState
        message={practice.dealError ?? 'Pick a task type to begin'}
        onRetry={targetTypeId ? () => void deal(targetTypeId) : undefined}
        types={alternatives}
        onPick={typeId => void deal(typeId)}
      />
    );
  }

  const hasPassage = Boolean(set.passage && set.groups[0]?.passageDisplay !== 'hidden');

  return (
    <div className="w-full h-[calc(100vh-4rem)] p-0 m-0 flex flex-col bg-background overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Compact IELTS Two-Column Split Screen Layout */}
        <div className="flex-1 w-full px-0 py-1 grid grid-cols-1 lg:grid-cols-2 gap-[4px] min-h-0 overflow-hidden">
          {/* Left Pane: Reading Passage (Independent scroll) */}
          {hasPassage && (
            <div className="h-full min-h-0 flex flex-col overflow-hidden">
              <PassageReader
                passage={set.passage!}
                scroll={true}
                passageNumber={1}
                questionRange={`Questions 1–${practice.totalQuestions}`}
                showLabels={set.groups.some(group => needsParagraphLabels(group.typeId))}
              />
            </div>
          )}

          {/* Right Pane: Questions & Answer Cards (Independent scroll) */}
          <div className={`h-full min-h-0 flex flex-col overflow-hidden ${!hasPassage ? 'lg:col-span-2' : ''}`}>
            <div className="flex-1 overflow-y-auto pl-1 pr-1.5 space-y-2 scrollbar-thin">
              {set.groups.map(group => (
                <ReadingGroupCard
                  key={group.id}
                  group={group}
                  startNumber={1}
                  answers={practice.answers}
                  results={practice.results}
                  disabled={practice.checking}
                  onAnswer={practice.answer}
                />
              ))}

              {practice.checked && (
                <Card className="border-primary/40 border-r-0 rounded-r-none rounded-l-lg p-3 space-y-1.5 bg-card/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <CardTitle className="text-sm">
                      {practice.correctCount} of {Object.keys(practice.results).length} correct
                    </CardTitle>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Anything you got wrong is in your Mistakes bank with the explanation.
                  </p>
                </Card>
              )}
            </div>

            {/* Bottom Sticky Action Bar - Compact */}
            <div className="pt-2 mt-1 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-background/90 backdrop-blur-xs py-1.5 px-3">
              <Button variant="outline" size="sm" onClick={askTutor} className="gap-1.5 font-bold text-xs rounded-lg h-8 px-3">
                <Bot className="w-3.5 h-3.5 text-primary" />
                <span>Ask AI Coach</span>
              </Button>

              {practice.checked ? (
                <Button
                  onClick={() => currentTypeId && void deal(currentTypeId)}
                  className="font-bold gap-1.5 text-xs rounded-lg h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Another passage</span>
                </Button>
              ) : (
                <Button
                  onClick={() => void practice.check()}
                  disabled={practice.checking || practice.answeredCount === 0}
                  className="font-bold gap-1.5 text-xs rounded-lg h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                >
                  {practice.checking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking…</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Check answers</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

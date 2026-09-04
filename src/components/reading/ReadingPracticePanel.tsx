import React, { useEffect } from 'react';
import { AlertCircle, BookOpen, Bot, CheckCircle2, RefreshCw, Send, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useReadingPractice, useReadingTypes } from '@/lib/hooks/useReading';
import PassageReader from '@/components/reading/PassageReader';
import ReadingGroupCard from '@/components/reading/ReadingGroupCard';

interface ReadingPracticePanelProps {
  /** The `?type=` key the sidebar linked with, if any. */
  initialTypeKey?: string;
}

/**
 * Sidebar task names to server task types.
 *
 * The syllabus lists eight reading tasks; the server has six types. That is not
 * a mismatch to fix — "Complete the sentences" and "Sentence completions" are
 * the same task appearing twice on a passage, as are the two Yes/No/Not Given
 * sets, so both names resolve to the one type. Keyed by `typeKey`, which is how
 * the sidebar builds its links.
 */
const TYPE_BY_SYLLABUS_KEY: Record<string, string> = {
  completesentences: 'reading-sentence-completion',
  sentencecompletions: 'reading-sentence-completion',
  truefalse: 'reading-true-false',
  findwriter: 'reading-find-the-writer',
  arrangepassage: 'reading-arrange-passage',
  yesnonotgiven: 'reading-yes-no-not-given',
  matchinginformation: 'reading-matching-information',
};

/**
 * Reading practice: choose a task type, get a passage, answer its questions.
 *
 * The passage is chosen by the server, which prefers ones this learner has not
 * read and otherwise the one they read longest ago. So "Deal another passage"
 * rotates through the bank instead of handing back the same text — and the
 * questions inside a set come back in a random order each time.
 */
export default function ReadingPracticePanel({ initialTypeKey }: ReadingPracticePanelProps) {
  const { activeExam, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const toast = useToast();

  const typesQuery = useReadingTypes(activeExam);
  const types = typesQuery.data?.types ?? [];

  const practice = useReadingPractice(activeExam);
  const { set, deal } = practice;

  useEffect(() => {
    if (typesQuery.error) toast.error('Could not load reading tasks', errorMessage(typesQuery.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesQuery.error]);

  // Open on the type the sidebar linked to, or the first one with questions.
  // Runs once the menu arrives, and again if the learner switches exam.
  useEffect(() => {
    if (types.length === 0 || set) return;
    const linked = initialTypeKey ? TYPE_BY_SYLLABUS_KEY[initialTypeKey] : undefined;
    const wanted = types.find(type => type.typeId === linked) ?? types[0];
    void deal(wanted.typeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, initialTypeKey, activeExam]);

  const currentTypeId = set?.groups[0]?.typeId;

  const askTutor = () => {
    if (!set) return;
    const group = set.groups[0];
    setTutorContextPrompt(
      `Reading passage: ${set.passage.title}\nTask type: ${group?.typeName}\nInstructions: ${group?.instructions}`,
    );
    setIsTutorOpen(true);
  };

  if (typesQuery.isPending) {
    return (
      <Card className="text-center py-20 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground">Loading reading tasks…</p>
      </Card>
    );
  }

  if (types.length === 0) {
    return (
      <Card className="text-center py-20 space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">No {activeExam} reading passages yet</h3>
        <p className="text-xs text-muted-foreground">Switch exam, or try another skill.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Task type picker. Counts come from the server so a type with nothing
          behind it reads as empty instead of failing when it is opened. */}
      <div className="flex flex-wrap gap-2">
        {types.map(type => {
          const active = currentTypeId === type.typeId;
          return (
            <button
              key={type.typeId}
              type="button"
              disabled={practice.dealing}
              onClick={() => void deal(type.typeId)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors disabled:opacity-60 ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {type.typeName}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">{type.questionCount}</span>
            </button>
          );
        })}
      </div>

      {practice.dealing ? (
        <Card className="text-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Finding you a passage…</p>
        </Card>
      ) : !set ? (
        <Card className="text-center py-20 space-y-3">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-foreground">Pick a task type to begin</h3>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <PassageReader passage={set.passage} />
          </div>

          <div className="lg:col-span-5 space-y-4">
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
              <Card className="border-primary/40 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <CardTitle className="text-base">
                    {practice.correctCount} of {Object.keys(practice.results).length} correct
                  </CardTitle>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Anything you got wrong is in your Mistakes bank with the explanation.
                </p>
              </Card>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={askTutor} className="gap-1.5 font-bold">
                <Bot className="w-3.5 h-3.5 text-primary" />
                <span>Ask AI Coach</span>
              </Button>

              {practice.checked ? (
                <Button
                  onClick={() => currentTypeId && void deal(currentTypeId)}
                  className="font-bold gap-1.5 shadow-md"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Another passage</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant={practice.answeredCount > 0 ? 'success' : 'outline'}>
                    {practice.answeredCount}/{practice.totalQuestions} answered
                  </Badge>
                  <Button
                    onClick={() => void practice.check()}
                    disabled={practice.checking || practice.answeredCount === 0}
                    className="font-bold gap-1.5 shadow-md"
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

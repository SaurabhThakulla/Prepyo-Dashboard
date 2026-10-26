import React from 'react';
import { Bot, RefreshCw, Send } from 'lucide-react';
import AnswerSelect from '@/components/ui/answer-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AudioRecorder from '@/components/practice/AudioRecorder';
import ListeningAnswerInput from '@/components/practice/ListeningAnswerInput';
import { isWordHighlightTask } from '@/lib/listening';
import { allowsMultipleChoices } from '@/lib/choices';
import { Question } from '@/lib/types';
import { minimumWritingWords, writingLengthNote, writingWordCount, writingWordTarget } from '@/lib/writing';
import { usePracticeSession } from '@/lib/hooks/usePracticeSession';
import { passageHasGaps } from '@/components/practice/InlineBlankPassage';
import OptionContent, { hasPictureOptions } from '@/components/practice/OptionContent';

interface PracticeAnswerFormProps {
  question: Question;
  session: ReturnType<typeof usePracticeSession>;
  onAskAITutor: () => void;
}

/**
 * Where the learner answers. Which controls appear depends on how the skill is
 * graded (recorder for speaking, essay box for writing) plus whatever the
 * question itself carries (options, blanks).
 */
export default function PracticeAnswerForm({
  question,
  session,
  onAskAITutor,
}: PracticeAnswerFormProps) {
  const { grading, submitting, result, canSubmit } = session;
  const wordCount = writingWordCount(session.textAnswer);
  const minWords = minimumWritingWords(question);
  const target = writingWordTarget(question);
  const isMultiple = allowsMultipleChoices(question);

  return (
    <Card className="p-6 space-y-4">
      {grading === 'speech' && (
        <AudioRecorder
          // Remounting per question drops any half-finished take and releases
          // the microphone when the learner moves on.
          key={question.id}
          prepSeconds={Math.max(10, question.prepTimeSeconds ?? 10)}
          maxSeconds={question.timeLimitSeconds}
          disabled={submitting || result !== null}
          onRecorded={session.setRecording}
        />
      )}

      {grading === 'ai' && (
        <div className="space-y-3">
          <span className="block text-sm font-bold text-foreground">Your response</span>
          <Textarea
            rows={8}
            value={session.textAnswer}
            onChange={event => session.setTextAnswer(event.target.value)}
            placeholder="Write your response here…"
            className="border-2 border-primary bg-background px-4 py-3 text-[15px] leading-7 text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <div className="flex items-center justify-between gap-3 text-xs">
            <p className="leading-relaxed text-foreground/75">{writingLengthNote(question)}</p>
            <Badge variant={wordCount >= (target ?? minWords) ? 'success' : 'warning'} className="shrink-0">
              {target ? `${wordCount} / ${target} words` : `${wordCount} words`}
            </Badge>
          </div>
        </div>
      )}

      <ListeningAnswerInput
        question={question}
        textAnswer={session.textAnswer}
        onTextChange={session.setTextAnswer}
        selectedOptions={session.selectedOptions}
        onSelectionChange={session.setSelectedOptions}
        disabled={submitting || result !== null}
      />

      {!isWordHighlightTask(question) && question.options && question.options.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground">Choose your answer:</h4>
          <div className={hasPictureOptions(question.options) ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
          {question.options.map((option, optionIndex) => {
            const checked = session.selectedOptions.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                  checked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                }`}
              >
                {isMultiple ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={event =>
                      session.setSelectedOptions(prev =>
                        event.target.checked ? [...prev, option.id] : prev.filter(id => id !== option.id),
                      )
                    }
                    className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                ) : (
                  <input
                    type="radio"
                    name={`question-${question.id}-options`}
                    value={option.id}
                    checked={checked}
                    onChange={() => session.setSelectedOptions([option.id])}
                    className="mt-0.5 border-input text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                )}
                <OptionContent option={option} index={optionIndex} />
              </label>
            );
          })}
          </div>
        </div>
      )}

      {!passageHasGaps(question.contextPassage) && question.blanks && question.blanks.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground">Fill each blank:</h4>
          {question.blanks.map((blank, index) => {
            const setBlank = (value: string) =>
              session.setBlankResponses({ ...session.blankResponses, [blank.id]: value });

            return (
              <div
                key={blank.id}
                className="flex items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border text-xs"
              >
                <span className="font-bold text-primary shrink-0">Blank {index + 1}:</span>
                {blank.options && blank.options.length > 0 ? (
                  <AnswerSelect
                    value={session.blankResponses[blank.id] || ''}
                    options={blank.options}
                    onChange={setBlank}
                    aria-label={`Blank ${index + 1}`}
                    className="text-xs"
                  />
                ) : (
                  <input
                    value={session.blankResponses[blank.id] || ''}
                    onChange={event => setBlank(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="bg-card border border-border text-xs font-medium text-foreground px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="Type your answer"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={onAskAITutor} className="gap-1.5 font-bold">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <span>Ask AI Coach</span>
        </Button>

        {result ? (
          <Button onClick={session.goToNextQuestion} className="font-bold gap-1.5 shadow-md">
            <span>Next question</span>
          </Button>
        ) : (
          <Button
            onClick={session.submit}
            disabled={submitting || !canSubmit}
            className="font-bold gap-1.5 shadow-md"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {grading === 'speech' ? 'Listening to your answer…' : grading === 'ai' ? 'Evaluating…' : 'Checking…'}
                </span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{grading === 'speech' ? 'Submit recording' : 'Submit Answer'}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

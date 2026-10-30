'use client';

import React from 'react';
import AnswerSelect from '@/components/ui/answer-select';
import { Textarea } from '@/components/ui/textarea';
import { AnswerSubmission, Question } from '@/lib/types';
import ListeningAnswerInput from '@/components/practice/ListeningAnswerInput';
import { isWordHighlightTask } from '@/lib/listening';
import { allowsMultipleChoices } from '@/lib/choices';
import { passageHasGaps } from '@/components/practice/InlineBlankPassage';
import OptionContent, { hasPictureOptions } from '@/components/practice/OptionContent';

interface MockAnswerInputProps {
  question: Question;
  answer?: AnswerSubmission;
  onChange: (patch: Partial<AnswerSubmission>) => void;
}

export default function MockAnswerInput({ question, answer, onChange }: MockAnswerInputProps) {
  const selectedOptions = answer?.selectedOptions ?? [];
  const blankResponses = answer?.blankResponses ?? {};
  const isFreeText = question.skill === 'writing' || question.skill === 'speaking';

  return (
    <>
      <ListeningAnswerInput
        question={question}
        textAnswer={answer?.textResponse ?? ''}
        onTextChange={textResponse => onChange({ textResponse })}
        selectedOptions={selectedOptions}
        onSelectionChange={values => onChange({ selectedOptions: values })}
      />
      {!isWordHighlightTask(question) && question.options && question.options.length > 0 && (
        <div className={hasPictureOptions(question.options) ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
          {question.options.map((option, optionIndex) => {
            const checked = selectedOptions.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                  }`}
              >
                <input
                  type={allowsMultipleChoices(question) ? 'checkbox' : 'radio'}
                  name={`answer-${question.id}`}
                  checked={checked}
                  onChange={event =>
                    onChange({
                      selectedOptions: allowsMultipleChoices(question)
                        ? (event.target.checked ? [...selectedOptions, option.id] : selectedOptions.filter(id => id !== option.id))
                        : [option.id],
                    })
                  }
                  className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <OptionContent option={option} index={optionIndex} />
              </label>
            );
          })}
        </div>
      )}

      {!passageHasGaps(question.contextPassage) && question.blanks && question.blanks.length > 0 && (
        <div className="space-y-2">
          {question.blanks.map((blank, index) => (
            <div
              key={blank.id}
              className="flex items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border text-xs"
            >
              <span className="font-bold text-primary shrink-0">Blank {index + 1}:</span>
              {blank.options && blank.options.length > 0 ? (
                <AnswerSelect
                  value={blankResponses[blank.id] || ''}
                  options={blank.options}
                  onChange={value => onChange({ blankResponses: { ...blankResponses, [blank.id]: value } })}
                  aria-label={`Blank ${index + 1}`}
                  className="text-xs"
                />
              ) : (
                <input
                  value={blankResponses[blank.id] || ''}
                  onChange={event =>
                    onChange({ blankResponses: { ...blankResponses, [blank.id]: event.target.value } })
                  }
                  autoComplete="off"
                  spellCheck={false}
                  className="bg-card border border-border text-xs font-medium text-foreground px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {isFreeText && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-muted-foreground">Your response</span>
          <Textarea
            rows={7}
            value={answer?.textResponse ?? ''}
            onChange={event => onChange({ textResponse: event.target.value })}
            placeholder="Type your response…"
          />
          <p className="text-[11px] text-muted-foreground">
            This legacy mock control does not evaluate writing or record speech.
            Use individual practice for AI feedback. This is not a full exam estimate.
          </p>
        </div>
      )}
    </>
  );
}

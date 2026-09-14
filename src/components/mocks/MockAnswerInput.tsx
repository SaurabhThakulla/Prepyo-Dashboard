'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { AnswerSubmission, Question } from '@/lib/types';

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
      {question.options && question.options.length > 0 && (
        <div className="space-y-2">
          {question.options.map(option => {
            const checked = selectedOptions.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={event =>
                    onChange({
                      selectedOptions: event.target.checked
                        ? [...selectedOptions, option.id]
                        : selectedOptions.filter(id => id !== option.id),
                    })
                  }
                  className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="text-foreground font-medium leading-relaxed">{option.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.blanks && question.blanks.length > 0 && (
        <div className="space-y-2">
          {question.blanks.map((blank, index) => (
            <div
              key={blank.id}
              className="flex items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border text-xs"
            >
              <span className="font-bold text-primary shrink-0">Blank {index + 1}:</span>
              {blank.options && blank.options.length > 0 ? (
                <div className="relative inline-flex items-center group">
                  <select
                    value={blankResponses[blank.id] || ''}
                    onChange={event =>
                      onChange({ blankResponses: { ...blankResponses, [blank.id]: event.target.value } })
                    }
                    className="appearance-none pr-8 pl-3 py-1.5 rounded-lg border border-input bg-card hover:border-primary/50 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs cursor-pointer transition-all"
                  >
                    <option value="">— Select —</option>
                    {blank.options.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ) : (
                <input
                  value={blankResponses[blank.id] || ''}
                  onChange={event =>
                    onChange({ blankResponses: { ...blankResponses, [blank.id]: event.target.value } })
                  }
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
            Recorded with your attempt. {question.skill === 'speaking' ? 'Speaking' : 'Writing'} answers
            are not auto-scored, so they are excluded from the overall estimate.
          </p>
        </div>
      )}
    </>
  );
}

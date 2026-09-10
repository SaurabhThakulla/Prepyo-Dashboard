import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DraftBlank,
  DraftGroup,
  DraftQuestion,
  TASK_TYPES,
  TaskType,
  emptyQuestion,
  examsFor,
  gapsIn,
  labelFor,
} from '@/components/admin/readingTasks';
import { ExamType } from '@/lib/types';

/**
 * One drafted task set: its instructions, its own material, and its questions.
 *
 * Shared by the new-passage form and the passage detail screen, because both
 * add sets and a set authored in one has to be identical to a set authored in
 * the other.
 */
export default function GroupEditor({
  group,
  index,
  labels,
  onChange,
  onRemove,
}: {
  group: DraftGroup;
  index: number;
  labels: string[];
  onChange: (patch: Partial<DraftGroup>) => void;
  onRemove: () => void;
}) {
  const type = TASK_TYPES.find(t => t.id === group.typeId);
  if (!type) return null;

  const patchQuestion = (qi: number, patch: Partial<DraftQuestion>) =>
    onChange({ questions: group.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) });

  const allowedExams = examsFor(type);
  const boxLabels = group.boxes
    .map((box, index) => (box.trim() ? labelFor(index) : ''))
    .filter(Boolean);

  const toggleExam = (exam: ExamType) => {
    const next = group.exams.includes(exam)
      ? group.exams.filter(entry => entry !== exam)
      : [...group.exams, exam];
    if (next.length > 0) onChange({ exams: next });
  };

  return (

            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm">
                    Set {index + 1} · {type.name}
                  </CardTitle>
                  {type.hint && <CardDescription className="text-[11px]">{type.hint}</CardDescription>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove()}
                  className="text-rose-600 hover:text-rose-700 text-xs font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Field label="Instructions shown above the set">
                <Input
                  value={group.instructions}
                  onChange={e => onChange({ instructions: e.target.value })}
                  placeholder={type.instructionsHint ?? 'Choose the correct letter, A, B or C.'}
                />
              </Field>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-foreground">
                  {allowedExams.length > 1
                    ? 'Set by — the same passage can carry sets for both papers'
                    : 'Set by'}
                </span>
                <div className="flex flex-wrap gap-3">
                  {allowedExams.map(exam => (
                    <label key={exam} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={group.exams.includes(exam)}
                        disabled={allowedExams.length === 1}
                        onChange={() => toggleExam(exam)}
                        className="accent-primary h-3.5 w-3.5"
                      />
                      {exam}
                    </label>
                  ))}
                </div>
                {allowedExams.length === 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    Only {allowedExams[0]} sets this task.
                  </p>
                )}
              </div>

              {type.style === 'boxes' && (
                <Field label="Boxes to order — one per line, lettered A, B, C… in the order you type them">
                  <textarea
                    value={group.boxes.join('\n')}
                    onChange={e => onChange({ boxes: e.target.value.split(/\r?\n/) })}
                    rows={6}
                    placeholder={'The earliest use of the bean.\nThe bean reaches Europe.\nThe press is invented.'}
                    className="w-full rounded-xl border border-input bg-card p-3 text-xs font-mono"
                  />
                </Field>
              )}

              {type.style === 'text' && (
                <Field label="Box title — the heading a summary is printed under (optional)">
                  <Input
                    value={group.boxTitle}
                    onChange={e => onChange({ boxTitle: e.target.value })}
                    placeholder="Archaeological discoveries"
                  />
                </Field>
              )}

              {(type.wordBank || type.optionalWordBank) && (
                <Field
                  label={
                    type.wordBank
                      ? 'Word list — one word per line, more words than gaps'
                      : 'List to complete from — one entry per line, lettered A, B, C… (optional)'
                  }
                >
                  <textarea
                    value={group.wordBank.join('\n')}
                    onChange={e => onChange({ wordBank: e.target.value.split(/\r?\n/) })}
                    rows={6}
                    placeholder={'outlawed\ntrebled\nvariety\nwarmer\nhalved'}
                    className="w-full rounded-xl border border-input bg-card p-3 text-xs font-mono"
                  />
                </Field>
              )}

              <div className="space-y-3">
                {group.questions.map((question, qi) => (
                  <QuestionEditor
                    key={qi}
                    number={qi + 1}
                    type={type}
                    labels={type.style === 'boxes' ? boxLabels : labels}
                    wordBank={group.wordBank.map(word => word.trim()).filter(Boolean)}
                    question={question}
                    onChange={patch => patchQuestion(qi, patch)}
                    onRemove={
                      group.questions.length > 1
                        ? () => onChange({ questions: group.questions.filter((_, i) => i !== qi) })
                        : undefined
                    }
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({ questions: [...group.questions, emptyQuestion()] })}
                className="font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add question
              </Button>
            </Card>
          
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold text-foreground">{label}</span>
      {children}
    </label>
  );
}

interface QuestionEditorProps {
  number: number;
  type: TaskType;
  labels: string[];
  wordBank: string[];
  question: DraftQuestion;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onRemove?: () => void;
}

/**
 * One question, with the answer editor its task type calls for.
 *
 * The correct answer is always picked from the same values the learner will
 * see — an option, a verdict, a paragraph label — rather than typed again
 * separately, which is how an answer key ends up naming something that is not
 * on offer.
 */
function QuestionEditor({ number, type, labels, wordBank, question, onChange, onRemove }: QuestionEditorProps) {
  const gaps = useMemo(() => gapsIn(question.contextPassage), [question.contextPassage]);

  const blankFor = (id: string): DraftBlank =>
    question.blanks.find(blank => blank.id === id) ?? { id, options: ['', '', '', ''], correctAnswer: '' };

  const patchBlank = (id: string, patch: Partial<DraftBlank>) =>
    onChange({
      blanks: question.blanks.some(blank => blank.id === id)
        ? question.blanks.map(blank => (blank.id === id ? { ...blank, ...patch } : blank))
        : [...question.blanks, { ...blankFor(id), ...patch }],
    });

  const setBlankOption = (id: string, index: number, value: string) => {
    const blank = blankFor(id);
    const options = blank.options.map((option, i) => (i === index ? value : option));
    patchBlank(id, {
      options,
      correctAnswer: blank.correctAnswer === blank.options[index] ? value : blank.correctAnswer,
    });
  };

  const toggleAnswer = (value: string, multi: boolean) => {
    if (!multi) {
      onChange({ correctAnswers: [value] });
      return;
    }
    onChange({
      correctAnswers: question.correctAnswers.includes(value)
        ? question.correctAnswers.filter(answer => answer !== value)
        : [...question.correctAnswers, value],
    });
  };

  const setOption = (index: number, value: string) => {
    const options = question.options.map((option, i) => (i === index ? value : option));
    // An option that is renamed must take its answer with it, or the key would
    // still name the old wording.
    const previous = question.options[index];
    onChange({
      options,
      correctAnswers: question.correctAnswers.map(answer => (answer === previous ? value : answer)),
    });
  };

  return (
    <div className="rounded-xl border border-border/70 bg-background p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="shrink-0 w-5 h-5 rounded-md bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20">
          {number}
        </span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-rose-600 hover:text-rose-700" aria-label="Remove question">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <Field label={type.style === 'text' ? 'Sentence — use ______ for the gap' : 'Question'}>
        <Input value={question.prompt} onChange={e => onChange({ prompt: e.target.value })} />
      </Field>

      {type.style === 'blanks' && (
        <div className="space-y-3">
          <Field label="Gapped text — write each gap as [[b1]], [[b2]] …">
            <textarea
              value={question.contextPassage}
              onChange={e => onChange({ contextPassage: e.target.value })}
              rows={7}
              placeholder={'Cacao was a drink long before it became a [[b1]], and the Maya preparation would be almost [[b2]] today.'}
              className="w-full rounded-xl border border-input bg-card p-3 text-xs leading-relaxed font-mono"
            />
          </Field>

          {gaps.length === 0 ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              No gaps yet — mark one by typing [[b1]] where the word should be removed.
            </p>
          ) : (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-foreground">
                {gaps.length} gap{gaps.length === 1 ? '' : 's'} · answer each one
              </span>
              {gaps.map(id => {
                const blank = blankFor(id);
                return (
                  <div key={id} className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-2">
                    <span className="text-[11px] font-mono font-bold text-primary">[[{id}]]</span>

                    {type.wordBank ? (
                      <select
                        value={blank.correctAnswer}
                        onChange={e => patchBlank(id, { correctAnswer: e.target.value, options: [] })}
                        className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs"
                      >
                        <option value="">Pick the word that fills this gap…</option>
                        {wordBank.map(word => (
                          <option key={word} value={word}>
                            {word}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-1.5">
                        {blank.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`blank-${number}-${type.id}-${id}`}
                              checked={blank.correctAnswer !== '' && blank.correctAnswer === option}
                              disabled={option.trim() === ''}
                              onChange={() => patchBlank(id, { correctAnswer: option })}
                              className="accent-primary h-3.5 w-3.5 shrink-0"
                              aria-label={`Mark choice ${index + 1} correct for gap ${id}`}
                            />
                            <Input
                              value={option}
                              onChange={e => setBlankOption(id, index, e.target.value)}
                              placeholder={`Choice ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(type.style === 'choice' || type.style === 'multi' || type.style === 'text') && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-foreground">
            {type.style === 'text' ? 'Word choices (optional)' : 'Options — tick the correct one'}
          </span>
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              {type.style !== 'text' && (
                <input
                  type={type.style === 'multi' ? 'checkbox' : 'radio'}
                  name={`correct-${number}-${type.id}`}
                  checked={question.correctAnswers.includes(option) && option !== ''}
                  disabled={option.trim() === ''}
                  onChange={() => toggleAnswer(option, type.style === 'multi')}
                  className="accent-primary h-3.5 w-3.5 shrink-0"
                  aria-label={`Mark option ${index + 1} correct`}
                />
              )}
              <Input value={option} onChange={e => setOption(index, e.target.value)} placeholder={`Option ${index + 1}`} />
              {question.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => onChange({ options: question.options.filter((_, i) => i !== index) })}
                  className="text-muted-foreground hover:text-rose-600"
                  aria-label={`Remove option ${index + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ options: [...question.options, ''] })}
            className="text-xs font-bold h-7"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add option
          </Button>
        </div>
      )}

      {type.style === 'text' && (
        <Field label="Accepted answers — comma separated for alternative spellings">
          <Input
            value={question.correctAnswers.join(', ')}
            onChange={e => onChange({ correctAnswers: e.target.value.split(',').map(a => a.trim()).filter(Boolean) })}
            placeholder="flavour, flavor"
          />
        </Field>
      )}

      {type.style === 'verdict' && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-foreground">Correct answer</span>
          <div className="flex flex-wrap gap-3">
            {(type.verdicts ?? []).map(verdict => (
              <label key={verdict} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name={`verdict-${number}-${type.id}`}
                  checked={question.correctAnswers[0] === verdict}
                  onChange={() => onChange({ correctAnswers: [verdict] })}
                  className="accent-primary h-3.5 w-3.5"
                />
                {verdict}
              </label>
            ))}
          </div>
        </div>
      )}

      {(type.style === 'paragraph' || type.style === 'boxes') && (
        <Field label={type.style === 'boxes' ? 'The box that belongs here' : 'Correct paragraph'}>
          {labels.length === 0 ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              {type.style === 'boxes'
                ? 'Write the boxes above — they become the answers.'
                : 'Paste the passage first — its paragraphs become the answers.'}
            </p>
          ) : (
            <select
              value={question.correctAnswers[0] ?? ''}
              onChange={e => onChange({ correctAnswers: e.target.value ? [e.target.value] : [] })}
              className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs"
            >
              <option value="">— select —</option>
              {labels.map(label => (
                <option key={label} value={label}>
                  Paragraph {label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      <Field label="Explanation (optional)">
        <Input value={question.explanation} onChange={e => onChange({ explanation: e.target.value })} />
      </Field>
    </div>
  );
}

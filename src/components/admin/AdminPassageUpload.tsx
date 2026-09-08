import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { ExamType } from '@/lib/types';

/**
 * How a task's answer is chosen, which decides the editor a question gets.
 * Mirrors the server's own grouping in internal/admin/reading.go — the server
 * validates all of this again, because a form cannot be trusted with an answer
 * key.
 */
type AnswerStyle = 'choice' | 'multi' | 'verdict' | 'paragraph' | 'text';

interface TaskType {
  id: string;
  name: string;
  style: AnswerStyle;
  exam: ExamType | 'both';
  /** Fixed answers for verdict tasks, which the author picks between. */
  verdicts?: string[];
  hint?: string;
}

/**
 * The tasks that can be authored here.
 *
 * Re-order Paragraphs and the two PTE gap-fills are missing on purpose: their
 * answers are ordered rows and per-blank keys, shapes this form does not carry.
 * The server rejects them too, so the two cannot disagree.
 */
const TASK_TYPES: TaskType[] = [
  { id: 'reading-mcq-single', name: 'Multiple Choice, Single Answer', style: 'choice', exam: 'both' },
  { id: 'reading-mcq-multiple', name: 'Multiple Choice, Multiple Answers', style: 'multi', exam: 'both' },
  {
    id: 'reading-sentence-completion',
    name: 'Sentence Completion',
    style: 'text',
    exam: 'IELTS',
    hint: 'Write the sentence with ______ where the gap goes. Leave the word choices empty for a typed answer.',
  },
  { id: 'reading-true-false', name: 'True / False / Not Given', style: 'verdict', exam: 'IELTS', verdicts: ['True', 'False', 'Not Given'] },
  { id: 'reading-yes-no-not-given', name: 'Yes / No / Not Given', style: 'verdict', exam: 'IELTS', verdicts: ['Yes', 'No', 'Not Given'] },
  { id: 'reading-find-the-paragraph', name: 'Find the Paragraph', style: 'paragraph', exam: 'IELTS' },
  { id: 'reading-matching-information', name: 'Matching Information', style: 'paragraph', exam: 'IELTS' },
];

interface DraftQuestion {
  prompt: string;
  options: string[];
  correctAnswers: string[];
  explanation: string;
}

interface DraftGroup {
  typeId: string;
  instructions: string;
  questions: DraftQuestion[];
}

/** Mirrors reading_passages_word_count_floor: below this a passage cannot
 *  carry three task types, and the database refuses it. */
const MIN_WORDS = 700;

const emptyQuestion = (): DraftQuestion => ({ prompt: '', options: ['', ''], correctAnswers: [], explanation: '' });

const emptyGroup = (typeId: string): DraftGroup => ({
  typeId,
  instructions: '',
  questions: [emptyQuestion()],
});

/** A, B, C … the labels the server will assign, shown live so the author can
 *  see which paragraph a matching answer refers to before saving. */
const labelFor = (index: number) =>
  index < 26 ? String.fromCharCode(65 + index) : String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));

export default function AdminPassageUpload() {
  const toast = useToast();

  const [exam, setExam] = useState<ExamType>('IELTS');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('');
  const [body, setBody] = useState('');
  const [publish, setPublish] = useState(false);
  const [groups, setGroups] = useState<DraftGroup[]>([]);

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  // Blank lines split paragraphs, the same rule the server applies, so the
  // preview cannot promise labels the server will not assign.
  const paragraphs = useMemo(
    () => body.split(/\r?\n\s*\r?\n/).map(block => block.trim()).filter(Boolean),
    [body],
  );
  const labels = useMemo(() => paragraphs.map((_, index) => labelFor(index)), [paragraphs]);
  const wordCount = useMemo(() => paragraphs.join(' ').split(/\s+/).filter(Boolean).length, [paragraphs]);

  const availableTypes = TASK_TYPES.filter(type => type.exam === 'both' || type.exam === exam);
  const questionTotal = groups.reduce((sum, group) => sum + group.questions.length, 0);

  const patchGroup = (index: number, patch: Partial<DraftGroup>) =>
    setGroups(current => current.map((group, i) => (i === index ? { ...group, ...patch } : group)));

  const patchQuestion = (gi: number, qi: number, patch: Partial<DraftQuestion>) =>
    setGroups(current =>
      current.map((group, i) =>
        i === gi
          ? { ...group, questions: group.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) }
          : group,
      ),
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFieldErrors({});
    setSaved(null);

    try {
      const payload = {
        exam,
        title,
        subtitle,
        topic,
        difficulty,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        body,
        publish,
        groups: groups.map(group => ({
          typeId: group.typeId,
          instructions: group.instructions,
          questions: group.questions.map(question => ({
            prompt: question.prompt,
            options: question.options.map(option => option.trim()).filter(Boolean),
            correctAnswers: question.correctAnswers.filter(Boolean),
            explanation: question.explanation,
          })),
        })),
      };

      const data = await api.post<{ passage: { id: string; questions: number; published: boolean } }>(
        '/admin/reading/passages',
        payload,
      );

      setSaved(data.passage.id);
      toast.success(
        data.passage.published ? 'Passage published' : 'Passage saved as a draft',
        `${data.passage.questions} question${data.passage.questions === 1 ? '' : 's'} across ${groups.length} set${groups.length === 1 ? '' : 's'}.`,
      );

      setTitle('');
      setSubtitle('');
      setTopic('');
      setTags('');
      setBody('');
      setGroups([]);
      setPublish(false);
    } catch (err) {
      // The server answers field-by-field, and its paths name the group and
      // question, so the message lands next to the thing that is wrong.
      const fields = (err as { body?: { error?: { fields?: Record<string, string> } } })?.body?.error?.fields;
      if (fields) setFieldErrors(fields);
      toast.error('Could not save the passage', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5 pb-16 overflow-y-auto">
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Add a reading passage</h1>
            <Badge variant="destructive">Admin</Badge>
          </div>
          <CardDescription className="text-xs">
            Saved unpublished by default. Nothing reaches learners until you tick publish.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} className="accent-primary h-3.5 w-3.5" />
            Publish now
          </label>
          <Button type="submit" disabled={saving} className="font-bold text-xs rounded-full h-9 px-4">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
            Save passage
          </Button>
        </div>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          Saved as <span className="font-mono font-bold">{saved}</span>
        </div>
      )}

      {Object.keys(fieldErrors).length > 0 && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] font-medium text-rose-600 dark:text-rose-400 space-y-0.5">
          {Object.entries(fieldErrors).map(([field, message]) => (
            <p key={field}>
              <span className="font-mono font-bold">{field}</span> — {message}
            </p>
          ))}
        </div>
      )}

      {/* Passage */}
      <Card className="p-5 space-y-4">
        <CardTitle className="text-base">Passage</CardTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Exam">
            <select
              value={exam}
              onChange={e => {
                const next = e.target.value as ExamType;
                setExam(next);
                // Task types are exam-specific, so a set authored for the other
                // exam would be saved against a type that exam never shows.
                setGroups(current =>
                  current.filter(group => {
                    const type = TASK_TYPES.find(t => t.id === group.typeId);
                    return type && (type.exam === 'both' || type.exam === next);
                  }),
                );
              }}
              className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs"
            >
              <option value="IELTS">IELTS</option>
              <option value="PTE">PTE</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Topic">
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="History of technology" />
          </Field>
          <Field label="Tags (comma separated)">
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="science, history" />
          </Field>
        </div>

        <Field label="Title">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="The Long Road of Papermaking" />
        </Field>
        <Field label="Subtitle">
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Optional standfirst" />
        </Field>

        <Field label="Passage text — leave a blank line between paragraphs">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={14}
            placeholder={'First paragraph…\n\nSecond paragraph…'}
            className="w-full rounded-xl border border-input bg-card p-3 text-xs leading-relaxed font-mono"
          />
        </Field>

        {paragraphs.length > 0 && (
          <div className="text-[11px] space-y-1">
            <p className="font-semibold text-foreground">
              {paragraphs.length} paragraph{paragraphs.length === 1 ? '' : 's'} ·{' '}
              <span className={wordCount < MIN_WORDS ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {wordCount} words
              </span>
            </p>
            {wordCount < MIN_WORDS && (
              <p className="text-amber-600 dark:text-amber-400">
                {MIN_WORDS - wordCount} more words needed — a passage under {MIN_WORDS} cannot carry three task sets,
                and the database will refuse it.
              </p>
            )}
            <p className="text-muted-foreground">Labels: {labels.join(', ')} — matching answers refer to these.</p>
          </div>
        )}
      </Card>

      {/* Question sets */}
      <div className="space-y-4">
        {groups.map((group, gi) => {
          const type = TASK_TYPES.find(t => t.id === group.typeId);
          if (!type) return null;

          return (
            <Card key={gi} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm">
                    Set {gi + 1} · {type.name}
                  </CardTitle>
                  {type.hint && <CardDescription className="text-[11px]">{type.hint}</CardDescription>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setGroups(current => current.filter((_, i) => i !== gi))}
                  className="text-rose-600 hover:text-rose-700 text-xs font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Field label="Instructions shown above the set">
                <Input
                  value={group.instructions}
                  onChange={e => patchGroup(gi, { instructions: e.target.value })}
                  placeholder="Choose the correct letter, A, B or C."
                />
              </Field>

              <div className="space-y-3">
                {group.questions.map((question, qi) => (
                  <QuestionEditor
                    key={qi}
                    number={qi + 1}
                    type={type}
                    labels={labels}
                    question={question}
                    onChange={patch => patchQuestion(gi, qi, patch)}
                    onRemove={
                      group.questions.length > 1
                        ? () => patchGroup(gi, { questions: group.questions.filter((_, i) => i !== qi) })
                        : undefined
                    }
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => patchGroup(gi, { questions: [...group.questions, emptyQuestion()] })}
                className="font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add question
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 space-y-3">
        <CardTitle className="text-sm">Add a question set</CardTitle>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map(type => (
            <Button
              key={type.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGroups(current => [...current, emptyGroup(type.id)])}
              className="font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {type.name}
            </Button>
          ))}
        </div>
        <CardDescription className="text-[11px]">
          Re-order Paragraphs and the PTE gap-fills are still added through migrations — their answers use shapes this
          form does not carry yet.
        </CardDescription>
      </Card>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-muted-foreground">
          {groups.length} set{groups.length === 1 ? '' : 's'} · {questionTotal} question
          {questionTotal === 1 ? '' : 's'}
        </p>
        <Button type="submit" disabled={saving} className="font-bold text-xs rounded-full h-9 px-5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
          Save passage
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
function QuestionEditor({ number, type, labels, question, onChange, onRemove }: QuestionEditorProps) {
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

      {type.style === 'paragraph' && (
        <Field label="Correct paragraph">
          {labels.length === 0 ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Paste the passage first — its paragraphs become the answers.</p>
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

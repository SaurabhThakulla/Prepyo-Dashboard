import React, { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { ExamType } from '@/lib/types';
import GroupEditor, { Field } from '@/components/admin/GroupEditor';
import {
  DraftGroup,
  MIN_WORDS,
  TASK_TYPES,
  emptyGroup,
  groupPayload,
  labelFor,
  PASSAGE_SLOT_TEMPLATES,
  createGroupsFromSlotTemplate,
} from '@/components/admin/readingTasks';

/**
 * Writing a new passage.
 *
 * Task sets are optional here. A passage can be saved as a draft with nothing
 * on it and filled in afterwards on its own screen, which is how authoring
 * actually goes: the text arrives first and the questions are written against
 * it.
 */
export default function AdminPassageUpload({
  initialExam = 'IELTS',
  initialTypeKey,
  onSaved,
  onCancel,
}: {
  initialExam?: ExamType;
  initialTypeKey?: string;
  onSaved?: (passageId: string) => void;
  onCancel?: () => void;
}) {
  const toast = useToast();

  const [exam, setExam] = useState<ExamType>(initialExam);
  const [passageSlot, setPassageSlot] = useState<'A' | 'B' | 'C' | 'custom'>('A');
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

  // Blank lines split paragraphs, the same rule the server applies, so the
  // preview cannot promise labels the server will not assign.
  const paragraphs = useMemo(
    () => body.split(/\r?\n\s*\r?\n/).map(block => block.trim()).filter(Boolean),
    [body],
  );
  const labels = useMemo(() => paragraphs.map((_, index) => labelFor(index)), [paragraphs]);
  const wordCount = useMemo(() => paragraphs.join(' ').split(/\s+/).filter(Boolean).length, [paragraphs]);

  const availableTypes = TASK_TYPES;
  const questionTotal = groups.reduce((sum, group) => sum + group.questions.length, 0);

  const patchGroup = (index: number, patch: Partial<DraftGroup>) =>
    setGroups(current => current.map((group, i) => (i === index ? { ...group, ...patch } : group)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFieldErrors({});

    try {
      const data = await api.post<{ passage: { id: string; questions: number; published: boolean } }>(
        '/admin/reading/passages',
        {
          exam,
          passageSlot: exam === 'IELTS' ? passageSlot : 'custom',
          title,
          subtitle,
          topic,
          difficulty,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
          body,
          publish,
          groups: groups.map(groupPayload),
        },
      );

      toast.success(
        data.passage.published ? 'Passage published' : 'Saved as a draft',
        groups.length === 0
          ? 'Add its question sets next.'
          : `${data.passage.questions} question${data.passage.questions === 1 ? '' : 's'} across ${groups.length} set${groups.length === 1 ? '' : 's'}.`,
      );
      onSaved?.(data.passage.id);
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
    <form onSubmit={submit} className="space-y-5 pb-16">
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h1 className="font-display text-2xl font-bold text-foreground">Add a reading passage</h1>
            <Badge variant="destructive">Admin</Badge>
          </div>
          <CardDescription className="text-xs">
            Saved as a draft. Nothing reaches learners until you publish it.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={publish}
              onChange={e => setPublish(e.target.checked)}
              disabled={questionTotal === 0}
              className="accent-primary h-3.5 w-3.5"
            />
            Publish now
          </label>
          <Button type="submit" disabled={saving} className="font-bold text-xs rounded-full h-9 px-4">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
            Save passage
          </Button>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <CardTitle className="text-sm">Passage</CardTitle>

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
          {exam === 'IELTS' && (
            <Field label="Passage Pattern (Role)">
              <select
                value={passageSlot}
                onChange={e => setPassageSlot(e.target.value as 'A' | 'B' | 'C' | 'custom')}
                className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium"
              >
                <option value="A">Passage A (Part 1 — 13 Qs)</option>
                <option value="B">Passage B (Part 2 — 13 Qs)</option>
                <option value="C">Passage C (Part 3 — 14 Qs)</option>
                <option value="custom">Custom (Manual Sets)</option>
              </select>
            </Field>
          )}
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
        {fieldErrors.title && <p className="text-[11px] text-rose-600">{fieldErrors.title}</p>}

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
        {fieldErrors.body && <p className="text-[11px] text-rose-600">{fieldErrors.body}</p>}

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

      {exam === 'IELTS' && passageSlot !== 'custom' && (
        <Card className="p-4 bg-primary/5 border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="font-bold text-xs">{PASSAGE_SLOT_TEMPLATES[passageSlot].label}</Badge>
              <span className="text-xs font-bold text-foreground">
                {PASSAGE_SLOT_TEMPLATES[passageSlot].totalQuestions} Questions Target
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {PASSAGE_SLOT_TEMPLATES[passageSlot].description}
            </p>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setGroups(createGroupsFromSlotTemplate(passageSlot))}
            className="font-bold text-xs shrink-0"
          >
            Apply Passage {passageSlot} Template ({PASSAGE_SLOT_TEMPLATES[passageSlot].totalQuestions} Qs)
          </Button>
        </Card>
      )}

      <div className="space-y-4">
        {groups.map((group, gi) => (
          <GroupEditor
            key={gi}
            group={group}
            index={gi}
            labels={labels}
            onChange={patch => patchGroup(gi, patch)}
            onRemove={() => setGroups(current => current.filter((_, i) => i !== gi))}
          />
        ))}
      </div>

      <Card className="p-5 space-y-3">
        <CardTitle className="text-sm">Add a question set now (optional)</CardTitle>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map(type => (
            <Button
              key={type.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGroups(current => [...current, emptyGroup(type.id, [exam])])}
              disabled={type.style === 'reorder'}
              title={
                type.style === 'reorder'
                  ? 'A re-order item carries its own boxes — add it from the saved passage.'
                  : undefined
              }
              className="font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {type.name}
            </Button>
          ))}
        </div>
        <CardDescription className="text-[11px]">
          You can save the passage on its own and add its sets afterwards, on the passage's own screen.
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

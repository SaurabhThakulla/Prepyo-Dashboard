import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { ExamType } from '@/lib/types';

/**
 * Re-order Paragraphs, which is not a passage task.
 *
 * The boxes are written in their correct order and stored that way: the order
 * is the answer key, and the shuffle happens per deal, so two learners never
 * see the same arrangement.
 */

/** Mirrors reading_reorder_items_enough_boxes: the scorer counts adjacent
 *  pairs, so fewer than three boxes is not a task. */
const MIN_BOXES = 3;

export default function AdminReorderUpload({
  initialExam = 'PTE',
  initialSourcePassageId = '',
  onSaved,
  onCancel,
}: {
  initialExam?: ExamType;
  /** Prefilled when the item is being cut from a passage being authored. */
  initialSourcePassageId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
} = {}) {
  const toast = useToast();

  const [exam, setExam] = useState<ExamType>(initialExam);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('');
  const [sourcePassageId, setSourcePassageId] = useState(initialSourcePassageId);
  const [explanation, setExplanation] = useState('');
  const [boxes, setBoxes] = useState<string[]>(['', '', '']);
  const [publish, setPublish] = useState(false);

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const filled = useMemo(() => boxes.map(box => box.trim()).filter(Boolean), [boxes]);

  const setBox = (index: number, value: string) =>
    setBoxes(current => current.map((box, i) => (i === index ? value : box)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFieldErrors({});

    try {
      const data = await api.post<{ item: { id: string; boxes: number; published: boolean } }>(
        '/admin/reading/reorder-items',
        {
          exam,
          title,
          topic,
          difficulty,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
          sourcePassageId: sourcePassageId.trim(),
          explanation,
          boxes: filled,
          publish,
        },
      );

      toast.success(
        data.item.published ? 'Item published' : 'Item saved as a draft',
        `${data.item.boxes} boxes · worth ${data.item.boxes - 1} marks.`,
      );

      setTitle('');
      setTopic('');
      setTags('');
      setSourcePassageId(initialSourcePassageId);
      setExplanation('');
      setBoxes(['', '', '']);
      setPublish(false);
      onSaved?.();
    } catch (err) {
      const fields = (err as { body?: { error?: { fields?: Record<string, string> } } })?.body?.error?.fields;
      if (fields) setFieldErrors(fields);
      toast.error('Could not save the item', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Add a Re-order Paragraphs item</CardTitle>
            <CardDescription className="text-[11px]">
              Write the boxes in their correct order. Learners are dealt them shuffled, and the order is the answer.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="font-bold text-xs h-8">
              Close
            </Button>
          )}
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={publish}
              onChange={e => setPublish(e.target.checked)}
              className="accent-primary h-3.5 w-3.5"
            />
            Publish now
          </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Exam" error={fieldErrors.exam}>
            <select
              value={exam}
              onChange={e => setExam(e.target.value as ExamType)}
              className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs"
            >
              <option value="PTE">PTE</option>
              <option value="IELTS">IELTS</option>
            </select>
          </Field>
          <Field label="Difficulty" error={fieldErrors.difficulty}>
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
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Urban ecology" />
          </Field>
          <Field label="Tags (comma separated)">
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="PTE Reading" />
          </Field>
        </div>

        <Field label="Title" error={fieldErrors.title}>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Hives in the city" />
        </Field>

        <Field
          label="Source passage id (optional)"
          error={fieldErrors.sourcePassageId}
        >
          <Input
            value={sourcePassageId}
            onChange={e => setSourcePassageId(e.target.value)}
            placeholder="rp-bees-01"
          />
        </Field>
        <p className="-mt-2 text-[11px] text-muted-foreground">
          Cut from a passage that is already in the bank? Name it, and anyone who has read it is never dealt this item.
        </p>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-foreground">Boxes, in their correct order</span>
          {fieldErrors.boxes && <p className="text-[11px] text-rose-600">{fieldErrors.boxes}</p>}
          {boxes.map((box, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="shrink-0 w-6 h-6 mt-1 rounded-md bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20">
                {String.fromCharCode(65 + index)}
              </span>
              <textarea
                value={box}
                onChange={e => setBox(index, e.target.value)}
                rows={3}
                placeholder={index === 0 ? 'The box that opens the sequence…' : 'Next box…'}
                className="w-full rounded-xl border border-input bg-card p-2.5 text-xs leading-relaxed"
              />
              {boxes.length > MIN_BOXES && (
                <button
                  type="button"
                  onClick={() => setBoxes(current => current.filter((_, i) => i !== index))}
                  className="mt-1 text-muted-foreground hover:text-rose-600"
                  aria-label={`Remove box ${index + 1}`}
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
            onClick={() => setBoxes(current => [...current, ''])}
            className="text-xs font-bold h-7"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add box
          </Button>
        </div>

        <Field label="Explanation shown after answering (optional)">
          <Input
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Boxes opening with This, Then or a pronoun always follow something else."
          />
        </Field>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-muted-foreground">
            {filled.length} box{filled.length === 1 ? '' : 'es'}
            {filled.length >= MIN_BOXES
              ? ` · worth ${filled.length - 1} marks`
              : ` · ${MIN_BOXES - filled.length} more needed`}
          </p>
          <Button
            type="submit"
            disabled={saving || filled.length < MIN_BOXES}
            className="font-bold text-xs rounded-full h-9 px-5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
            Save item
          </Button>
        </div>
      </Card>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold text-foreground">{label}</span>
      {children}
      {error && <span className="block text-[11px] text-rose-600">{error}</span>}
    </label>
  );
}

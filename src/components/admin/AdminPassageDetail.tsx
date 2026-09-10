import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import GroupEditor from '@/components/admin/GroupEditor';
import { DraftGroup, TASK_TYPES, emptyGroup, groupPayload } from '@/components/admin/readingTasks';
import { AuthoredQuestion, AuthoredSet, examsOf, usePassageDetail } from '@/lib/hooks/useAdminReading';
import { AdminPageSkeleton } from '@/components/layout/PageSkeleton';
import AdminReorderUpload from '@/components/admin/AdminReorderUpload';

/**
 * One passage: its text, the task sets already on it, and the sets being added.
 *
 * Publishing lives here rather than on the list because this is the only screen
 * that shows what is actually being published.
 */
export default function AdminPassageDetail({
  passageId,
  onBack,
  onChanged,
}: {
  passageId: string;
  onBack: () => void;
  onChanged?: () => void;
}) {
  const toast = useToast();
  const { passage, loading, error, reload } = usePassageDetail(passageId);

  const [drafts, setDrafts] = useState<DraftGroup[]>([]);
  // Re-order Paragraphs is offered beside the sets because the learner's
  // dashboard lists it beside them, but an item is not a set: it carries its
  // own boxes, so it opens its own form, cut from this passage.
  const [reordering, setReordering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const labels = useMemo(() => (passage?.body ?? []).map(block => block.label), [passage]);
  const availableTypes = TASK_TYPES;
  const draftQuestions = drafts.reduce((sum, group) => sum + group.questions.length, 0);

  // The same shape the bank and the route fallback use: one screen, not a
  // different silhouette at every step of the load.
  if (!passage && !error) return <AdminPageSkeleton bare />;

  if (error || !passage) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">{error ?? 'That passage is gone.'}</p>
        <Button variant="outline" size="sm" onClick={onBack} className="font-bold text-xs">
          Back to the bank
        </Button>
      </div>
    );
  }

  const saveSets = async () => {
    if (saving || drafts.length === 0) return;
    setSaving(true);
    try {
      const data = await api.post<{ passage: { setsAdded: number; questionsAdded: number } }>(
        `/admin/reading/passages/${passage.id}/groups`,
        { groups: drafts.map(groupPayload) },
      );
      toast.success(
        `${data.passage.setsAdded} set${data.passage.setsAdded === 1 ? '' : 's'} added`,
        `${data.passage.questionsAdded} question${data.passage.questionsAdded === 1 ? '' : 's'} written.`,
      );
      setDrafts([]);
      await reload();
      onChanged?.();
    } catch (err) {
      toast.error('Could not add those sets', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      await api.patch(`/admin/reading/passages/${passage.id}/publish`, {
        publish: !passage.isPublished,
      });
      toast.success(
        passage.isPublished ? 'Back to a draft' : 'Published',
        passage.isPublished
          ? 'Learners can no longer be dealt this passage.'
          : 'Learners can be dealt this passage now.',
      );
      await reload();
      onChanged?.();
    } catch (err) {
      toast.error('Could not change publication', errorMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/reading/passages/${passage.id}`);
      toast.success('Passage deleted', `${passage.title} and its questions are gone.`);
      onChanged?.();
      onBack();
    } catch (err) {
      toast.error('Could not delete the passage', errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
              {passage.title}
            </h1>
            {examsOf(passage).map(entry => (
              <Badge key={entry} variant="outline">
                {entry}
              </Badge>
            ))}
            {passage.isPublished ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                Published
              </Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
          <CardDescription className="text-xs pl-9">
            {passage.paragraphs} paragraphs · {passage.wordCount} words · {passage.sets.length} set
            {passage.sets.length === 1 ? '' : 's'} · {passage.questions} question
            {passage.questions === 1 ? '' : 's'}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={remove}
            disabled={deleting}
            className="font-bold text-xs text-rose-600 hover:text-rose-700"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
            Delete
          </Button>
          <Button
            size="sm"
            onClick={togglePublished}
            disabled={publishing || (!passage.isPublished && passage.questions === 0)}
            className="font-bold text-xs"
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : passage.isPublished ? (
              <EyeOff className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <Eye className="w-3.5 h-3.5 mr-1.5" />
            )}
            {passage.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      {!passage.isPublished && passage.questions === 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          This draft has no questions yet. Add a set below before it can be published.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card className="p-5 space-y-3">
          <CardTitle className="text-sm">Passage text</CardTitle>
          <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
            {passage.body.map(block => (
              <p key={block.label} className="text-xs leading-relaxed text-foreground">
                <span className="font-mono font-bold text-primary mr-1.5">{block.label}</span>
                {block.text}
              </p>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <CardTitle className="text-sm">
            Question sets ({passage.sets.length})
          </CardTitle>
          {passage.sets.length === 0 ? (
            <CardDescription className="text-[11px]">
              Nothing on this passage yet.
            </CardDescription>
          ) : (
            <div className="space-y-2">
              {/* Numbering runs across the passage, the way the paper prints it. */}
              {passage.sets.map((set, index) => (
                <SetSummary
                  key={set.id}
                  set={set}
                  startNumber={passage.sets
                    .slice(0, index)
                    .reduce((sum, earlier) => sum + earlier.questions.length, 1)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        {drafts.map((group, gi) => (
          <GroupEditor
            key={gi}
            group={group}
            index={passage.sets.length + gi}
            labels={labels}
            onChange={patch =>
              setDrafts(current => current.map((g, i) => (i === gi ? { ...g, ...patch } : g)))
            }
            onRemove={() => setDrafts(current => current.filter((_, i) => i !== gi))}
          />
        ))}
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
              onClick={() =>
                type.style === 'reorder'
                  ? setReordering(true)
                  : setDrafts(current => [...current, emptyGroup(type.id, passage.exams)])
              }
              className="font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {type.name}
            </Button>
          ))}
        </div>
      </Card>

      {reordering && (
        <AdminReorderUpload
          initialExam="PTE"
          initialSourcePassageId={passage.id}
          onCancel={() => setReordering(false)}
          onSaved={() => setReordering(false)}
        />
      )}

      {drafts.length > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border/70 bg-background/95 backdrop-blur py-3">
          <p className="text-[11px] text-muted-foreground">
            {drafts.length} new set{drafts.length === 1 ? '' : 's'} · {draftQuestions} question
            {draftQuestions === 1 ? '' : 's'} not saved yet
          </p>
          <Button onClick={saveSets} disabled={saving} className="font-bold text-xs rounded-full h-9 px-5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
            Save sets
          </Button>
        </div>
      )}
    </div>
  );
}

function SetSummary({ set, startNumber }: { set: AuthoredSet; startNumber: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground truncate">
          {set.position}. {set.typeName}
          {set.exams?.length > 0 && (
            <span className="ml-1.5 font-mono text-[10px] font-bold text-muted-foreground">
              {set.exams.join(' · ')}
            </span>
          )}
        </span>
        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          {set.questions.length === 1
            ? `Question ${startNumber}`
            : `Questions ${startNumber}–${startNumber + set.questions.length - 1}`}
        </span>
      </div>
      {set.boxTitle && <p className="text-[11px] font-semibold text-foreground">{set.boxTitle}</p>}
      {set.instructions && <p className="text-[11px] text-muted-foreground">{set.instructions}</p>}

      {/* The questions themselves, with their keys. Reviewing content means
          reading the answers, which is the one thing the learner endpoint will
          never return. */}
      <ol className="space-y-1.5 pt-1">
        {set.questions.map((question, index) => (
          <li key={question.id} className="flex gap-2 text-[11px]">
            <span className="shrink-0 font-mono font-bold text-primary">{startNumber + index}</span>
            <span className="min-w-0">
              <span className="block text-foreground leading-snug">
                {question.contextPassage || question.prompt}
              </span>
              <span className="block text-muted-foreground">
                {answerKeyOf(question)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The answer as an admin needs to read it back, whatever shape it was stored in. */
function answerKeyOf(question: AuthoredQuestion): string {
  if (question.blanks?.length) {
    return question.blanks.map(blank => `${blank.id}: ${blank.correctAnswer ?? '—'}`).join(', ');
  }
  const answers = question.correctAnswers ?? [];
  if (answers.length === 0) return 'No answer key';
  const labelled = answers.map(
    answer => question.options?.find(option => option.id === answer)?.text ?? answer,
  );
  return `Answer: ${labelled.join(' / ')}`;
}

import React, { useMemo, useState } from 'react';
import { AlertCircle, ClipboardList, Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { ExamType, SkillType } from '@/lib/types';
import { AuthoredQuestionSummary, useQuestionBank } from '@/lib/hooks/useAdminQuestions';
import { AdminPageSkeleton } from '@/components/layout/PageSkeleton';
import { Chips } from '@/components/admin/AdminReadingBank';

const SKILL_TITLE: Record<SkillType, string> = {
  speaking: 'Speaking',
  writing: 'Writing',
  reading: 'Reading',
  listening: 'Listening',
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function AdminQuestionBank({
  skill,
  onNew,
  reloadKey,
}: {
  skill: SkillType;
  onNew: () => void;
  reloadKey?: number;
}) {
  const toast = useToast();
  const { questions, loading, error, reload } = useQuestionBank(skill);
  const [exam, setExam] = useState<ExamType | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [lastKey, setLastKey] = useState(reloadKey);
  if (reloadKey !== lastKey) {
    setLastKey(reloadKey);
    void reload();
  }

  const shown = useMemo(
    () =>
      questions.filter(question => {
        if (exam !== 'all' && question.exam !== exam) return false;
        if (status === 'published' && !question.isPublished) return false;
        if (status === 'draft' && question.isPublished) return false;
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return [question.title, question.typeName, question.prompt].some(text =>
          text.toLowerCase().includes(needle),
        );
      }),
    [questions, exam, status, query],
  );

  const published = questions.filter(question => question.isPublished).length;

  const togglePublished = async (question: AuthoredQuestionSummary) => {
    setBusyId(question.id);
    try {
      await api.patch(`/admin/questions/${question.id}/publish`, { publish: !question.isPublished });
      toast.success(question.isPublished ? 'Question unpublished' : 'Question published', question.title);
      await reload();
    } catch (err) {
      toast.error('Could not change the question', errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (question: AuthoredQuestionSummary) => {
    const answers =
      question.answers > 0 ? ` ${plural(question.answers, 'learner answer')} to it will be deleted too.` : '';
    if (!window.confirm(`Delete "${question.title}"?${answers}`)) return;

    setBusyId(question.id);
    try {
      await api.delete(`/admin/questions/${question.id}`);
      toast.success('Question deleted', question.title);
      await reload();
    } catch (err) {
      toast.error('Could not delete the question', errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">{SKILL_TITLE[skill]} bank</h1>
            <Badge variant="destructive">Admin</Badge>
          </div>
          <CardDescription className="text-xs">
            {plural(questions.length, 'question')} · {published} published · {plural(questions.length - published, 'draft')}
          </CardDescription>
        </div>
        <Button onClick={onNew} className="font-bold text-xs rounded-full h-9 px-4 shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New question
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, task or instructions"
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
          <Chips
            value={exam}
            onChange={setExam}
            options={[
              { value: 'all', label: 'Both exams' },
              { value: 'IELTS', label: 'IELTS' },
              { value: 'PTE', label: 'PTE' },
            ]}
          />
          <Chips
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'published', label: 'Published' },
              { value: 'draft', label: 'Drafts' },
            ]}
          />
        </div>
      </div>

      {loading && questions.length === 0 ? (
        <AdminPageSkeleton bare />
      ) : error ? (
        <Card className="p-8 text-center space-y-2">
          <AlertCircle className="w-7 h-7 text-amber-500 mx-auto" />
          <p className="text-sm font-bold text-foreground">Could not load the bank</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()} className="font-bold text-xs">
            Try again
          </Button>
        </Card>
      ) : shown.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground">
            {questions.length === 0 ? `No ${skill} questions yet` : 'Nothing matches those filters'}
          </p>
          <p className="text-xs text-muted-foreground">
            {questions.length === 0
              ? 'Add one for any task type. It stays a draft until you publish it.'
              : 'Clear the search or switch the filters.'}
          </p>
          {questions.length === 0 && (
            <Button onClick={onNew} size="sm" className="font-bold text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New question
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {shown.map(question => (
            <QuestionCard
              key={question.id}
              question={question}
              busy={busyId === question.id}
              onTogglePublished={() => void togglePublished(question)}
              onDelete={() => void remove(question)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  busy,
  onTogglePublished,
  onDelete,
}: {
  question: AuthoredQuestionSummary;
  busy: boolean;
  onTogglePublished: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[9px]">
          {question.exam}
        </Badge>
        {question.isPublished ? (
          <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
            Published
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[9px]">
            Draft
          </Badge>
        )}
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground truncate max-w-[180px]">
          {question.typeName}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug">{question.title}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{question.prompt}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          <span className="capitalize">{question.difficulty}</span> · {question.points} pts ·{' '}
          {plural(question.answers, 'answer')}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onTogglePublished}
            className="h-7 px-2.5 text-[11px] font-bold gap-1"
          >
            {busy ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : question.isPublished ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
            {question.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || question.inMock}
            onClick={onDelete}
            title={question.inMock ? 'Part of a mock exam. Unpublish it instead.' : 'Delete question'}
            aria-label={`Delete ${question.title}`}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { AlertCircle, BookOpen, ChevronRight, FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ExamType } from '@/lib/types';
import { PassageSummary, examsOf, usePassageBank } from '@/lib/hooks/useAdminReading';
import { AdminPageSkeleton } from '@/components/layout/PageSkeleton';

import { typeKey, typeLabel } from '@/lib/syllabus';

/**
 * The reading bank: every passage, drafts included, with what is on each one.
 */
export default function AdminReadingBank({
  initialTypeKey,
  initialExam,
  onOpen,
  onNew,
  onNewReorder,
  reloadKey,
}: {
  initialTypeKey?: string;
  initialExam?: ExamType;
  onOpen: (passageId: string) => void;
  onNew: () => void;
  onNewReorder?: () => void;
  reloadKey?: number;
}) {
  const { passages, loading, error, reload } = usePassageBank();
  const [exam, setExam] = useState<ExamType | 'all'>(initialExam ?? 'all');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [query, setQuery] = useState('');

  const isReorder = Boolean(
    initialTypeKey &&
      (typeKey(initialTypeKey) === 'reorderparagraphs' ||
        typeKey(initialTypeKey) === 'reorderparagraph'),
  );

  const taskTitle = useMemo(() => {
    if (!initialTypeKey) return null;
    if (exam !== 'all') {
      const label = typeLabel(exam, 'reading', initialTypeKey);
      if (label) return label;
    }
    return initialTypeKey
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }, [initialTypeKey, exam]);

  const [lastKey, setLastKey] = useState(reloadKey);
  if (reloadKey !== lastKey) {
    setLastKey(reloadKey);
    void reload();
  }

  const shown = useMemo(
    () =>
      passages.filter(passage => {
        if (exam !== 'all' && !examsOf(passage).includes(exam)) return false;
        if (status === 'published' && !passage.isPublished) return false;
        if (status === 'draft' && passage.isPublished) return false;
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return (
          passage.title.toLowerCase().includes(needle) ||
          (passage.topic ?? '').toLowerCase().includes(needle) ||
          passage.tags.some(tag => tag.includes(needle))
        );
      }),
    [passages, exam, status, query],
  );

  const published = passages.filter(passage => passage.isPublished).length;
  const questions = passages.reduce((sum, passage) => sum + passage.questions, 0);

  return (
    <div className="space-y-5 pb-16">
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {taskTitle ? `${taskTitle} questions` : 'Reading bank'}
            </h1>
            <Badge variant="destructive">Admin</Badge>
            {exam !== 'all' && (
              <Badge variant="outline" className="font-semibold text-xs">
                {exam}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            {passages.length} passage{passages.length === 1 ? '' : 's'} · {published} published ·{' '}
            {passages.length - published} draft{passages.length - published === 1 ? '' : 's'} · {questions} question
            {questions === 1 ? '' : 's'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {isReorder ? (
            <Button
              onClick={onNewReorder ?? onNew}
              className="font-bold text-xs rounded-full h-9 px-4 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Re-order Paragraph question
            </Button>
          ) : (
            <Button onClick={onNew} className="font-bold text-xs rounded-full h-9 px-4 shrink-0">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {taskTitle ? `Add passage for ${taskTitle}` : 'New passage'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, topic or tag"
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

      {loading && passages.length === 0 ? (
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
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground">
            {passages.length === 0 ? 'No passages yet' : 'Nothing matches those filters'}
          </p>
          <p className="text-xs text-muted-foreground">
            {passages.length === 0
              ? 'Write one, then add its question sets on its own screen.'
              : 'Clear the search or switch the filters.'}
          </p>
          {passages.length === 0 && (
            <Button onClick={onNew} size="sm" className="font-bold text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New passage
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {shown.map(passage => (
            <PassageCard key={passage.id} passage={passage} onOpen={() => onOpen(passage.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PassageCard({ passage, onOpen }: { passage: PassageSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {examsOf(passage).map(entry => (
              <Badge key={entry} variant="outline" className="text-[9px]">
                {entry}
              </Badge>
            ))}
            {passage.passageSlot && passage.passageSlot !== 'custom' && (
              <Badge variant="secondary" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/25">
                Passage {passage.passageSlot}
              </Badge>
            )}
            {passage.isPublished ? (
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                Published
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px]">
                Draft
              </Badge>
            )}
          </div>
          <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug">{passage.title}</p>
        </div>
        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {passage.wordCount} words
        </span>
        <span>
          {passage.groups} set{passage.groups === 1 ? '' : 's'}
        </span>
        <span className={passage.questions === 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
          {passage.questions} question{passage.questions === 1 ? '' : 's'}
        </span>
      </div>

      {passage.taskTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {passage.taskTypes.slice(0, 3).map(type => (
            <span
              key={type}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground truncate max-w-[140px]"
            >
              {type}
            </span>
          ))}
          {passage.taskTypes.length > 3 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              +{passage.taskTypes.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-xl border border-border/70 bg-muted/30 p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-2.5 h-8 rounded-lg text-[11px] font-bold transition-colors ${
            value === option.value
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

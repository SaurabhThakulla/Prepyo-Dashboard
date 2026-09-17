import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { AnswerSubmission, Mistake, Question, ReadingGroup, ReadingPassage } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import { rendererFor } from '@/components/reading/renderers';
import QuestionPrompt from '@/components/practice/QuestionPrompt';
import ListeningAnswerInput from '@/components/practice/ListeningAnswerInput';
import { isWordHighlightTask, listeningTextTask } from '@/lib/listening';
import { allowsMultipleChoices } from '@/lib/choices';
import { Button } from '@/components/ui/button';


interface RetryTask {
  question: Question;
  passage?: ReadingPassage;
  group?: ReadingGroup;
}

export default function MistakeRetry({ mistake }: { mistake: Mistake }) {
  const client = useQueryClient();
  const { refreshUser } = useApp();
  const [task, setTask] = useState<RetryTask | null>(null);
  const [answer, setAnswer] = useState<Partial<AnswerSubmission>>({});
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const sessionId = useRef<string | null>(null);
  useEffect(() => () => {
    if (sessionId.current) void api.post('/practice/stop', { sessionId: sessionId.current }).catch(() => {});
  }, []);
  const [result, setResult] = useState<ReadingAnswerResult | null>(null);
  const [resolved, setResolved] = useState(mistake.resolved);
  const [error, setError] = useState('');
  const patch = (value: Partial<AnswerSubmission>) => setAnswer(previous => ({ ...previous, ...value }));
  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ['mistakes'] }),
    client.invalidateQueries({ queryKey: ['dashboard'] }),
    client.invalidateQueries({ queryKey: ['progress'] }),
  ]);

  const open = async () => {
    setBusy(true); setError('');
    try {
      setTask(await api.get<RetryTask>(`/mistakes/${encodeURIComponent(mistake.id)}/task`));
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const start = async () => {
    if (!task) return;
    setBusy(true); setError('');
    try {
      const session = await api.post<{ sessionId: string }>('/practice/start', {
        questionId: task.question.id, exam: mistake.exam, skill: task.question.skill,
      });
      sessionId.current = session.sessionId;
      setStarted(true); setStartedAt(Date.now());
      await refreshUser();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const resolve = async () => {
    await api.post(`/mistakes/${encodeURIComponent(mistake.id)}/resolve`, {});
    setResolved(true);
    await invalidate();
    await refreshUser();
  };
  const submit = async () => {
    if (!task || busy || !started) return;
    setBusy(true); setError('');
    try {
      const outcome = await api.post<ReadingAnswerResult>('/practice/attempts', {
        ...answer, questionId: task.question.id, exam: mistake.exam,
        timeSpentSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      });
      setResult(outcome);
      if (outcome.attempt.isCorrect) {
        if (!resolved) await resolve();
        else await invalidate();
      } else { setResolved(false); await invalidate(); }
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  const q = task?.question;
  const Renderer = q ? rendererFor(q.typeId) : null;
  const locked = busy || !!result || !started;
  const hasAnswer = !!(answer.textResponse?.trim() || answer.selectedOptions?.length ||
    Object.values(answer.blankResponses ?? {}).some(value => value.trim()));

  return (
    <div className="space-y-4 border-t border-border pt-4">
      {resolved && <p role="status" className="text-sm font-semibold text-emerald-600">Resolved</p>}
      {!task ? (
        <Button onClick={open} disabled={busy}>{busy ? 'Loading task…' : 'View task & try again'}</Button>
      ) : q && (
        <>
          {task.passage && task.group?.passageDisplay !== 'hidden' && (
            <section aria-label="Reading passage" className="space-y-3 rounded-xl border border-border p-4">
              <h4 className="font-bold">{task.passage.title}</h4>
              {[...task.passage.paragraphs, ...(task.passage.sources ?? [])].map(p => (
                <p key={p.label} className="text-sm leading-relaxed"><strong>{p.label}</strong> {p.text}</p>
              ))}
            </section>
          )}
          <QuestionPrompt question={q} />
          {task.group && (
            <div className="space-y-2 text-sm">
              <p>{task.group.instructions}</p>
              {task.group.boxTitle && <h4 className="font-bold">{task.group.boxTitle}</h4>}
              {task.group.resources?.map(r => <p key={r.label}><strong>{r.label}</strong> {r.text}</p>)}
            </div>
          )}
          {q.skill !== 'reading' && q.skill !== 'listening' ? (
            <p role="status">This task needs an examiner evaluation and cannot be automatically resolved here.</p>
          ) : !started ? (
            <Button onClick={start} disabled={busy}>Start retry</Button>
          ) : (
            <>
              {q.skill === 'reading' && Renderer ? (
                <Renderer question={q} answer={answer as AnswerSubmission} onChange={patch}
                  locked={locked} resources={task.group?.resources} />
              ) : <ListeningRetry question={q} answer={answer} patch={patch} disabled={locked} />}
              {result ? (
                <div className="space-y-3">
                  <p role="status">{result.attempt.isCorrect ? 'Correct! Well done.' : 'Not correct yet. Try the task again to resolve this mistake.'}</p>
                  {result.attempt.isCorrect && !resolved ? (
                    <Button disabled={busy} onClick={async () => {
                      setBusy(true); setError('');
                      try { await resolve(); } catch (err) { setError(errorMessage(err)); }
                      finally { setBusy(false); }
                    }}>Retry saving resolution</Button>
                  ) : !result.attempt.isCorrect && (
                    <Button disabled={busy} onClick={() => {
                      setResult(null); setAnswer({}); setError(''); setStartedAt(Date.now());
                    }}>Try again</Button>
                  )}
                </div>
              ) : <Button onClick={submit} disabled={busy || !hasAnswer}>{busy ? 'Checking…' : 'Submit answer'}</Button>}
            </>
          )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Keep listening payloads identical to the normal practice screen.
function ListeningRetry({ question: q, answer, patch, disabled }: {
  question: Question; answer: Partial<AnswerSubmission>;
  patch: (value: Partial<AnswerSubmission>) => void; disabled: boolean;
}) {
  const selected = answer.selectedOptions ?? [];
  const special = isWordHighlightTask(q) || !!listeningTextTask(q);
  return <div className="space-y-3">
    <ListeningAnswerInput question={q} textAnswer={answer.textResponse ?? ''}
      onTextChange={textResponse => patch({ textResponse })} selectedOptions={selected}
      onSelectionChange={selectedOptions => patch({ selectedOptions })} disabled={disabled} />
    {!special && q.options?.map(option => <label key={option.id} className="flex gap-2 text-sm">
      <input type={allowsMultipleChoices(q) ? 'checkbox' : 'radio'} name={`retry-${q.id}`}
        disabled={disabled} checked={selected.includes(option.id)} onChange={() => patch({
          selectedOptions: allowsMultipleChoices(q)
            ? selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id]
            : [option.id],
        })} />{option.text}
    </label>)}
    {q.blanks?.map((blank, index) => <label key={blank.id} className="block text-sm">
      Gap {index + 1}
      {blank.options?.length ? (
        <select disabled={disabled} value={answer.blankResponses?.[blank.id] ?? ''}
          onChange={e => patch({ blankResponses: { ...answer.blankResponses, [blank.id]: e.target.value } })}>
          <option value="">Select an answer</option>
          {blank.options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : <input className="ml-2 rounded border border-input bg-background p-2" disabled={disabled}
        value={answer.blankResponses?.[blank.id] ?? ''} onChange={e => patch({
          blankResponses: { ...answer.blankResponses, [blank.id]: e.target.value },
        })} />}
    </label>)}
    {!special && !q.options?.length && !q.blanks?.length && <label className="block text-sm">Your answer
      <textarea className="block w-full rounded border border-input bg-background p-2" disabled={disabled}
        value={answer.textResponse ?? ''} onChange={e => patch({ textResponse: e.target.value })} />
    </label>}
  </div>;
}

import React from 'react';
import { ArrowDown } from 'lucide-react';
import { AnswerSubmission, Question, ReadingGroup } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import SentenceGap from '@/components/reading/renderers/SentenceGap';
import MatchDnd, { MatchEntry, MatchChip, MatchSlot } from '@/components/reading/MatchDnd';
import { SetScore } from '@/components/reading/ListMatchingGroup';
import { placeEntry, placedEntries } from '@/components/reading/matchRules';

interface SummaryGroupProps {
  group: ReadingGroup;
  startNumber: number;
  answers: Record<string, AnswerSubmission>;
  results?: Record<string, ReadingAnswerResult>;
  disabled?: boolean;
  onAnswer: (questionId: string, patch: Partial<AnswerSubmission>) => void;
}

export type SummaryForm = 'summary' | 'notes' | 'table' | 'flow-chart';

/** The shape the set is printed in, from its own instruction ("Complete the flow-chart below"). */
export function summaryForm(instructions: string): SummaryForm {
  const text = instructions.toLowerCase();
  if (text.includes('flow-chart') || text.includes('flow chart')) return 'flow-chart';
  if (text.includes('table')) return 'table';
  if (text.includes('notes')) return 'notes';
  return 'summary';
}

/**
 * Summary, note, table and flow-chart completion.
 *
 * Each question is one gap, and the set is printed the way the paper prints
 * it: a running paragraph, a list of notes, a two-column table (a question
 * written "Row | text with ____") or a chain of boxes joined by arrows. With
 * a box of words the gaps take a word dragged from the box, each word once;
 * without one they are typed, with words from the passage.
 */
export default function SummaryGroup({ group, startNumber, answers, results, disabled, onAnswer }: SummaryGroupProps) {
  const form = summaryForm(group.instructions);
  const box: MatchEntry[] = (group.resources ?? []).map(entry => ({ id: entry.text, label: entry.label, text: entry.text }));
  const byId = new Map(box.map(entry => [entry.id, entry]));
  const questionIds = group.questions.map(question => question.id);
  const marked = group.questions.some(question => results?.[question.id]);
  const locked = disabled || marked;
  const used = placedEntries(answers, questionIds);

  const place = (questionId: string, word: string) => {
    if (locked || !questionIds.includes(questionId)) return;
    for (const [id, selected] of Object.entries(placeEntry(answers, questionIds, questionId, word, false))) {
      onAnswer(id, { selectedOptions: selected });
    }
  };

  // One gap's text with its control in place of the "____".
  const gap = (question: Question, index: number, text: string) => {
    const number = startNumber + index;
    const result = results?.[question.id];
    const marker = (
      <span className="mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1 align-middle font-sans text-[10px] font-bold tabular-nums text-primary">
        {number}
      </span>
    );

    if (box.length === 0) {
      return (
        <>
          {marker}
          <SentenceGap
            question={{ ...question, prompt: text }}
            answer={answers[question.id]}
            result={result}
            locked={locked}
            number={number}
            onChange={patch => onAnswer(question.id, patch)}
          />
        </>
      );
    }

    const [before, ...rest] = text.split('____');
    const chosen = answers[question.id]?.selectedOptions?.[0];
    const correctId = result?.review.correctAnswers?.[0];
    return (
      <>
        {before}
        {marker}
        <MatchSlot
          inline
          id={question.id}
          label={`Question ${number}`}
          placeholder="drop word"
          placed={chosen ? byId.get(chosen) ?? { id: chosen, text: chosen } : undefined}
          verdict={result ? result.attempt.isCorrect : undefined}
          correct={correctId ? byId.get(correctId) ?? { id: correctId, text: correctId } : undefined}
          onClear={() => onAnswer(question.id, { selectedOptions: [] })}
        />
        {rest.join('____')}
      </>
    );
  };

  const rows = group.questions.map((question, index) => {
    const [cell, text] = question.prompt.includes(' | ') ? question.prompt.split(' | ', 2) : ['', question.prompt];
    return { question, index, cell, text };
  });

  let body: React.ReactNode;
  if (form === 'table') {
    body = (
      <table className="w-full border-collapse text-[14px] sm:text-[15px]">
        <tbody>
          {rows.map(({ question, index, cell, text }) => (
            <tr key={question.id} className="border-b border-border/70 last:border-0 align-top">
              <th scope="row" className="w-[34%] py-2.5 pr-3 text-left font-semibold text-foreground">{cell}</th>
              <td className="py-2.5 font-reading leading-loose text-foreground/90">{gap(question, index, text)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (form === 'flow-chart') {
    body = (
      <ol className="mx-auto max-w-xl space-y-1">
        {rows.map(({ question, index, text }) => (
          <li key={question.id} className="flex flex-col items-center gap-1">
            <div className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center font-reading text-[15px] leading-loose text-foreground/90">
              {gap(question, index, text)}
            </div>
            {index < rows.length - 1 && <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden />}
          </li>
        ))}
      </ol>
    );
  } else if (form === 'notes') {
    body = (
      <ul className="list-disc space-y-1.5 pl-5 font-reading text-[15px] leading-loose text-foreground/90">
        {rows.map(({ question, index, text }) => (
          <li key={question.id}>{gap(question, index, text)}</li>
        ))}
      </ul>
    );
  } else {
    body = (
      <p className="mx-auto max-w-[66ch] font-reading text-[15px] sm:text-[17px] leading-[2.6] text-foreground/90">
        {rows.map(({ question, index, text }) => (
          <React.Fragment key={question.id}>{gap(question, index, text)} </React.Fragment>
        ))}
      </p>
    );
  }

  const graded = group.questions.filter(question => results?.[question.id]);
  const right = graded.filter(question => results?.[question.id]?.attempt.isCorrect).length;

  const content = (
    <div data-dictionary className="space-y-4 p-3 sm:p-4">
      <div className="rounded-xl bg-muted/20 px-3 py-4 sm:px-5">{body}</div>
      {box.length > 0 && (
        <section aria-label="List of words" className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {box.map(entry => (
              <MatchChip key={entry.id} entry={entry} spent={used.has(entry.id)} />
            ))}
          </div>
          {!locked && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Drag a word into a gap, or tap the word and then the gap. Each word may be used once.
            </p>
          )}
        </section>
      )}
      {graded.length > 0 && <SetScore right={right} total={graded.length} />}
    </div>
  );

  return box.length > 0 ? (
    <MatchDnd entries={box} disabled={locked} onPlace={place}>
      {content}
    </MatchDnd>
  ) : (
    content
  );
}

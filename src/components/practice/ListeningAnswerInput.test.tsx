import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListeningAnswerInput from './ListeningAnswerInput';
import MockAnswerInput from '@/components/mocks/MockAnswerInput';
import { Question } from '@/lib/types';

const question: Question = {
  id: 'q1', examVersionId: 'pte-2026-01', exam: 'PTE', skill: 'listening',
  typeId: 'pte-highlight-incorrect-word', typeName: 'Highlight Incorrect Word',
  title: 'Test', prompt: 'Listen', timeLimitSeconds: 120, difficulty: 'easy', tags: [], points: 10,
  options: [{ id: 'w1', text: 'The' }, { id: 'w2', text: 'word.' }],
};
afterEach(cleanup);

it('supports keyboard toggling, clearing and disabled word controls', async () => {
  const user = userEvent.setup();
  function Harness({ disabled = false }: { disabled?: boolean }) {
    const [selected, setSelected] = useState<string[]>([]);
    return <ListeningAnswerInput question={question} textAnswer="" onTextChange={vi.fn()} selectedOptions={selected} onSelectionChange={setSelected} disabled={disabled} />;
  }
  const { rerender } = render(<Harness />);
  await user.tab();
  const word = screen.getByRole('button', { name: 'The (word 1)' });
  expect(document.activeElement).toBe(word);
  await user.keyboard(' ');
  expect(word.getAttribute('aria-pressed')).toBe('true');
  await user.keyboard('{Enter}');
  expect(word.getAttribute('aria-pressed')).toBe('false');
  await user.click(word);
  await user.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(screen.getByText('0 selected')).toBeDefined();
  rerender(<Harness disabled />);
  await user.click(word);
  expect(word.getAttribute('aria-pressed')).toBe('false');
});

it.each([
  ['summarize-spoken-text', 'Your summary'],
  ['write-from-dictation', 'Your dictation'],
])('records %s text in mock answers', async (typeId, name) => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<MockAnswerInput question={{ ...question, typeId, options: [] }} onChange={onChange} />);
  await user.type(screen.getByRole('textbox', { name }), 'A');
  expect(onChange).toHaveBeenCalledWith({ textResponse: 'A' });
});

it('records selected word IDs in mock answers instead of checkbox rows', async () => {
  const onChange = vi.fn();
  render(<MockAnswerInput question={question} onChange={onChange} />);
  expect(screen.queryByRole('checkbox')).toBeNull();
  await userEvent.setup().click(screen.getByRole('button', { name: 'word. (word 2)' }));
  expect(onChange).toHaveBeenCalledWith({ selectedOptions: ['w2'] });
});

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MockAnswerInput from '@/components/mocks/MockAnswerInput';
import { Question } from '@/lib/types';

afterEach(cleanup);
const question = { id: 'choice', skill: 'listening', typeId: 'ielts-listening-mcq',
  options: [{ id: 'A', text: 'First' }, { id: 'B', text: 'Second' }] } as Question;
describe('mock selection cardinality', () => {
  it('replaces a previous selection for single-answer questions', () => {
    const onChange = vi.fn();
    render(<MockAnswerInput question={question} answer={{ questionId: 'choice', selectedOptions: ['A'] }} onChange={onChange} />);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    fireEvent.click(screen.getByRole('radio', { name: 'Second' }));
    expect(onChange).toHaveBeenCalledWith({ selectedOptions: ['B'] });
  });
  it('preserves other selections for multiple-answer tasks', () => {
    const onChange = vi.fn();
    render(<MockAnswerInput question={{ ...question, typeId: 'pte-listening-mcma' }} answer={{ questionId: 'choice', selectedOptions: ['A'] }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Second' }));
    expect(onChange).toHaveBeenCalledWith({ selectedOptions: ['A', 'B'] });
  });
});

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { READING_TYPES } from '@/lib/readingTypes';
import { AnswerSubmission, Question } from '@/lib/types';
import { RENDERERS, rendererFor } from './index';
import UnsupportedType from './UnsupportedType';
import VerdictTriad from './VerdictTriad';
import ParagraphMatcher from './ParagraphMatcher';
import MCQSingle from './MCQSingle';
import MCQMultiple from './MCQMultiple';
import SentenceCompletion from './SentenceCompletion';
import OrderedChoice from './OrderedChoice';
import ReorderParagraph from './ReorderParagraph';

function question(overrides: Partial<Question>): Question {
  return {
    id: 'q-1',
    examVersionId: 'ielts-2026-01',
    exam: 'IELTS',
    skill: 'reading',
    typeId: READING_TYPES.trueFalse,
    typeName: 'Type',
    title: 'Title',
    prompt: 'The statement under test.',
    timeLimitSeconds: 60,
    difficulty: 'medium',
    tags: [],
    points: 1,
    ...overrides,
  };
}

const verdictOptions = [
  { id: 'TRUE', text: 'True' },
  { id: 'FALSE', text: 'False' },
  { id: 'NOT_GIVEN', text: 'Not Given' },
];

describe('the renderer registry', () => {
  // The bug this whole layer exists to fix: six task types sharing one control
  // because they all happened to arrive with an options array.
  it('gives each task type its own renderer', () => {
    const distinct = new Set(Object.values(RENDERERS));
    expect(distinct.size).toBeGreaterThanOrEqual(8);
  });

  it('covers every task type the app knows about', () => {
    for (const typeId of Object.values(READING_TYPES)) {
      expect(RENDERERS[typeId], `${typeId} has no renderer`).toBeDefined();
    }
  });

  // True/False and Yes/No/Not Given are the same interaction over different
  // words, and Matching Information and Find the Paragraph are the same task
  // over different prompts. Sharing a renderer there is intended; sharing one
  // with a multiple choice is not.
  it('separates the verdict, matching and choice families', () => {
    expect(RENDERERS[READING_TYPES.trueFalse]).toBe(RENDERERS[READING_TYPES.yesNoNotGiven]);
    expect(RENDERERS[READING_TYPES.matchingInformation]).toBe(
      RENDERERS[READING_TYPES.findTheParagraph],
    );
    expect(RENDERERS[READING_TYPES.mcqSingle]).not.toBe(RENDERERS[READING_TYPES.mcqMultiple]);
    expect(RENDERERS[READING_TYPES.trueFalse]).not.toBe(RENDERERS[READING_TYPES.mcqSingle]);
  });

  // An unknown type must say so rather than guess. A generic option grid would
  // render a matching task and an ordering task identically and look like it
  // had worked, which is exactly how this went wrong before.
  it('refuses to guess at an unknown type', () => {
    expect(rendererFor('reading-something-nobody-implemented')).toBe(UnsupportedType);
  });
});

describe('the answer each renderer sends', () => {
  // Every renderer writes one of three fields, because those are the three the
  // server grades. A renderer that invented a fourth would be unscoreable.
  const allowed = new Set<keyof AnswerSubmission>([
    'textResponse',
    'selectedOptions',
    'blankResponses',
  ]);

  function capture() {
    const onChange = vi.fn();
    return {
      onChange,
      patch: () => {
        expect(onChange).toHaveBeenCalled();
        const arg = onChange.mock.calls[0][0] as Partial<AnswerSubmission>;
        for (const key of Object.keys(arg)) {
          expect(allowed.has(key as keyof AnswerSubmission), `${key} is not a graded field`).toBe(true);
        }
        return arg;
      },
    };
  }

  it('True/False/Not Given sends the chosen verdict', () => {
    const { onChange, patch } = capture();
    render(
      <VerdictTriad
        question={question({ typeId: READING_TYPES.trueFalse, options: verdictOptions })}
        locked={false}
        onChange={onChange}
      />,
    );

    // All three verdicts are on screen: the task is choosing between them.
    expect(screen.getByText('True')).toBeDefined();
    expect(screen.getByText('False')).toBeDefined();
    expect(screen.getByText('Not Given')).toBeDefined();

    fireEvent.click(screen.getByText('Not Given'));
    expect(patch()).toEqual({ selectedOptions: ['NOT_GIVEN'] });
  });

  it('Matching Information sends the paragraph letter', () => {
    const { onChange, patch } = capture();
    render(
      <ParagraphMatcher
        question={question({
          typeId: READING_TYPES.matchingInformation,
          prompt: 'Which paragraph contains a reason why?',
          options: [
            { id: 'A', text: 'Paragraph A' },
            { id: 'B', text: 'Paragraph B' },
            { id: 'C', text: 'Paragraph C' },
          ],
        })}
        locked={false}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Paragraph B' }));
    expect(patch()).toEqual({ selectedOptions: ['B'] });
  });

  it('single-answer multiple choice replaces the answer', () => {
    const onChange = vi.fn();
    const props = {
      question: question({
        typeId: READING_TYPES.mcqSingle,
        options: [
          { id: 'A', text: 'First' },
          { id: 'B', text: 'Second' },
        ],
      }),
      answer: { questionId: 'q-1', selectedOptions: ['A'] } as AnswerSubmission,
      locked: false,
      onChange,
    };

    render(<MCQSingle {...props} />);
    fireEvent.click(screen.getByText('Second'));
    expect(onChange).toHaveBeenCalledWith({ selectedOptions: ['B'] });
  });

  it('multiple-answer multiple choice adds to the answer', () => {
    const onChange = vi.fn();
    render(
      <MCQMultiple
        question={question({
          typeId: READING_TYPES.mcqMultiple,
          options: [
            { id: 'A', text: 'First' },
            { id: 'B', text: 'Second' },
          ],
        })}
        answer={{ questionId: 'q-1', selectedOptions: ['A'] } as AnswerSubmission}
        locked={false}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('Second'));
    expect(onChange).toHaveBeenCalledWith({ selectedOptions: ['A', 'B'] });
  });

  it('multiple-answer multiple choice removes an option that is chosen again', () => {
    const onChange = vi.fn();
    render(
      <MCQMultiple
        question={question({
          typeId: READING_TYPES.mcqMultiple,
          options: [
            { id: 'A', text: 'First' },
            { id: 'B', text: 'Second' },
          ],
        })}
        answer={{ questionId: 'q-1', selectedOptions: ['A', 'B'] } as AnswerSubmission}
        locked={false}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('First'));
    expect(onChange).toHaveBeenCalledWith({ selectedOptions: ['B'] });
  });

  it('sentence completion puts the gap inside the sentence', () => {
    const { onChange, patch } = capture();
    render(
      <SentenceCompletion
        question={question({
          typeId: READING_TYPES.sentenceCompletion,
          prompt: 'The Maya described cacao as a gift from the ______.',
          options: [
            { id: 'gods', text: 'gods' },
            { id: 'kings', text: 'kings' },
          ],
        })}
        locked={false}
        onChange={onChange}
      />,
    );

    // The sentence is on screen either side of the gap, not replaced by it.
    expect(screen.getByText(/The Maya described cacao as a gift from the/)).toBeDefined();

    fireEvent.change(screen.getByLabelText('Choose the word that fits'), {
      target: { value: 'gods' },
    });
    expect(patch()).toEqual({ selectedOptions: ['gods'] });
  });

  it('sentence completion falls back to typing when the item has no choices', () => {
    const { onChange, patch } = capture();
    render(
      <SentenceCompletion
        question={question({
          typeId: READING_TYPES.sentenceCompletion,
          prompt: 'Beans must be ______ for several days.',
        })}
        locked={false}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'fermented' } });
    expect(patch()).toEqual({ textResponse: 'fermented' });
  });

  // A fixed-width gap turned a seven-gap summary into a column of boxes with
  // prose scattered between them, so the control is sized to its own words.
  it('sentence completion sizes the gap to the longest word on offer', () => {
    const { onChange } = capture();
    const { rerender } = render(
      <SentenceCompletion
        question={question({
          typeId: READING_TYPES.sentenceCompletion,
          prompt: 'The colony was ______ in midwinter.',
          options: [
            { id: 'cold', text: 'cold' },
            { id: 'warm', text: 'warm' },
          ],
        })}
        locked={false}
        onChange={onChange}
      />,
    );
    const narrow = (screen.getByLabelText('Choose the word that fits') as HTMLElement).style.width;

    rerender(
      <SentenceCompletion
        question={question({
          typeId: READING_TYPES.sentenceCompletion,
          prompt: 'The seeds are described as ______.',
          options: [
            { id: 'recalcitrant', text: 'recalcitrant' },
            { id: 'dormant', text: 'dormant' },
          ],
        })}
        locked={false}
        onChange={onChange}
      />,
    );
    const wide = (screen.getByLabelText('Choose the word that fits') as HTMLElement).style.width;

    expect(narrow).toMatch(/ch$/);
    expect(wide).toMatch(/ch$/);
    expect(parseFloat(wide)).toBeGreaterThan(parseFloat(narrow));
  });

  it('match the heading sends the chosen box', () => {
    const { onChange, patch } = capture();
    render(
      <OrderedChoice
        question={question({
          typeId: READING_TYPES.arrangePassage,
          options: [
            { id: 'A', text: 'The first stage.' },
            { id: 'B', text: 'The second stage.' },
          ],
        })}
        locked={false}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('The second stage.'));
    expect(patch()).toEqual({ selectedOptions: ['B'] });
  });

  it('re-order paragraphs renders the boxes in the order they were dealt', () => {
    render(
      <ReorderParagraph
        question={question({
          typeId: READING_TYPES.reorderParagraphs,
          options: [
            { id: 'C', text: 'Third in truth, first on screen.' },
            { id: 'A', text: 'First in truth.' },
          ],
        })}
        locked={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Third in truth, first on screen.')).toBeDefined();
    expect(screen.getByText('First in truth.')).toBeDefined();
  });

  it('an answered question cannot be answered again', () => {
    const onChange = vi.fn();
    render(
      <VerdictTriad
        question={question({ typeId: READING_TYPES.trueFalse, options: verdictOptions })}
        locked
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('True'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

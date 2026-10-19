import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PracticeAnswerForm from '@/components/practice/PracticeAnswerForm';
import { Question } from '@/lib/types';
import { usePracticeSession } from '@/lib/hooks/usePracticeSession';

afterEach(cleanup);

describe('PracticeAnswerForm cardinality enforcement', () => {
  it('renders radio inputs for single-choice PTE questions and enforces cardinality 1', async () => {
    const user = userEvent.setup();
    const singleChoiceQuestion: Question = {
      id: 'q-single-1',
      examVersionId: 'pte-2026-01',
      exam: 'PTE',
      skill: 'reading',
      typeId: 'pte-reading-mcsa',
      typeName: 'Multiple Choice, Single Answer',
      title: 'Solar Energy',
      prompt: 'According to the text, which of the following is true?',
      timeLimitSeconds: 120,
      difficulty: 'medium',
      tags: [],
      points: 1,
      options: [
        { id: 'opt-a', text: 'Solar panels degrade immediately in low temperatures' },
        { id: 'opt-b', text: 'Photovoltaic cells convert photons into electrical current' },
        { id: 'opt-c', text: 'Silicon wafers generate unlimited thermal reserves' },
      ],
    };

    function Harness() {
      const [selected, setSelected] = useState<string[]>([]);
      const mockSession = {
        grading: 'deterministic',
        submitting: false,
        result: null,
        canSubmit: selected.length > 0,
        textAnswer: '',
        setTextAnswer: vi.fn(),
        selectedOptions: selected,
        setSelectedOptions: setSelected,
        setRecording: vi.fn(),
        selectedSkill: 'reading',
        setSelectedSkill: vi.fn(),
        questions: [singleChoiceQuestion],
        currentQuestion: singleChoiceQuestion,
        loading: false,
        typeParam: 'mcsa',
        blankResponses: {},
        setBlankResponses: vi.fn(),
        submit: vi.fn(),
        selectQuestion: vi.fn(),
        goToNextQuestion: vi.fn(),
      } as unknown as ReturnType<typeof usePracticeSession>;

      return (
        <PracticeAnswerForm
          question={singleChoiceQuestion}
          session={mockSession}
          onAskAITutor={vi.fn()}
        />
      );
    }

    render(<Harness />);

    // Must render radio buttons, not checkboxes
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.queryByRole('checkbox')).toBeNull();

    // Verify all radios share the same group name
    radios.forEach(radio => {
      expect(radio.getAttribute('name')).toBe('question-q-single-1-options');
    });

    // Select option A
    await user.click(radios[0]);
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
    expect((radios[1] as HTMLInputElement).checked).toBe(false);

    // Select option B -> option A must be unselected
    await user.click(radios[1]);
    expect((radios[0] as HTMLInputElement).checked).toBe(false);
    expect((radios[1] as HTMLInputElement).checked).toBe(true);
  });

  it('renders checkboxes for multiple-choice PTE questions and allows multiple selections', async () => {
    const user = userEvent.setup();
    const multiChoiceQuestion: Question = {
      id: 'q-multi-1',
      examVersionId: 'pte-2026-01',
      exam: 'PTE',
      skill: 'reading',
      typeId: 'pte-reading-mcma',
      typeName: 'Multiple Choice, Multiple Answers',
      title: 'Geothermal Plants',
      prompt: 'Which TWO factors influence geothermal reservoir viability?',
      timeLimitSeconds: 150,
      difficulty: 'hard',
      tags: [],
      points: 2,
      options: [
        { id: 'opt-1', text: 'Subsurface temperature gradient' },
        { id: 'opt-2', text: 'Surface humidity percentage' },
        { id: 'opt-3', text: 'Permeability of tectonic rock strata' },
      ],
    };

    function Harness() {
      const [selected, setSelected] = useState<string[]>([]);
      const mockSession = {
        grading: 'deterministic',
        submitting: false,
        result: null,
        canSubmit: selected.length > 0,
        textAnswer: '',
        setTextAnswer: vi.fn(),
        selectedOptions: selected,
        setSelectedOptions: setSelected,
        setRecording: vi.fn(),
        selectedSkill: 'reading',
        setSelectedSkill: vi.fn(),
        questions: [multiChoiceQuestion],
        currentQuestion: multiChoiceQuestion,
        loading: false,
        typeParam: 'mcma',
        blankResponses: {},
        setBlankResponses: vi.fn(),
        submit: vi.fn(),
        selectQuestion: vi.fn(),
        goToNextQuestion: vi.fn(),
      } as unknown as ReturnType<typeof usePracticeSession>;

      return (
        <PracticeAnswerForm
          question={multiChoiceQuestion}
          session={mockSession}
          onAskAITutor={vi.fn()}
        />
      );
    }

    render(<Harness />);

    // Must render checkboxes, not radios
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
    expect(screen.queryByRole('radio')).toBeNull();

    // Check opt-1 and opt-3 simultaneously
    await user.click(checkboxes[0]);
    await user.click(checkboxes[2]);

    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[2] as HTMLInputElement).checked).toBe(true);
  });
});

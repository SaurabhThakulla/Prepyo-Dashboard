import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReorderAnswer from '@/components/reading/ReorderAnswer';

const options = [
  { id: 'a', text: 'The boat enters the chamber.' },
  { id: 'b', text: 'Water raises the boat.' },
  { id: 'c', text: 'The boat leaves the chamber.' },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('whole-card paragraph dragging', () => {
  it('starts a drag from the sentence rather than only the dots', async () => {
    // Supply pointer identity for dnd-kit's primary-pointer check in jsdom.
    class TestPointerEvent extends MouseEvent {
      pointerId = 1;
      isPrimary = true;
    }
    vi.stubGlobal('PointerEvent', TestPointerEvent);
    const user = userEvent.setup();
    render(<ReorderAnswer options={options} value={[]} onChange={vi.fn()} />);

    const sentence = screen.getByText(options[0].text);
    const card = screen.getByRole('button', { name: `Move box 1: ${options[0].text}` });
    expect(card.contains(sentence)).toBe(true);
    expect(card.querySelector('button')).toBeNull();
    expect(card.classList.contains('touch-none')).toBe(true);

    await user.pointer([
      { target: sentence, keys: '[MouseLeft>]', coords: { x: 100, y: 20 } },
      { target: sentence, coords: { x: 100, y: 40 } },
    ]);
    await waitFor(() => expect(card.getAttribute('aria-pressed')).toBe('true'));
    await user.pointer({ keys: '[/MouseLeft]' });
    await waitFor(() => expect(card.getAttribute('aria-pressed')).toBeNull());
  });

  it('keeps the card keyboard accessible and allows cancelling a drag', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReorderAnswer options={options} value={[]} onChange={onChange} />);
    const card = screen.getByRole('button', { name: `Move box 1: ${options[0].text}` });

    await user.tab();
    expect(document.activeElement).toBe(card);
    await user.keyboard('[Space]');
    await waitFor(() => expect(card.getAttribute('aria-pressed')).toBe('true'));
    await user.keyboard('[Escape]');
    await waitFor(() => expect(card.getAttribute('aria-pressed')).toBeNull());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not activate dragging for a locked answer', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReorderAnswer options={options} value={[]} disabled onChange={onChange} />);
    const card = screen.getByRole('button', { name: `Move box 1: ${options[0].text}` });

    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(card.tabIndex).toBe(-1);
    expect(card.classList.contains('touch-none')).toBe(false);
    await user.click(screen.getByText(options[0].text));
    card.focus();
    await user.keyboard('[Space][ArrowDown][Space]');
    expect(card.getAttribute('aria-pressed')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

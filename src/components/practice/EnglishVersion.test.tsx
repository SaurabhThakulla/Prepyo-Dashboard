import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import EnglishVersion from './EnglishVersion';

afterEach(cleanup);

const text = 'Woman: How much are these gloves? Man: They\'re three thousand five hundred won.';

describe('EnglishVersion', () => {
  it('shows each speaker on their own line', () => {
    render(<EnglishVersion text={text} audioUrl="/api/v1/questions/assets/tts_en_1" />);
    expect(screen.getByText('How much are these gloves?')).toBeTruthy();
    expect(screen.getByText("They're three thousand five hundred won.")).toBeTruthy();
    expect(screen.getByText('Woman:')).toBeTruthy();
    expect(screen.getByText('Man:')).toBeTruthy();
  });

  it('plays the stored English recording', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const { container } = render(<EnglishVersion text={text} audioUrl="/api/v1/questions/assets/tts_en_1" />);
    fireEvent.click(screen.getByRole('button', { name: /hear it in english/i }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('/api/v1/questions/assets/tts_en_1');
    play.mockRestore();
  });
});

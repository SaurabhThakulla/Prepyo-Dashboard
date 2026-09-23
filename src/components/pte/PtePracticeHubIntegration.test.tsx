import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PtePracticeHub, { PTE_SECTIONS } from './PtePracticeHub';

afterEach(cleanup);

describe('PtePracticeHub Integration & Task Navigation', () => {
  it('renders all four PTE skill categories and verified task names', () => {
    render(
      <MemoryRouter>
        <PtePracticeHub />
      </MemoryRouter>
    );

    expect(screen.getByText('Speaking')).toBeDefined();
    expect(screen.getByText('Writing')).toBeDefined();
    expect(screen.getByText('Reading')).toBeDefined();
    expect(screen.getByText('Listening')).toBeDefined();

    // Verify canonical title casing for Summarize Spoken Text
    expect(screen.getByText('Summarize Spoken Text')).toBeDefined();
    // Verify post-Aug 2025 speaking additions
    expect(screen.getByText('Summarise Group Discussion')).toBeDefined();
    expect(screen.getByText('Respond to a Situation')).toBeDefined();
  });

  it('triggers onSelectTask with proper skill and canonical task name when clicked', async () => {
    const user = userEvent.setup();
    const onSelectTask = vi.fn();

    render(
      <MemoryRouter>
        <PtePracticeHub onSelectTask={onSelectTask} />
      </MemoryRouter>
    );

    // Click Read Aloud under Speaking
    const readAloudBtn = screen.getByRole('button', { name: /Read Aloud/i });
    await user.click(readAloudBtn);
    expect(onSelectTask).toHaveBeenCalledWith('speaking', 'Read Aloud');

    // Click Summarize Spoken Text under Listening
    const sstBtn = screen.getByRole('button', { name: /Summarize Spoken Text/i });
    await user.click(sstBtn);
    expect(onSelectTask).toHaveBeenCalledWith('listening', 'Summarize Spoken Text');

    // Click Summarize Written Text under Writing
    const swtBtn = screen.getByRole('button', { name: /Summarize Written Text/i });
    await user.click(swtBtn);
    expect(onSelectTask).toHaveBeenCalledWith('writing', 'Summarize Written Text');
  });

  it('highlights the active task card based on activeTypeKey', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PtePracticeHub activeTypeKey="readaloud" />
      </MemoryRouter>
    );

    const readAloudCard = screen.getByRole('button', { name: /Read Aloud/i });
    // Active card receives ring / active styling
    expect(readAloudCard.className).toContain('ring-2');

    // Switch active key to Summarize Spoken Text
    rerender(
      <MemoryRouter>
        <PtePracticeHub activeTypeKey="summarizespokentext" />
      </MemoryRouter>
    );
    const sstCard = screen.getByRole('button', { name: /Summarize Spoken Text/i });
    expect(sstCard.className).toContain('ring-2');
  });
});

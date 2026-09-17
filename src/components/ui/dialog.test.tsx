import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './dialog';

afterEach(cleanup);

describe('responsive dialog', () => {
  it('constrains the panel to the viewport and preserves closing', () => {
    render(<Dialog><DialogTrigger>Open</DialogTrigger><DialogContent><DialogTitle>Mobile dialog</DialogTitle><DialogDescription>Scrollable content</DialogDescription></DialogContent></Dialog>);
    fireEvent.click(screen.getByText('Open'));
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('w-[calc(100%-2rem)]');
    expect(panel.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(panel.className).toContain('overflow-y-auto');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

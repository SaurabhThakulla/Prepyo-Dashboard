import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportThread, { type IssueReport } from './ReportThread';

const REPORT: IssueReport = {
  id: 'r1', userName: 'Asha', path: '/practice', message: 'Audio will not play',
  status: 'open', createdAt: '2026-09-20T10:00:00Z', replyCount: 1,
  replies: [{ id: 'p1', fromStaff: true, authorName: 'Prepyo team', message: 'Which browser?', createdAt: '2026-09-20T11:00:00Z' }],
};

afterEach(cleanup);

describe('ReportThread', () => {
  it('lets staff reply and resolve in one step', async () => {
    const onReply = vi.fn().mockResolvedValue(undefined);
    render(<ReportThread report={REPORT} viewer="staff" onReply={onReply} />);

    expect(screen.getByText('Audio will not play')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'Fixed now' } });
    fireEvent.click(screen.getByRole('button', { name: /Reply and resolve/ }));

    await waitFor(() => expect(onReply).toHaveBeenCalledWith('Fixed now', true));
    await waitFor(() => expect((screen.getByLabelText('Reply') as HTMLTextAreaElement).value).toBe(''));
  });

  it('gives learners a plain reply, labelled from their side', async () => {
    const onReply = vi.fn().mockResolvedValue(undefined);
    render(<ReportThread report={REPORT} viewer="learner" onReply={onReply} />);

    expect(screen.queryByRole('button', { name: /Reply and resolve/ })).toBeNull();
    expect(screen.getByText(/^You ·/)).toBeTruthy();
    expect(screen.getByText(/^Prepyo team ·/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'Chrome' } });
    fireEvent.click(screen.getByRole('button', { name: /Send reply/ }));
    await waitFor(() => expect(onReply).toHaveBeenCalledWith('Chrome', false));
  });

  it('keeps the draft when sending fails', async () => {
    const onReply = vi.fn().mockRejectedValue(new Error('offline'));
    render(<ReportThread report={REPORT} viewer="learner" onReply={onReply} />);

    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'Chrome' } });
    fireEvent.click(screen.getByRole('button', { name: /Send reply/ }));
    await waitFor(() => expect(onReply).toHaveBeenCalled());
    expect((screen.getByLabelText('Reply') as HTMLTextAreaElement).value).toBe('Chrome');
  });

  it('closes the reply box once resolved', () => {
    render(<ReportThread report={{ ...REPORT, status: 'resolved' }} viewer="learner" onReply={vi.fn()} />);
    expect(screen.queryByLabelText('Reply')).toBeNull();
    expect(screen.getByText(/send a new report/)).toBeTruthy();
  });
});

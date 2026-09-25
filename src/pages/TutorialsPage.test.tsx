import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TutorialsPage from './TutorialsPage';

// Mock AppContext
vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    activeExam: 'IELTS',
    user: { id: 'test-user', targetExam: 'IELTS' },
  }),
}));

describe('TutorialsPage component', () => {
  it('renders tutorials page header and active video', () => {
    render(
      <MemoryRouter initialEntries={['/tutorials']}>
        <TutorialsPage />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('Search strategies, topics...')).toBeDefined();
    expect(screen.getByText('Key Exam Strategies')).toBeDefined();
  });

  it('filters video list when clicking skill tab', () => {
    render(
      <MemoryRouter initialEntries={['/tutorials']}>
        <TutorialsPage />
      </MemoryRouter>,
    );

    const speakingTab = screen.getAllByRole('button', { name: /Speaking/i })[0];
    fireEvent.click(speakingTab);

    // Should display speaking lessons
    expect(screen.getByText(/Speaking Video Masterclasses/i)).toBeDefined();
  });

  it('filters video list based on search query', () => {
    render(
      <MemoryRouter initialEntries={['/tutorials']}>
        <TutorialsPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search strategies, topics...');
    fireEvent.change(searchInput, { target: { value: 'True / False' } });

    expect(screen.getAllByText(/True \/ False \/ Not Given/i).length).toBeGreaterThan(0);
  });
});

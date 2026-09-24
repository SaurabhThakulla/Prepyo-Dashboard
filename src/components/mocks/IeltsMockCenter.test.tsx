import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IeltsMockCenter from './IeltsMockCenter';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    activeExam: 'IELTS',
    user: { id: 'test-user', targetExam: 'IELTS', targetModule: 'academic' },
  }),
}));

vi.mock('@/lib/hooks/useMockPapers', () => ({
  useMockPapers: () => ({
    data: [{ id: 'test-1', number: 1, title: 'Test 1' }, { id: 'test-2', number: 2, title: 'Test 2' }],
    isLoading: false,
  }),
}));

describe('IeltsMockCenter component', () => {
  it('renders IELTS full mock simulator card and sectional test cards', () => {
    render(
      <MemoryRouter>
        <IeltsMockCenter header={<div>Header</div>} />
      </MemoryRouter>,
    );

    expect(screen.getByText('IELTS Full Mock Simulator')).toBeDefined();
    expect(screen.getByText('Speaking Sectional Test')).toBeDefined();
    expect(screen.getByText('Writing Sectional Test')).toBeDefined();
    expect(screen.getByText('Reading Sectional Test')).toBeDefined();
    expect(screen.getByText('Listening Sectional Test')).toBeDefined();
  });

  it('navigates to full mock when clicking Start Full Mock Test', () => {
    render(
      <MemoryRouter>
        <IeltsMockCenter header={<div>Header</div>} />
      </MemoryRouter>,
    );

    const fullMockBtn = screen.getByRole('button', { name: /Start Full Mock Test/i });
    fireEvent.click(fullMockBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/mocks?view=full');
  });
});

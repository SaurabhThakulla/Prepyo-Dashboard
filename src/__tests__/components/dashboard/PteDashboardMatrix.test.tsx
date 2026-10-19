import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PteDashboardMatrix from '@/components/dashboard/PteDashboardMatrix';
import { AppProvider } from '@/context/AppContext';

afterEach(cleanup);

describe('PteDashboardMatrix Component', () => {
  it('renders both PTE Academic and PTE Core switcher tabs', () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <PteDashboardMatrix />
        </AppProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'PTE Academic / UKVI' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'PTE Core' })).toBeDefined();
  });

  it('renders all four skill columns with headers and score weight badge', () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <PteDashboardMatrix />
        </AppProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Speaking')).toBeDefined();
    expect(screen.getByText('Writing')).toBeDefined();
    expect(screen.getByText('Reading')).toBeDefined();
    expect(screen.getByText('Listening')).toBeDefined();
    expect(screen.getByText('Score Weight')).toBeDefined();
  });

  it('switches to PTE Core on tab click and displays Core tasks & weights', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <PteDashboardMatrix />
        </AppProvider>
      </MemoryRouter>,
    );

    const coreTab = screen.getByRole('button', { name: 'PTE Core' });
    fireEvent.click(coreTab);

    // In Core, Read Aloud weight is 16%, Repeat Sentence is 19%
    expect(screen.getByText('16%')).toBeDefined();
    expect(screen.getByText('19%')).toBeDefined();

    // Write Email is active in Core
    expect(screen.getByText('Write Email')).toBeDefined();

    // Retell Lecture should be disabled in Core
    expect(screen.getByText(/Retell Lecture \(PTEA\)/)).toBeDefined();
    // Write Essay should be disabled in Core
    expect(screen.getByText(/Write Essay \(PTEA\)/)).toBeDefined();
  });

  it('switches back to PTE Academic and displays Academic tasks & weights', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <PteDashboardMatrix />
        </AppProvider>
      </MemoryRouter>,
    );

    const academicTab = screen.getByRole('button', { name: 'PTE Academic / UKVI' });
    fireEvent.click(academicTab);

    // In Academic, Read Aloud weight is 4%, Describe Image is 15%
    expect(screen.getAllByText('4%').length).toBeGreaterThan(0);
    expect(screen.getByText('15%')).toBeDefined();

    // Write Essay is active in Academic
    expect(screen.getByText('Write Essay')).toBeDefined();

    // Write Email should be disabled in Academic
    expect(screen.getByText(/Write Email \(Core\)/)).toBeDefined();
  });

  it('opens dialog when clicking a locked task with switch button', () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <PteDashboardMatrix />
        </AppProvider>
      </MemoryRouter>,
    );

    // Default is Academic, Write Email is locked
    const lockedEmail = screen.getByText(/Write Email \(Core\)/);
    fireEvent.click(lockedEmail);

    expect(screen.getByText(/Task Unavailable in PTE Academic/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Switch to PTE Core/i })).toBeDefined();
  });
});

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TutorialsPage from './TutorialsPage';

// The learner's exam; a test may switch it.
let mockExam = 'IELTS';

let globalState = {
  viewMode: 'standard',
  activeVideo: null as any,
  listeners: [] as Array<() => void>,
};

vi.mock('@/context/AppContext', () => {
  const React = require('react');
  return {
    useApp: () => {
      const [viewMode, setViewModeState] = React.useState(globalState.viewMode);
      const [activeVideo, setActiveVideoState] = React.useState(globalState.activeVideo);

      React.useEffect(() => {
        const listener = () => {
          setViewModeState(globalState.viewMode);
          setActiveVideoState(globalState.activeVideo);
        };
        globalState.listeners.push(listener);
        return () => {
          globalState.listeners = globalState.listeners.filter(l => l !== listener);
        };
      }, []);

      const setTutorialViewMode = (mode: string) => {
        globalState.viewMode = mode;
        globalState.listeners.forEach(l => l());
      };

      const setActiveTutorialVideo = (v: any) => {
        globalState.activeVideo = v;
        globalState.listeners.forEach(l => l());
      };

      return {
        activeExam: mockExam,
        user: { id: 'test-user', targetExam: mockExam },
        activeTutorialVideo: activeVideo,
        setActiveTutorialVideo,
        tutorialViewMode: viewMode,
        setTutorialViewMode,
        closeTutorialVideo: () => {
          globalState.activeVideo = null;
          globalState.viewMode = 'standard';
          globalState.listeners.forEach(l => l());
        },
      };
    },
  };
});

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

  it('switches between standard, theater, and mini view modes cleanly', () => {
    render(
      <MemoryRouter initialEntries={['/tutorials']}>
        <TutorialsPage />
      </MemoryRouter>,
    );

    // Initial controls in Standard mode
    expect(screen.getByTitle('Big Screen (Theater wide view)')).toBeDefined();
    expect(screen.getByTitle('Mini Player (Watch freely while browsing)')).toBeDefined();

    // Switch to Big Screen (Theater)
    const bigScreenButton = screen.getByTitle('Big Screen (Theater wide view)');
    fireEvent.click(bigScreenButton);
    expect(globalState.viewMode).toBe('theater');

    // Switch to Mini Player
    const miniPlayerButton = screen.getByTitle('Mini Player (Watch freely while browsing)');
    fireEvent.click(miniPlayerButton);

    // On TutorialsPage, switching to mini mode displays the placeholder card
    expect(screen.getByText(/Watching in Mini Player:/i)).toBeDefined();

    // Switch back to Standard
    const standardButton = screen.getAllByRole('button', { name: /Standard View/i })[0];
    fireEvent.click(standardButton);
    expect(globalState.viewMode).toBe('standard');
  });
});

describe('TutorialsPage for EPS-TOPIK', () => {
  it('shows the Korean videos, not PTE or IELTS ones, and no mock button', () => {
    mockExam = 'EPS_TOPIK';
    globalState = { viewMode: 'standard', activeVideo: null, listeners: [] };
    try {
      render(
        <MemoryRouter initialEntries={['/tutorials']}>
          <TutorialsPage />
        </MemoryRouter>,
      );
      expect(screen.getAllByText('Korean Vocabulary for the EPS-TOPIK Exam').length).toBeGreaterThan(0);
      expect(screen.queryByText(/Summarize Spoken Text/)).toBeNull();
      expect(screen.queryByText(/IELTS Speaking/)).toBeNull();
      expect(screen.queryByText(/Mock Tests/)).toBeNull();
      // EPS-TOPIK has no speaking or writing section to filter by.
      expect(screen.queryByRole('button', { name: /^Speaking/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Writing/ })).toBeNull();
      expect(screen.getByRole('button', { name: /^Reading/ })).toBeTruthy();
    } finally {
      mockExam = 'IELTS';
    }
  });
});

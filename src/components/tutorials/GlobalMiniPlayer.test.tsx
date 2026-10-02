import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GlobalMiniPlayer from './GlobalMiniPlayer';

let mockLocation = '/dashboard';
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: mockLocation }),
    useNavigate: () => mockNavigate,
  };
});

let mockActiveTutorialVideo: any = {
  id: 'ielts-speaking-intro',
  title: 'IELTS Speaking Masterclass',
  youtubeId: 'mock-yt-123',
};
let mockTutorialViewMode = 'mini';
let mockIsTutorOpen = false;
let mockActiveTestSession: any = null;
const mockSetTutorialViewMode = vi.fn();
const mockCloseTutorialVideo = vi.fn();

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    activeTutorialVideo: mockActiveTutorialVideo,
    tutorialViewMode: mockTutorialViewMode,
    setTutorialViewMode: mockSetTutorialViewMode,
    closeTutorialVideo: mockCloseTutorialVideo,
    isTutorOpen: mockIsTutorOpen,
    activeTestSession: mockActiveTestSession,
  }),
}));

describe('GlobalMiniPlayer component', () => {
  beforeEach(() => {
    mockLocation = '/dashboard';
    mockTutorialViewMode = 'mini';
    mockIsTutorOpen = false;
    mockActiveTestSession = null;
    mockActiveTutorialVideo = {
      id: 'ielts-speaking-intro',
      title: 'IELTS Speaking Masterclass',
      youtubeId: 'mock-yt-123',
    };
    vi.clearAllMocks();
  });

  it('renders floating mini player on dashboard pages when in mini mode', () => {
    mockLocation = '/dashboard';
    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    expect(screen.getByText('IELTS Speaking Masterclass')).toBeDefined();
    const aside = screen.getByLabelText('Floating mini video player');
    expect(aside.style.display).not.toBe('none');
  });

  it('runs and displays in practice section while browsing', () => {
    mockLocation = '/practice';
    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    expect(screen.getByText('IELTS Speaking Masterclass')).toBeDefined();
    const aside = screen.getByLabelText('Floating mini video player');
    expect(aside.style.display).not.toBe('none');
  });

  it('completely shuts off when starting an active practice task or test session', () => {
    mockLocation = '/practice';
    mockActiveTestSession = { isActive: true, title: 'Speaking Read Aloud' };
    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    expect(mockCloseTutorialVideo).toHaveBeenCalled();
  });

  it('completely shuts off when starting an active PTE mock exam', () => {
    mockLocation = '/mocks/pte/full';
    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    expect(mockCloseTutorialVideo).toHaveBeenCalled();
  });

  it('animates to the left side when AI Coach slide is open', () => {
    mockLocation = '/dashboard';
    mockIsTutorOpen = true;
    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    const aside = screen.getByLabelText('Floating mini video player');
    expect(aside.style.left).toBe('24px');
  });

  it('navigates to standard view on tutorials page when standard button clicked', () => {
    mockLocation = '/leaderboard';
    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    const standardBtn = screen.getByTitle('Standard View');
    fireEvent.click(standardBtn);

    expect(mockSetTutorialViewMode).toHaveBeenCalledWith('standard');
    expect(mockNavigate).toHaveBeenCalledWith('/tutorials?video=ielts-speaking-intro');
  });

  it('navigates to big screen (theater) view when expand button clicked', () => {
    mockLocation = '/profile';
    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    const bigScreenBtn = screen.getByTitle('Expand to Big Screen');
    fireEvent.click(bigScreenBtn);

    expect(mockSetTutorialViewMode).toHaveBeenCalledWith('theater');
    expect(mockNavigate).toHaveBeenCalledWith('/tutorials?video=ielts-speaking-intro');
  });

  it('calls closeTutorialVideo when close button is clicked', () => {
    mockLocation = '/dashboard';
    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    const closeBtn = screen.getByTitle('Close Mini Player');
    fireEvent.click(closeBtn);

    expect(mockCloseTutorialVideo).toHaveBeenCalled();
  });

  it('animates to the left side when any question or mock slide drawer is open', async () => {
    mockLocation = '/practice';
    mockIsTutorOpen = false;

    // Simulate question drawer panel in DOM
    const drawer = document.createElement('aside');
    drawer.id = 'question-drawer-panel';
    drawer.className = 'fixed right-0 translate-x-0';
    document.body.appendChild(drawer);

    const { unmount } = render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    const aside = screen.getByLabelText('Floating mini video player');
    expect(aside.style.left).toBe('24px');

    unmount();
    document.body.removeChild(drawer);
  });

  it('remains in the right corner when left-side sidebar is open and right drawer is closed', () => {
    mockLocation = '/dashboard';
    mockIsTutorOpen = false;

    // Simulate left sidebar in DOM
    const leftSidebar = document.createElement('aside');
    leftSidebar.className = 'w-80 shrink-0 border-r border-border bg-sidebar left-0';
    document.body.appendChild(leftSidebar);

    render(
      <MemoryRouter>
        <GlobalMiniPlayer />
      </MemoryRouter>,
    );

    const aside = screen.getByLabelText('Floating mini video player');
    // Not left: 24px, remains docked in right corner (windowWidth - playerWidth - 24)
    expect(aside.style.left).not.toBe('24px');

    document.body.removeChild(leftSidebar);
  });
});

describe('GlobalMiniPlayer watchers', () => {
  it('starts no timers and no page observer while no video is open', () => {
    mockLocation = '/tutorials';
    mockTutorialViewMode = 'standard';
    mockIsTutorOpen = false;
    mockActiveTestSession = null;
    mockActiveTutorialVideo = null;
    const setInterval = vi.spyOn(window, 'setInterval');
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const { container } = render(<MemoryRouter><GlobalMiniPlayer /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
    expect(setInterval).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
    setInterval.mockRestore();
    observe.mockRestore();
  });

  it('watches the page once a video is open', () => {
    mockLocation = '/dashboard';
    mockTutorialViewMode = 'mini';
    mockActiveTestSession = null;
    mockActiveTutorialVideo = { id: 'v', title: 'A video', youtubeId: 'yt' };
    const setInterval = vi.spyOn(window, 'setInterval');
    render(<MemoryRouter><GlobalMiniPlayer /></MemoryRouter>);
    expect(setInterval).toHaveBeenCalled();
    setInterval.mockRestore();
  });
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tv, Layout, X, GripHorizontal } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function GlobalMiniPlayer() {
  const {
    activeTutorialVideo,
    tutorialViewMode,
    setTutorialViewMode,
    closeTutorialVideo,
    isTutorOpen,
    activeTestSession,
  } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );
  const [windowHeight, setWindowHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );
  const [slotRect, setSlotRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [rightDrawerWidth, setRightDrawerWidth] = useState(560);

  const playerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Completely shut off when starting an active practice task or mock test session
  const isTestActive = Boolean(
    activeTestSession?.isActive ||
    (pathname.startsWith('/mocks/pte/') && !pathname.includes('/report/'))
  );

  useEffect(() => {
    if (isTestActive && activeTutorialVideo) {
      closeTutorialVideo();
    }
  }, [isTestActive, activeTutorialVideo, closeTutorialVideo]);

  // Detect ANY right-side slide-over drawer (AI Tutor, QuestionDrawer, MockPaperDrawer, NotificationDrawer, etc.)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const checkRightDrawers = () => {
      // 1. AI Tutor Drawer
      if (isTutorOpen) {
        setIsRightDrawerOpen(true);
        setRightDrawerWidth(530);
        return;
      }

      // 2. Question Drawer Panel
      const questionDrawer = document.getElementById('question-drawer-panel');
      if (questionDrawer && !questionDrawer.classList.contains('translate-x-full')) {
        setIsRightDrawerOpen(true);
        setRightDrawerWidth(questionDrawer.offsetWidth || 560);
        return;
      }

      // 3. Mock Paper Drawer Panel
      const mockDrawer = document.getElementById('mock-paper-drawer-panel');
      if (mockDrawer && !mockDrawer.classList.contains('translate-x-full')) {
        setIsRightDrawerOpen(true);
        setRightDrawerWidth(mockDrawer.offsetWidth || 560);
        return;
      }

      // 4. Notification Drawer
      const notifDrawer = document.querySelector('div[role="dialog"][aria-label="Notifications"]');
      if (notifDrawer) {
        setIsRightDrawerOpen(true);
        setRightDrawerWidth(notifDrawer.clientWidth || 400);
        return;
      }

      setIsRightDrawerOpen(false);
    };

    checkRightDrawers();

    // Observe DOM mutations to immediately detect open/close transitions of drawers
    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(checkRightDrawers);
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        subtree: true,
        childList: true,
      });
    }

    const interval = setInterval(checkRightDrawers, 200);

    return () => {
      observer?.disconnect();
      clearInterval(interval);
    };
  }, [isTutorOpen]);

  // Track window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
      setPosition(prev => {
        if (!prev || !playerRef.current) return prev;
        const playerWidth = playerRef.current.offsetWidth || 360;
        const playerHeight = playerRef.current.offsetHeight || 240;
        const maxX = Math.max(8, window.innerWidth - playerWidth - 8);
        const maxY = Math.max(8, window.innerHeight - playerHeight - 8);
        return {
          x: Math.min(Math.max(prev.x, 8), maxX),
          y: Math.min(Math.max(prev.y, 8), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track embedded slot on TutorialsPage when in standard or theater mode
  useEffect(() => {
    if (pathname !== '/tutorials' || tutorialViewMode === 'mini') {
      setSlotRect(null);
      return;
    }

    const updateSlot = () => {
      const slotEl = document.getElementById('tutorial-video-slot');
      if (slotEl) {
        const rect = slotEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSlotRect({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
        }
      }
    };

    updateSlot();
    const interval = setInterval(updateSlot, 120);
    window.addEventListener('resize', updateSlot);
    window.addEventListener('scroll', updateSlot, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateSlot);
      window.removeEventListener('scroll', updateSlot);
    };
  }, [pathname, tutorialViewMode]);

  // Handle Mouse / Touch Dragging
  const handleStartDrag = (clientX: number, clientY: number) => {
    if (!playerRef.current) return;
    const rect = playerRef.current.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: rect.left,
      startY: rect.top,
    };
    setIsDragging(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    e.preventDefault();
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    if (e.touches.length === 1) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const playerWidth = playerRef.current?.offsetWidth || 360;
      const playerHeight = playerRef.current?.offsetHeight || 240;

      const minX = 8;
      const maxX = Math.max(8, window.innerWidth - playerWidth - 8);
      const minY = 8;
      const maxY = Math.max(8, window.innerHeight - playerHeight - 8);

      const nextX = Math.min(Math.max(dragStartRef.current.startX + dx, minX), maxX);
      const nextY = Math.min(Math.max(dragStartRef.current.startY + dy, minY), maxY);

      setPosition({ x: nextX, y: nextY });
    },
    [isDragging],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartRef.current.mouseX;
      const dy = e.touches[0].clientY - dragStartRef.current.mouseY;

      const playerWidth = playerRef.current?.offsetWidth || 360;
      const playerHeight = playerRef.current?.offsetHeight || 240;

      const minX = 8;
      const maxX = Math.max(8, window.innerWidth - playerWidth - 8);
      const minY = 8;
      const maxY = Math.max(8, window.innerHeight - playerHeight - 8);

      const nextX = Math.min(Math.max(dragStartRef.current.startX + dx, minX), maxX);
      const nextY = Math.min(Math.max(dragStartRef.current.startY + dy, minY), maxY);

      setPosition({ x: nextX, y: nextY });
    },
    [isDragging],
  );

  const handleEndDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEndDrag);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEndDrag);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEndDrag]);

  if (!activeTutorialVideo || isTestActive) {
    return null;
  }

  const isEmbeddedOnTutorials = pathname === '/tutorials' && tutorialViewMode !== 'mini' && slotRect !== null;

  const navigateToMode = (mode: 'standard' | 'theater') => {
    setTutorialViewMode(mode);
    navigate(`/tutorials?video=${activeTutorialVideo.id}`);
  };

  const playerWidth = playerRef.current?.offsetWidth || 360;
  const playerHeight = playerRef.current?.offsetHeight || 240;

  const isSlideOpen = Boolean(isTutorOpen || isRightDrawerOpen);

  // Default docked floating coordinates:
  // - When any slide drawer is open: smoothly animate to left side (24px)
  // - When slide drawer is closed: docked at bottom right (windowWidth - playerWidth - 24px)
  const defaultLeft = isSlideOpen
    ? 24
    : Math.max(24, windowWidth - playerWidth - 24);

  const defaultTop = Math.max(24, windowHeight - playerHeight - 24);

  let currentX = defaultLeft;
  let currentY = defaultTop;

  if (position) {
    if (isSlideOpen) {
      const drawerWidth = rightDrawerWidth || 560;
      const minClearanceLeft = Math.max(24, windowWidth - drawerWidth - playerWidth - 16);
      if (position.x > minClearanceLeft) {
        currentX = 24;
      } else {
        currentX = position.x;
      }
    } else {
      currentX = position.x;
    }
    currentY = position.y;
  }

  return (
    <aside
      ref={playerRef}
      aria-label="Floating mini video player"
      style={
        isEmbeddedOnTutorials
          ? {
              position: 'absolute',
              top: `${slotRect.top}px`,
              left: `${slotRect.left}px`,
              width: `${slotRect.width}px`,
              height: `${slotRect.height}px`,
              zIndex: 30,
              transition: isDragging ? 'none' : 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }
          : {
              position: 'fixed',
              left: `${currentX}px`,
              top: `${currentY}px`,
              zIndex: 60,
              transition: isDragging
                ? 'none'
                : 'left 0.45s cubic-bezier(0.16, 1, 0.3, 1), top 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            }
      }
      className={
        isEmbeddedOnTutorials
          ? 'overflow-hidden bg-black flex flex-col items-center justify-center pointer-events-auto rounded-t-2xl'
          : `w-80 sm:w-96 shadow-2xl rounded-2xl border border-border bg-card overflow-hidden select-none ${
              isDragging ? 'ring-2 ring-primary shadow-2xl cursor-grabbing' : 'hover:shadow-xl'
            }`
      }
    >
      {/* Draggable Header Bar (hidden in embedded mode, visible in mini player mode) */}
      <div
        key="mini-player-header-bar"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`flex items-center justify-between px-3 py-2 bg-muted/95 backdrop-blur-md border-b border-border cursor-grab active:cursor-grabbing select-none w-full ${
          isEmbeddedOnTutorials ? 'hidden' : 'flex'
        }`}
        title="Drag to move mini player anywhere on screen"
      >
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
          <span className="text-xs font-bold truncate text-foreground">
            {activeTutorialVideo.title}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => navigateToMode('theater')}
            title="Expand to Big Screen"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <Tv className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigateToMode('standard')}
            title="Standard View"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <Layout className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={closeTutorialVideo}
            title="Close Mini Player"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 16:9 Persistent Video Player Iframe Container */}
      <div
        key="mini-player-iframe-slot"
        className={isEmbeddedOnTutorials ? 'w-full h-full relative' : 'aspect-video bg-black relative w-full'}
      >
        <iframe
          key={`persistent-yt-player-${activeTutorialVideo.youtubeId}`}
          src={`https://www.youtube-nocookie.com/embed/${activeTutorialVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`}
          title={activeTutorialVideo.title}
          className="w-full h-full border-0 pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </aside>
  );
}

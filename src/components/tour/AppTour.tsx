import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { isAdmin } from '@/lib/types';
import { cn } from '@/lib/utils';
import { backStep, TOUR_STEPS, TourContext } from './steps';
import { bindTourUser, endTour, goToStep, startTour, tourSeen, useTour } from './tourStore';
import TourCard, { TourPill } from './TourCard';

type Box = { top: number; left: number; width: number; height: number; pinned?: boolean };

/** The first element with a box on screen (any scroll position), trying the comma-separated selectors in order. */
export function findVisible(selector: string | undefined): HTMLElement | null {
  for (const part of selector?.split(',') ?? []) {
    for (const el of document.querySelectorAll<HTMLElement>(part)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth) return el;
    }
  }
  return null;
}

/** True when scrolling the page cannot move the element (it, or a parent, is fixed or sticky). */
function isPinned(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    const { position } = getComputedStyle(node);
    if (position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}

/**
 * Where the step card goes: beside the lit element on a computer. On a phone, a sheet docked above
 * the tab bar (`insets`), with the page scrolled to show the lit element above it; under the top bar
 * only when the lit element is pinned low on screen (the tab bar itself).
 */
export function placeCard(
  target: Box | null,
  card: { width: number; height: number },
  vw: number,
  vh: number,
  insets = { top: 72, bottom: 84 },
): React.CSSProperties {
  const gap = 14;
  const margin = vw < 640 ? 12 : 16;
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

  if (vw < 640) {
    const pinnedLow = !!target?.pinned && target.height < vh * 0.6 && target.top + target.height / 2 > vh / 2;
    return pinnedLow ? { top: insets.top, left: margin, right: margin } : { bottom: insets.bottom, left: margin, right: margin };
  }
  if (!target) return { top: (vh - card.height) / 2, left: (vw - card.width) / 2 };

  const bottom = target.top + target.height;
  const right = target.left + target.width;
  const left = clamp(target.left + target.width / 2 - card.width / 2, margin, vw - card.width - margin);
  const top = clamp(target.top, margin, vh - card.height - margin);
  if (bottom + gap + card.height <= vh - margin) return { top: bottom + gap, left };
  if (target.top - gap - card.height >= margin) return { top: target.top - gap - card.height, left };
  if (right + gap + card.width <= vw - margin) return { top, left: right + gap };
  if (target.left - gap - card.width >= margin) return { top, left: target.left - gap - card.width };
  return { bottom: margin, right: margin };
}

/**
 * How far to scroll a phone so the lit element sits in the room the docked card leaves free:
 * just far enough to fit it whole, or, when it is too tall, far enough to show its top.
 */
export function phoneScrollDelta(target: Box, card: { top: number; bottom: number }, vh: number, insets: { top: number; bottom: number }): number {
  const gap = 12;
  // Docked to whichever edge it is nearer; a tall sheet's top can be above the middle of a short phone.
  const docksBottom = vh - card.bottom < card.top;
  const room = docksBottom ? { top: insets.top, bottom: card.top - gap } : { top: card.bottom + gap, bottom: vh - insets.bottom };
  const bottom = target.top + target.height;
  if (target.height > room.bottom - room.top || target.top < room.top) return target.top - room.top;
  return Math.max(0, bottom - room.bottom);
}

/** Room taken by the phone's top bar and tab bar, so a docked card sits clear of both. */
function phoneInsets(vh: number): { top: number; bottom: number; tabBar: boolean } {
  const header = findVisible('header');
  const tabBar = findVisible('nav[aria-label="Main"]');
  return {
    top: (header ? Math.max(0, header.getBoundingClientRect().bottom) : 0) + 12,
    bottom: (tabBar ? vh - tabBar.getBoundingClientRect().top : 0) + 12,
    tabBar: tabBar !== null,
  };
}

// A slow glow for "your turn" and a small shake when the dimmed page is tapped; both still for people who ask for less motion.
const TOUR_CSS = `@keyframes prepyo-tour-glow{0%,100%{box-shadow:0 0 0 0 hsl(var(--primary) / 0.45)}50%{box-shadow:0 0 0 10px hsl(var(--primary) / 0)}}
@keyframes prepyo-tour-nudge{0%,100%{translate:0}25%{translate:-6px}75%{translate:6px}}
@media (prefers-reduced-motion: no-preference){.prepyo-tour-glow{animation:prepyo-tour-glow 2.6s ease-in-out infinite}.prepyo-tour-nudge{animation:prepyo-tour-nudge .35s ease-in-out}}`;

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height && a.pinned === b.pinned);

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(el.tagName));

/** The guided tour over the real app, mounted once in the layout. */
export default function AppTour() {
  const { step: index, did } = useTour();
  const { user, activeExam, activeTestSession, setActiveTestSession, markTourSeen } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => bindTourUser(user && !isAdmin(user) ? user.id : null), [user]);

  // Once a tour has started here (or this browser saw one before the account kept it), the
  // account remembers it. Sent once per learner; a failed save only means it may open once more.
  const markedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user || isAdmin(user) || user.tourSeenAt !== null || markedFor.current === user.id) return;
    if (index === null && !tourSeen(user.id)) return;
    markedFor.current = user.id;
    void markTourSeen().catch(() => {});
  }, [user, index, markTourSeen]);

  const step = index === null ? undefined : TOUR_STEPS[index];
  const [box, setBox] = useState<Box | null>(null);
  const [paused, setPaused] = useState(false);
  // Tucked into the slim bar: null leaves it to `tall` below, true or false is the learner's own choice.
  const [tuck, setTuck] = useState<boolean | null>(null);
  const [nudge, setNudge] = useState(false);
  // The page cannot scroll the lit element clear of the bottom sheet, so the card docks at the top instead.
  const [stuck, setStuck] = useState(false);
  const [cardSize, setCardSize] = useState({ width: 360, height: 240 });
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const cardRef = useRef<HTMLDivElement>(null);
  // On a phone a very tall lit element (a pop-up, a full-screen list) starts with the tour as a slim bar, so it stays in view.
  const tall = viewport.width < 640 && !!box && box.height > viewport.height * 0.6;
  const tucked = !paused && (tuck ?? tall);
  const stepStarted = useRef(0);
  const lastSeen = useRef(0);
  const scrolled = useRef(false);
  const offPathTicks = useRef(0);
  const clearing = useRef({ tries: 0, settled: false, last: 0 });

  const touch = useMemo(() => window.matchMedia?.('(pointer: coarse)').matches ?? false, [viewport.width]);
  const ctx = useMemo<TourContext>(
    () => ({
      pathname: location.pathname,
      params: new URLSearchParams(location.search),
      exam: activeExam,
      paid: !!user && user.role !== 'suru' && user.paidPlanActive,
      touch,
      visible: selector => findVisible(selector) !== null,
    }),
    [location.pathname, location.search, activeExam, user, touch],
  );

  /** `didId`: the learner really did the step (not skipped), for the finish checklist. */
  const advance = useCallback(
    (didId?: string) => {
      if (index === null) return;
      if (index + 1 >= TOUR_STEPS.length) endTour();
      else goToStep(index + 1, didId);
    },
    [index],
  );

  // Back skips over steps whose target is not on this screen (they would only skip forward again).
  const back = useMemo(() => {
    if (index === null) return null;
    let target = backStep(index);
    while (target !== null && TOUR_STEPS[target].optional && !findVisible(TOUR_STEPS[target].target)) target = backStep(target);
    return target;
  }, [index, box]);

  // Leaving a running practice ends it first, as the sidebar does.
  const leaveTo = useCallback(
    async (href: string) => {
      if (activeTestSession?.isActive) {
        try {
          await activeTestSession.onStop?.();
        } finally {
          setActiveTestSession(null);
        }
      }
      navigate(href);
    },
    [activeTestSession, setActiveTestSession, navigate],
  );

  const next = useCallback(() => {
    if (!step?.next) return;
    if (step.next.href) void leaveTo(step.next.href);
    advance(step.id);
  }, [step, leaveTo, advance]);

  useEffect(() => {
    stepStarted.current = Date.now();
    lastSeen.current = 0;
    scrolled.current = false;
    offPathTicks.current = 0;
    clearing.current = { tries: 0, settled: false, last: 0 };
    setStuck(false);
    setPaused(false);
    setTuck(null);
    setBox(null);
  }, [index]);

  // Follows the lit element and checks, a few times a second, whether the learner has done the step.
  useEffect(() => {
    if (!step) return;
    // On a phone the card is a sheet across the screen, so the page scrolls the lit element into the room beside it.
    // Retried a few times (the page may still be loading), then left alone so it never fights the learner's scrolling.
    const clearPhoneCard = (target: Box) => {
      const card = cardRef.current?.getBoundingClientRect();
      const state = clearing.current;
      // Wait for an earlier scroll to finish before measuring again.
      if (!card || Date.now() - state.last < 700) return;
      const delta = phoneScrollDelta(target, card, window.innerHeight, phoneInsets(window.innerHeight));
      const page = document.scrollingElement;
      const canScrollDown = page ? page.scrollHeight - window.innerHeight - window.scrollY : 0;
      // Checked every time: a page that ends too soon can never lift the element clear of the sheet.
      if (delta > canScrollDown + 2 && window.innerHeight - card.bottom < card.top) setStuck(true);
      if (Math.abs(delta) <= 2) state.settled = true;
      if (state.settled || state.tries >= 3) return;
      state.tries += 1;
      state.last = Date.now();
      window.scrollBy({ top: delta, behavior: 'smooth' });
    };
    const tick = () => {
      const el = findVisible(step.target);
      // Phones scroll in the effect below, once the card's place is known.
      if (el && !scrolled.current && window.innerWidth >= 640 && step.scroll !== false) {
        scrolled.current = true;
        const rect = el.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const rect = el?.getBoundingClientRect();
      const found = rect && el ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height, pinned: isPinned(el) } : null;
      if (found) lastSeen.current = Date.now();
      // A target gone for a moment (Submit turning into "Checking…") keeps its ring rather than flickering.
      const holding = !found && Date.now() - lastSeen.current < 800;
      setBox(prev => (holding || sameBox(prev, found) ? prev : found));
      if (found && !found.pinned && window.innerWidth < 640 && step.scroll !== false) clearPhoneCard(found);
      setViewport(prev =>
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : { width: window.innerWidth, height: window.innerHeight },
      );

      // Done first: an action step often ends on another page.
      if (step.done?.(ctx)) return advance(step.id);

      const offPath = !!step.path && ctx.pathname !== step.path;
      offPathTicks.current = offPath ? offPathTicks.current + 1 : 0;
      setPaused(offPathTicks.current >= 3);
      if (offPath) return;

      if (step.skipIf?.(ctx)) advance();
      else if (step.optional && !el && Date.now() - stepStarted.current > 1500) advance();
    };
    tick();
    const timer = window.setInterval(tick, 200);
    window.addEventListener('scroll', tick, true);
    window.addEventListener('resize', tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('scroll', tick, true);
      window.removeEventListener('resize', tick);
    };
  }, [step, ctx, advance]);

  // Coming back from a pause opens the card again; either change re-fits the page around the card on a phone.
  useEffect(() => {
    if (!paused) setTuck(null);
    clearing.current = { tries: 0, settled: false, last: 0 };
  }, [paused]);
  useEffect(() => {
    clearing.current = { tries: 0, settled: false, last: 0 };
  }, [tuck, stuck]);

  // On a "your turn" step, the first tap on the page tucks the card away so it never covers the work.
  useEffect(() => {
    if (!step?.done || tucked) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest?.('[data-tour-root]')) setTuck(true);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [step, tucked]);

  // Keys on a computer: Enter or → for Next, ← for Back, Esc to tuck the card away or bring it back.
  useEffect(() => {
    if (!step || paused) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') {
        if (document.querySelector('[role="dialog"][data-state="open"]')) return;
        setTuck(!tucked);
        return;
      }
      if (isTyping(event.target)) return;
      if ((event.key === 'Enter' || event.key === 'ArrowRight') && step.next) {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft' && back !== null) {
        event.preventDefault();
        goToStep(back);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, paused, next, back, tucked]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width !== cardSize.width || height !== cardSize.height) setCardSize({ width, height });
  });

  if (!step || index === null) return null;

  const isAction = !!step.done;
  const isLast = index === TOUR_STEPS.length - 1;
  const title = paused ? 'Tour paused' : step.title;
  const body = paused
    ? 'This step is on another page. Head back to carry on, or end the tour.'
    : typeof step.body === 'function' ? step.body(ctx) : step.body;
  const lit = paused ? null : box;
  const pad = 6;
  const frame = lit && {
    top: lit.top - pad,
    left: lit.left - pad,
    width: lit.width + pad * 2,
    height: lit.height + pad * 2,
    pinned: lit.pinned || stuck,
  };
  const frameStyle = frame && { top: frame.top, left: frame.left, width: frame.width, height: frame.height };
  const phone = viewport.width < 640;
  const insets = phoneInsets(viewport.height);
  const showPill = tucked;

  const position = placeCard(frame, showPill ? { width: 320, height: 44 } : cardSize, viewport.width, viewport.height, insets);
  // The page could not lift the lit element clear of the sheet, so the card docks under the top bar.
  if (phone && stuck && !showPill) Object.assign(position, { top: insets.top, bottom: undefined });
  // With no tab bar below, the home indicator on newer phones still needs room.
  if (phone && typeof position.bottom === 'number' && !insets.tabBar) position.bottom = `calc(${position.bottom}px + env(safe-area-inset-bottom))`;
  if (showPill && phone) {
    // A tall element fills the lower screen (a pop-up sheet), so its bar goes to the top.
    if (tall) Object.assign(position, { top: insets.top, bottom: undefined });
    Object.assign(position, { width: 'fit-content', marginInline: 'auto' });
  }

  const nudgeCard = () => {
    setNudge(true);
    window.setTimeout(() => setNudge(false), 400);
    // After the tap's own focus change, so Enter then presses Next.
    window.setTimeout(() => cardRef.current?.querySelector<HTMLElement>('[data-tour-primary]')?.focus(), 0);
  };

  return (
    // data-stay: tour controls never count as leaving a running practice.
    <div data-stay data-tour-root>
      <style>{TOUR_CSS}</style>

      {/* Info steps hold page clicks until Next; a tap there points the learner at the card. */}
      {step.dim && !isAction && !paused && (
        <div aria-hidden className="fixed inset-0 z-[95]" style={{ pointerEvents: 'auto' }} onPointerDown={nudgeCard} />
      )}

      {lit ? (
        <>
          {/* The dim stays still; only the ring around the target breathes. */}
          <div
            aria-hidden
            className="fixed z-[96] rounded-2xl"
            style={{ ...frameStyle, pointerEvents: 'none', boxShadow: step.dim && !showPill ? '0 0 0 9999px rgba(2, 6, 23, 0.55)' : undefined }}
          />
          <div
            key={index}
            aria-hidden
            className={cn('fixed z-[96] rounded-2xl animate-in fade-in duration-300', isAction && 'prepyo-tour-glow')}
            style={{ ...frameStyle, pointerEvents: 'none', outline: '2px solid hsl(var(--primary))', outlineOffset: 2 }}
          />
        </>
      ) : (
        step.dim && !paused && <div aria-hidden className="fixed inset-0 z-[94] bg-slate-950/55" style={{ pointerEvents: 'none' }} />
      )}

      {showPill ? (
        <TourPill
          title={step.title}
          isAction={isAction}
          position={position}
          onExpand={() => setTuck(false)}
          nextLabel={step.next?.label}
          onNext={step.next ? next : undefined}
        />
      ) : (
        <TourCard
          index={index}
          total={TOUR_STEPS.length}
          stage={step.stage}
          title={title}
          body={body}
          isAction={isAction}
          isLast={isLast}
          paused={paused}
          touch={touch}
          did={did}
          nextLabel={step.next?.label}
          nudge={nudge}
          position={position}
          cardRef={cardRef}
          onNext={step.next ? next : undefined}
          onBack={back !== null ? () => goToStep(back) : undefined}
          onSkipStep={() => advance()}
          onEnd={endTour}
          onReturn={() => void leaveTo(step.home ?? '/dashboard')}
          onReplay={() => {
            if (!user) return;
            startTour(user.id);
            void leaveTo('/dashboard');
          }}
          onCollapse={!paused && (isAction || tall) ? () => setTuck(true) : undefined}
        />
      )}
    </div>
  );
}

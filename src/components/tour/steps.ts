import { ExamType } from '@/lib/types';

export interface TourContext {
  pathname: string;
  params: URLSearchParams;
  exam: ExamType;
  /** Paid learners have a real History Bank; Suru sees a blurred preview. */
  paid: boolean;
  /** A touch screen, where the words say "tap" rather than "click". */
  touch: boolean;
  /** True when one of the comma-separated selectors is on screen. */
  visible: (selector: string) => boolean;
}

export type TourStage = 'home' | 'practice' | 'history' | 'done';

export interface TourStep {
  id: string;
  /** Which part of the journey the step belongs to, for the tracker on the card. */
  stage: TourStage;
  /** The page the step lives on; elsewhere the tour pauses. Omitted: any page. */
  path?: string;
  /** Where "Take me back" goes when the learner has left `path`. */
  home?: string;
  /** Selectors for the element to light up; the first one on screen wins. */
  target?: string;
  title: string;
  body: string | ((ctx: TourContext) => string);
  /** A step the learner performs: it moves on by itself once this holds. */
  done?: (ctx: TourContext) => boolean;
  /** The Next button, and the page it opens. Action steps have none. */
  next?: { label: string; href?: string };
  /** Skipped when its target does not show up (hidden on a phone, say). */
  optional?: boolean;
  skipIf?: (ctx: TourContext) => boolean;
  /** Info steps dim the page and hold clicks; action steps leave it usable. */
  dim?: boolean;
  /** False when the tour must leave the page where it is (the learner reads from the top). */
  scroll?: boolean;
}

export const TOUR_STAGES: { id: Exclude<TourStage, 'done'>; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'practice', label: 'Practice' },
  { id: 'history', label: 'History' },
];

/** What the finish card ticks off: an item is done when the learner did any of its steps. */
export const TOUR_CHECKLIST: { label: string; steps: string[] }[] = [
  { label: 'Opened reading practice', steps: ['open-reading'] },
  { label: 'Answered and submitted a question', steps: ['answer'] },
  { label: 'Found your score in Practice history', steps: ['open-attempt', 'attempt-result'] },
];

const READING = '/practice?skill=reading';
const SUBMIT = '[aria-label="Check answers"], [aria-label="Submit Answer"]';
const RESULT = '[data-tour="practice-result"]';
const act = ({ touch }: TourContext) => (touch ? 'Tap' : 'Click');

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    stage: 'home',
    path: '/dashboard',
    home: '/dashboard',
    title: 'Welcome to Prepyo',
    body: 'A one-minute tour. We will look around your Home screen, answer one real reading question together, then find its score in your Practice history.',
    next: { label: 'Start the tour' },
    dim: true,
  },
  {
    id: 'countdown',
    stage: 'home',
    path: '/dashboard',
    home: '/dashboard',
    target: '[data-tour="dash-countdown"]',
    title: 'Your exam countdown',
    body: 'Set your exam date here. Prepyo counts down the days and paces your study plan to it.',
    next: { label: 'Next' },
    optional: true,
    dim: true,
  },
  {
    id: 'skills',
    stage: 'home',
    path: '/dashboard',
    home: '/dashboard',
    target: '[data-tour="dash-skills"]',
    title: 'Questions per skill',
    body: ({ exam }) =>
      exam === 'EPS_TOPIK'
        ? 'Reading and Listening, the two parts of EPS-TOPIK. Each card shows how many questions you have done and opens that practice.'
        : 'Speaking, Writing, Reading and Listening. Each card shows how many questions you have done and opens that practice.',
    next: { label: 'Next' },
    optional: true,
    dim: true,
  },
  {
    id: 'plan',
    stage: 'home',
    path: '/dashboard',
    home: '/dashboard',
    target: '[data-tour="dash-plan"]',
    title: 'Your plan',
    body: 'What your plan includes and how many practice tests you have left today. Upgrade from here whenever you need more.',
    next: { label: 'Next' },
    optional: true,
    dim: true,
  },
  {
    id: 'scores',
    stage: 'home',
    path: '/dashboard',
    home: '/dashboard',
    target: '[data-tour="dash-scores"]',
    title: 'Your estimated scores',
    body: 'Your score for each skill fills in as you practise, next to the mistakes you still have to fix.',
    next: { label: 'Next' },
    optional: true,
    dim: true,
  },
  {
    id: 'open-reading',
    stage: 'home',
    path: '/dashboard',
    home: '/dashboard',
    target: '[data-tour="dash-skills"] a[href*="skill=reading"]',
    title: 'Your first practice',
    body: ctx => `${act(ctx)} Reading Questions to open reading practice.`,
    done: ({ pathname, params }) => pathname === '/practice' && params.get('skill') === 'reading',
    dim: true,
  },
  {
    id: 'start',
    stage: 'practice',
    path: '/practice',
    home: READING,
    target: '#question-drawer-panel',
    title: 'Start a question',
    body: ctx =>
      ctx.exam === 'EPS_TOPIK'
          ? `${act(ctx)} any question in the list. It opens straight away.`
          : `${act(ctx)} any passage in the list. It opens straight away.`,
    done: ({ visible }) => visible(SUBMIT),
    dim: true,
  },
  {
    id: 'answer',
    stage: 'practice',
    path: '/practice',
    home: READING,
    target: SUBMIT,
    scroll: false,
    title: 'Answer, then Submit',
    body: ({ exam }) =>
      exam === 'EPS_TOPIK'
        ? 'Choose the answer you think is right, then press Submit to have it marked.'
        : 'Read the passage and answer the questions (one is enough for now), then press Submit to have them marked.',
    done: ({ visible }) => visible(RESULT),
  },
  {
    id: 'result',
    stage: 'practice',
    path: '/practice',
    home: READING,
    target: RESULT,
    title: 'Your score',
    body: 'This is how your answer was marked: what you got right, the correct answer and why. Every answer you give is saved to your Practice history.',
    next: { label: 'Open Practice history', href: '/history' },
  },
  {
    id: 'history',
    stage: 'history',
    path: '/history',
    home: '/history',
    target: 'section[aria-label="Summary"]',
    title: 'Your practice history',
    body: ({ paid }) =>
      paid
        ? 'Every question you answered: how many you practised, how many still need review and how many you have mastered.'
        : 'On a paid plan this keeps every question you answer, with your score and the right answer. On Suru it shows a sample, so see your score right after you submit.',
    next: { label: 'Next' },
    dim: true,
  },
  {
    id: 'open-attempt',
    stage: 'history',
    path: '/history',
    home: '/history',
    target: '[data-tour="history-item"]',
    title: 'Check your score',
    body: ctx => `Here is the question you just answered. ${act(ctx)} it to open its score card.`,
    done: ({ visible }) => visible(RESULT),
    skipIf: ({ paid }) => !paid,
    dim: true,
  },
  {
    id: 'attempt-result',
    stage: 'history',
    path: '/history',
    home: '/history',
    target: RESULT,
    title: 'Your answer, kept',
    body: 'Your score, what you answered and the right answer. Press Redo any time to try the question again.',
    next: { label: 'Next' },
    skipIf: ({ paid }) => !paid,
  },
  {
    id: 'nav',
    stage: 'done',
    target: '[data-tour="nav"], nav[aria-label="Main"]',
    title: 'Everything else is here',
    body: ({ touch }) =>
      touch
        ? 'Practice by task type, timed mock tests, lessons and your profile are always one tap away down here.'
        : 'Practice by task type, timed mock tests, lessons and the AI Coach are always one click away.',
    next: { label: 'Next' },
    optional: true,
    dim: true,
  },
  {
    id: 'finish',
    stage: 'done',
    title: 'You are all set',
    body: 'That is the tour. Replay it any time with Take the tour on your Home screen.',
    next: { label: 'Go to Home', href: '/dashboard' },
    dim: true,
  },
];

/** The step Back returns to: the previous info step on the same page, or null when there is none. */
export function backStep(index: number): number | null {
  const current = TOUR_STEPS[index];
  if (!current || current.done) return null;
  const previous = TOUR_STEPS[index - 1];
  if (!previous || previous.done || previous.next?.href || previous.path !== current.path) return null;
  return index - 1;
}

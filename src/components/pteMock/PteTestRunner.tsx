import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock, Flag, LogOut, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useTestLock } from '@/lib/hooks/useTestLock';
import FullscreenButton from '@/components/layout/FullscreenButton';
import { errorMessage } from '@/lib/api';
import { usePteTestRunner } from '@/lib/hooks/usePteTestRunner';
import { TestMicrophone } from '@/lib/pteMock/audio';
import { formatClock } from '@/lib/pteMock/catalog';
import { PteSession } from '@/lib/pteMock/types';
import PteItem from './items/PteItem';
import QuestionSource from '@/components/mocks/QuestionSource';
import { ItemHandle } from './items/types';

// The practice screen's pill buttons, on its blue bar.
const PILL = 'h-10 gap-2 rounded-full px-3 text-sm font-semibold sm:px-4';

interface Props {
  initial: PteSession;
  mic: TestMicrophone | null;
  /** The paper has no items left and is being scored. */
  onFinished: (sessionId: string) => void;
  /** Save and exit: the paper stays open to resume. */
  onLeave: () => void;
}

/**
 * The test screen: one item at a time, forward only.
 *
 * The bar across the top is the test's own — the time left on the clock the
 * item runs on, and where the learner is. There is no Back button, because the
 * test has none. Next always asks before moving on (and warns when the item
 * has no answer), since an item passed cannot be returned to; when a clock
 * runs out the item is sent as it stands and the test moves on by itself.
 */
export default function PteTestRunner({ initial, mic, onFinished, onLeave }: Props) {
  const toast = useToast();
  const { session, submitting, error, secondsLeft, submit, saveDraft, finish } = usePteTestRunner(initial);
  const itemRef = useRef<ItemHandle>(null);
  // Which item Next was pressed on, and whether it had an answer then. Keyed by
  // position so the question closes by itself if the clock moves the test on.
  const [confirmNext, setConfirmNext] = useState<{ position: number; answered: boolean } | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const expiredFor = useRef<string | null>(null);
  const item = session.item;

  // The microphone checked before the test is missing when a test is resumed
  // (after a reload, or Continue on an institute mock). A speaking item then
  // asks for it here instead of letting the answer go unrecorded.
  const [ownMic, setOwnMic] = useState<TestMicrophone | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [openingMic, setOpeningMic] = useState(false);
  useEffect(() => () => ownMic?.close(), [ownMic]);
  const liveMic = mic?.isOpen ? mic : ownMic?.isOpen ? ownMic : null;
  const needsMic = item?.task.skill === 'speaking' && !liveMic;

  const turnOnMic = async () => {
    setMicError(null);
    if (!TestMicrophone.supported()) {
      setMicError('This browser cannot record audio. Use Chrome or Edge on a computer.');
      return;
    }
    setOpeningMic(true);
    const m = new TestMicrophone();
    try {
      await m.open();
      setOwnMic(m);
    } catch {
      setMicError('Microphone access was refused. Allow the microphone for this site (the icon in the address bar) and try again.');
    } finally {
      setOpeningMic(false);
    }
  };

  // The test holds the screen: no menu or header, and the app will not navigate
  // away. Save and Exit (the paper stays open) and End test are the ways out.
  useTestLock(session.title, onLeave);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    if (session.status !== 'in_progress') onFinished(session.id);
  }, [session.status, session.id, onFinished]);

  const advance = useCallback(async () => {
    if (submitting) return;
    // A paper with nothing left goes to scoring; the effect above sees it.
    // With no item on screen (waiting for the microphone) it goes unanswered.
    await submit(itemRef.current ? await itemRef.current.collect() : {});
  }, [submit, submitting]);

  const onNext = () => {
    if (!item) return;
    setConfirmNext({ position: item.position, answered: Boolean(itemRef.current?.hasAnswer()) });
  };
  const confirmOpen = confirmNext != null && confirmNext.position === item?.position;

  // The clock ran out: the item goes as it stands, as it does in the test.
  useEffect(() => {
    if (!item || !session.clock || secondsLeft == null || secondsLeft > 0) return;
    const key = `${session.clock.key}:${item.position}`;
    if (expiredFor.current === key) return;
    expiredFor.current = key;
    toast.warning(
      session.clock.scope === 'part' ? 'Time is up for this part' : 'Time is up for this item',
      'Your answer so far has been saved and the test has moved on.',
    );
    void advance();
  }, [secondsLeft, item, session.clock, advance, toast]);

  const endTest = async () => {
    setEnding(true);
    try {
      if (itemRef.current) await submit(await itemRef.current.collect());
      await finish();
    } catch (err) {
      toast.error('Could not end the test', errorMessage(err));
    } finally {
      setEnding(false);
      setConfirmEnd(false);
    }
  };

  const partIndex = item ? session.parts.findIndex(p => p.part === item.part) : -1;
  const part = partIndex >= 0 ? session.parts[partIndex] : undefined;
  const lowTime = secondsLeft != null && secondsLeft <= 60;
  const done = Math.max(0, session.current - 1);

  return (
    <div data-practice-workspace className="w-full min-h-dvh flex flex-col bg-card">
      {/* The test bar, the same blue as the IELTS mocks': where the learner is, and the clock */}
      <div className="dark test-bar sticky top-0 z-30 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)]">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 px-2 text-xs font-bold text-primary-foreground shadow-md sm:h-11 sm:min-w-11 sm:text-sm">
              {/* Two letters fit the badge; the full task code is on hover. */}
              <span title={item?.task.code}>{item ? item.task.code.slice(0, 2) : 'PTE'}</span>
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold leading-tight text-primary sm:text-lg">{session.title}</h1>
              {part && (
                <p className="truncate text-xs text-muted-foreground">
                  Part {partIndex + 1} of {session.parts.length}: {part.label}
                  {item && <> · item {item.partPosition} of {item.partItems}</>}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item && (
              <div className="rounded-xl bg-muted px-3 py-1.5 text-center leading-tight">
                <p className="text-[11px] text-muted-foreground">Question</p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {item.position} / {session.totalItems}
                </p>
              </div>
            )}
            {secondsLeft != null && session.clock && (
              <div
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors ${
                  lowTime ? 'bg-rose-500 text-white animate-pulse' : 'bg-primary/[0.07]'
                }`}
                aria-live={lowTime ? 'polite' : 'off'}
              >
                <Clock className={`h-5 w-5 ${lowTime ? 'text-white' : 'text-primary'}`} aria-hidden />
                <div className="leading-tight">
                  <p className={`text-[11px] ${lowTime ? 'text-white/85' : 'text-muted-foreground'}`}>
                    {session.clock.scope === 'part' ? 'Part time left' : 'Time left'}
                  </p>
                  <p className={`font-mono text-sm font-bold ${lowTime ? 'text-white' : 'text-primary'}`}>{formatClock(secondsLeft)}</p>
                </div>
              </div>
            )}
            <FullscreenButton tone="onPrimary" />
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(done / Math.max(1, session.totalItems)) * 100}%` }}
          />
        </div>
      </div>

      {/* The item, in the practice screen's layout */}
      <main className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {item ? (
          <>
            {/* Task type and its instructions */}
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 px-2 text-sm font-bold text-primary-foreground shadow-md sm:h-14 sm:min-w-14">
                <span title={item.task.code}>{item.task.code.slice(0, 2)}</span>
              </span>
              <div className="min-w-0 space-y-1 pt-0.5">
                <h2 className="text-xl font-bold leading-tight text-primary sm:text-2xl">{item.task.name}</h2>
                {/* A listening item's own task text stands here, above its recording, as in the IELTS mocks. */}
                {item.part === 'listening' && item.question.prompt ? (
                  <p className="whitespace-pre-line pt-1 text-lg font-medium leading-relaxed text-foreground">{item.question.prompt}</p>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.task.instructions}</p>
                )}
                <QuestionSource questions={[item.question]} exam="PTE" />
              </div>
            </div>

            {/* The question itself, on the page: no card or bar around it, as in the IELTS mocks */}
            <div>
              <div>
                {needsMic ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted/40 px-4 py-8 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Mic className="h-6 w-6" />
                    </span>
                    <p className="font-semibold text-foreground">Turn on your microphone to answer</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                      This item is spoken. The item starts once the microphone is on.
                    </p>
                    <Button onClick={() => void turnOnMic()} disabled={openingMic} className="gap-2">
                      {openingMic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                      Turn on the microphone
                    </Button>
                    {micError && <p className="text-sm text-destructive" role="alert">{micError}</p>}
                  </div>
                ) : (
                  <PteItem key={item.position} ref={itemRef} item={item} sessionId={session.id} mic={liveMic} onDraft={saveDraft} />
                )}
              </div>
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error} Press Next to try again.</p>}
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Sending your test for scoring…
          </div>
        )}
      </main>

      {/* The test's controls, edge to edge as in every mock: forward only */}
      <div className="sticky bottom-0 z-30 dark test-bar px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.35)] sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" onClick={onLeave} className={`test-leave ${PILL}`}>
              <LogOut className="h-4 w-4" /> <span>Save and Exit</span>
            </Button>
            <Button variant="ghost" onClick={() => setConfirmEnd(true)} className={`test-end ${PILL}`}>
              <Flag className="h-4 w-4" /> <span className="hidden sm:inline">End test</span>
            </Button>
          </div>
          <Button
            onClick={onNext}
            disabled={!item || submitting || ending}
            className="test-next h-11 min-w-[136px] gap-2 rounded-full px-6 font-bold tracking-wide"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {item && item.position >= session.totalItems ? 'Submit test' : 'Next'} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={open => !open && setConfirmNext(null)}>
        <DialogContent centered>
          <DialogHeader>
            <DialogTitle>
              {item && item.position >= session.totalItems ? 'Do you want to submit your test?' : 'Do you want to go to the next question?'}
            </DialogTitle>
            <DialogDescription>
              {confirmNext?.answered
                ? 'You cannot come back to this question once you move on.'
                : 'You have not answered this question. Once you move on you cannot come back to it, and it will score zero.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmNext(null)} className="min-w-[96px]">No</Button>
            <Button
              autoFocus
              onClick={() => {
                setConfirmNext(null);
                void advance();
              }}
              className="min-w-[96px]"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent centered>
          <DialogHeader>
            <DialogTitle>End the test now?</DialogTitle>
            <DialogDescription>
              Your answer to this item is sent, and the {Math.max(0, session.totalItems - session.current)} item(s) after it
              score zero. The test is then scored. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEnd(false)} disabled={ending}>Keep going</Button>
            <Button variant="destructive" onClick={() => void endTest()} disabled={ending} className="gap-1.5">
              {ending && <Loader2 className="h-4 w-4 animate-spin" />} End and score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

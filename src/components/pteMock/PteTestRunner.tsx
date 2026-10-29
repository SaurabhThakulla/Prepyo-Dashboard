import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock, Flag, LogOut, Loader2 } from 'lucide-react';
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
import { errorMessage } from '@/lib/api';
import { usePteTestRunner } from '@/lib/hooks/usePteTestRunner';
import { TestMicrophone } from '@/lib/pteMock/audio';
import { formatClock } from '@/lib/pteMock/catalog';
import { PteSession } from '@/lib/pteMock/types';
import PteItem from './items/PteItem';
import { ItemHandle } from './items/types';

// The practice screen's pill buttons, on its blue bar.
const PILL = 'h-9 gap-1.5 rounded-full px-3 text-xs font-bold sm:px-4';

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
 * test has none. Next asks before skipping an item with no answer, since an
 * item passed cannot be returned to; when a clock runs out the item is sent as
 * it stands and the test moves on by itself.
 */
export default function PteTestRunner({ initial, mic, onFinished, onLeave }: Props) {
  const toast = useToast();
  const { session, submitting, error, secondsLeft, submit, saveDraft, finish } = usePteTestRunner(initial);
  const itemRef = useRef<ItemHandle>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const expiredFor = useRef<string | null>(null);
  const item = session.item;

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
    if (!itemRef.current || submitting) return;
    // A paper with nothing left goes to scoring; the effect above sees it.
    await submit(await itemRef.current.collect());
  }, [submit, submitting]);

  const onNext = () => {
    if (!itemRef.current?.hasAnswer()) {
      setConfirmSkip(true);
      return;
    }
    void advance();
  };

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
    <div data-practice-workspace className="w-full min-h-dvh flex flex-col">
      {/* The test bar: where the learner is, and the clock */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">PTE Academic · Mock test</p>
            <h1 className="truncate font-display text-base font-bold text-foreground">{session.title}</h1>
            {part && (
              <p className="text-xs text-muted-foreground">
                Part {partIndex + 1} of {session.parts.length}: <span className="font-semibold text-foreground">{part.label}</span>
                {item && <> · item {item.partPosition} of {item.partItems}</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item && (
              <div className="rounded-2xl bg-muted px-3.5 py-2 text-center leading-tight">
                <p className="text-[11px] text-muted-foreground">Question</p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {item.position} / {session.totalItems}
                </p>
              </div>
            )}
            {secondsLeft != null && session.clock && (
              <div
                className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2 transition-colors ${
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
      <main className="w-full flex-1 space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {item && item.partPosition === 1 && part && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <span className="font-bold">Part {partIndex + 1}: {part.label}</span> begins: {part.items} item
            {part.items === 1 ? '' : 's'}.
            {item.task.clock === 'section' && ' This part shares one clock, which is now running.'}
          </div>
        )}
        {item ? (
          <>
            {/* Task type and its instructions */}
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 px-2 text-sm font-bold text-primary-foreground shadow-md sm:h-14 sm:min-w-14">
                {item.task.code}
              </span>
              <div className="min-w-0 space-y-1 pt-0.5">
                <h2 className="text-xl font-bold leading-tight text-primary sm:text-2xl">{item.task.name}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.task.instructions}</p>
              </div>
            </div>

            {/* The question: blue bar with its number, then its content */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/75 px-4 py-3 text-primary-foreground dark:!bg-muted dark:!text-foreground sm:px-5">
                <span className="rounded-lg bg-white/15 px-2.5 py-0.5 font-bold tabular-nums">#{item.position}</span>
                <span className="h-5 w-px bg-white/40" aria-hidden />
                <h3 className="text-sm font-semibold leading-snug sm:text-base">{item.task.name}</h3>
              </div>
              <div className="p-4 sm:p-5">
                <PteItem key={item.position} ref={itemRef} item={item} sessionId={session.id} mic={mic} onDraft={saveDraft} />
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

      {/* The test's controls, on the practice screen's blue bar: forward only */}
      <div className="sticky bottom-0 z-30 px-4 pb-4 sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-between gap-2.5 rounded-2xl border border-[#0f2a6b] bg-[#13307f] p-2.5 shadow-lg dark:border-border dark:bg-card sm:p-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" onClick={onLeave} className={PILL}>
              <LogOut className="h-3.5 w-3.5" /> <span>Save and Exit</span>
            </Button>
            <Button variant="ghost" onClick={() => setConfirmEnd(true)} className={`${PILL} text-white hover:bg-white/15 hover:text-white dark:text-foreground`}>
              <Flag className="h-3.5 w-3.5" /> <span className="hidden sm:inline">End test</span>
            </Button>
          </div>
          <Button
            onClick={onNext}
            disabled={!item || submitting || ending}
            className="h-10 min-w-[120px] gap-1.5 rounded-full bg-white px-5 font-bold text-primary shadow-md hover:bg-white/90 dark:bg-primary dark:text-primary-foreground"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <DialogContent centered>
          <DialogHeader>
            <DialogTitle>Move on without answering?</DialogTitle>
            <DialogDescription>
              You have not answered this item. Once you move on you cannot come back to it, and it will score zero.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSkip(false)}>Stay on this item</Button>
            <Button
              onClick={() => {
                setConfirmSkip(false);
                void advance();
              }}
            >
              Move on
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

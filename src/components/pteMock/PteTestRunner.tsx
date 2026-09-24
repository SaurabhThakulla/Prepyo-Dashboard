import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock, Flag, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { usePteTestRunner } from '@/lib/hooks/usePteTestRunner';
import { TestMicrophone } from '@/lib/pteMock/audio';
import { formatClock } from '@/lib/pteMock/catalog';
import { PteSession } from '@/lib/pteMock/types';
import PteItem from './items/PteItem';
import { ItemHandle } from './items/types';

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
  const { setActiveTestSession } = useApp();
  const { session, submitting, error, secondsLeft, submit, saveDraft, finish } = usePteTestRunner(initial);
  const itemRef = useRef<ItemHandle>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const expiredFor = useRef<string | null>(null);
  const item = session.item;

  // Leaving by the app's own navigation asks first, and keeps the paper open.
  useEffect(() => {
    setActiveTestSession?.({ isActive: true, title: session.title, onStop: onLeave });
    return () => setActiveTestSession?.(null);
  }, [session.title, onLeave, setActiveTestSession]);

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

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] flex flex-col bg-background">
      {/* The test bar */}
      <div className="sticky top-16 z-30 bg-slate-800 text-white dark:bg-slate-900 border-b border-slate-700">
        <div className="px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">PTE Academic · Mock</p>
            <h1 className="text-sm font-bold truncate">{session.title}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            {secondsLeft != null && session.clock && (
              <div
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono font-bold ${
                  lowTime ? 'bg-rose-500/90 animate-pulse' : 'bg-slate-700'
                }`}
                aria-live={lowTime ? 'polite' : 'off'}
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline font-sans font-semibold">
                  {session.clock.scope === 'part' ? 'Part time' : 'Time'} remaining
                </span>
                {formatClock(secondsLeft)}
              </div>
            )}
            {item && (
              <div className="rounded-lg bg-slate-700 px-3 py-1.5 font-semibold tabular-nums">
                {item.position} of {session.totalItems}
              </div>
            )}
          </div>
        </div>
        {part && (
          <div className="px-3 sm:px-6 pb-2 flex items-center gap-2 text-[11px] text-slate-300">
            <span className="font-bold text-white">
              Part {partIndex + 1} of {session.parts.length}: {part.label}
            </span>
            <span>· item {item!.partPosition} of {item!.partItems}</span>
          </div>
        )}
        <div className="h-1 bg-slate-700">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((session.current - 1) / Math.max(1, session.totalItems)) * 100}%` }}
          />
        </div>
      </div>

      {/* The item */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-5 space-y-4">
        {item && item.partPosition === 1 && part && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs text-foreground">
            <span className="font-bold">Part {partIndex + 1}: {part.label}</span> begins — {part.items} item
            {part.items === 1 ? '' : 's'}.
            {item.task.clock === 'section' && ' This part shares one clock, which is now running.'}
          </div>
        )}
        {item ? (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="indigo">{item.task.code}</Badge>
                <h2 className="font-display text-lg font-bold text-foreground">{item.task.name}</h2>
              </div>
              <p className="text-xs sm:text-[13px] text-muted-foreground italic leading-relaxed">{item.task.instructions}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <PteItem key={item.position} ref={itemRef} item={item} sessionId={session.id} mic={mic} onDraft={saveDraft} />
            </div>
            {error && <p className="text-xs text-destructive" role="alert">{error} Press Next to try again.</p>}
          </>
        ) : (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Sending your test for scoring…
          </div>
        )}
      </main>

      {/* The test's controls: forward only */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={onLeave} className="gap-1.5 font-bold">
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Save and Exit</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)} className="gap-1.5 text-muted-foreground">
              <Flag className="h-3.5 w-3.5" /> <span className="hidden sm:inline">End test</span>
            </Button>
          </div>
          <Button onClick={onNext} disabled={!item || submitting || ending} className="min-w-[120px] gap-1.5 font-bold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <DialogContent>
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
        <DialogContent>
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

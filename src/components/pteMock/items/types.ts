import { AnswerSubmission } from '@/lib/types';
import { PteAnswer, PteItemView } from '@/lib/pteMock/types';
import { TestMicrophone } from '@/lib/pteMock/audio';

/**
 * The contract between the test player and an item on screen.
 *
 * An item keeps its own answer while it is on screen. The player asks for it
 * when the learner presses Next or the clock runs out: `collect` stops
 * whatever the item is doing (a recording, a prompt playing) and hands the
 * answer over. One shape for every task, so a new task is a new component and
 * nothing else.
 */
export interface ItemHandle {
  /** Whether the learner has given any answer yet. */
  hasAnswer(): boolean;
  /** Ends the item and returns its answer. */
  collect(): Promise<PteAnswer>;
}

export interface ItemProps {
  item: PteItemView;
  /** The paper the item belongs to; with the position it names the item for good. */
  sessionId: string;
  /** The test's microphone, opened once before the first spoken item. */
  mic: TestMicrophone | null;
  /** Keep a typed or chosen answer as a draft on the server. */
  onDraft: (response: AnswerSubmission) => void;
}

import { cn } from '@/lib/utils';

export interface Turn {
  speaker: string;
  text: string;
}

const SPEAKER_LINE = /^([A-Z][\w .'’-]{0,30}):\s*(.*)$/;

/**
 * The passage as a list of turns when it is a dialogue ("Emma: …" on every
 * line, two speakers or more), else null. A line without a speaker continues
 * the turn before it.
 */
export function conversationTurns(text: string): Turn[] | null {
  const turns: Turn[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const match = SPEAKER_LINE.exec(line);
    if (match) turns.push({ speaker: match[1].trim(), text: match[2] });
    else if (turns.length > 0) turns[turns.length - 1].text += ` ${line}`;
    else return null;
  }
  const speakers = new Set(turns.map(t => t.speaker));
  return turns.length >= 2 && speakers.size >= 2 ? turns : null;
}

// One look per speaker, in the order they first talk.
const SPEAKER_STYLE = [
  { avatar: 'bg-teal-500', name: 'text-teal-700 dark:text-teal-300', bubble: 'bg-teal-50 border-teal-100 dark:bg-teal-950/40 dark:border-teal-900' },
  { avatar: 'bg-indigo-500', name: 'text-indigo-700 dark:text-indigo-300', bubble: 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900' },
  { avatar: 'bg-amber-500', name: 'text-amber-700 dark:text-amber-300', bubble: 'bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900' },
  { avatar: 'bg-rose-500', name: 'text-rose-700 dark:text-rose-300', bubble: 'bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900' },
];

/** A dialogue passage as chat bubbles: the first speaker on the left, the second on the right. */
export default function ConversationPassage({ turns, className }: { turns: Turn[]; className?: string }) {
  const order = [...new Set(turns.map(t => t.speaker))];
  const twoWay = order.length === 2;
  return (
    <ol className={cn('space-y-3', className)} data-testid="conversation-passage">
      {turns.map((turn, i) => {
        const index = order.indexOf(turn.speaker);
        const style = SPEAKER_STYLE[index % SPEAKER_STYLE.length];
        const right = twoWay && index === 1;
        // A speaker's next line right after their last one needs no second name.
        const continues = i > 0 && turns[i - 1].speaker === turn.speaker;
        return (
          <li key={i} className={cn('flex items-end gap-2.5', right && 'flex-row-reverse')}>
            <span
              className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', style.avatar, continues && 'invisible')}
              aria-hidden
            >
              {turn.speaker.charAt(0)}
            </span>
            <div className={cn('min-w-0 max-w-[85%] rounded-2xl border px-3.5 py-2', style.bubble, right ? 'rounded-br-md' : 'rounded-bl-md')}>
              {!continues && <p className={cn('mb-0.5 text-xs font-bold', style.name, right && 'text-right')}>{turn.speaker}</p>}
              <p className="text-foreground">{turn.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

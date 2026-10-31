/** An IELTS Speaking Part 2 task card, split out of its one-line prompt. */
export interface ParsedCueCard {
  /** "Describe a time when ..." */
  task: string;
  /** What to talk about; the last is usually "and explain ...". */
  points: string[];
  /** The preparation and speaking time, when the prompt gives it. */
  note: string;
}

/**
 * Reads a Part 2 prompt such as "Describe X. You should say: a; b; and explain c.
 * You have one minute to prepare ..." (or the same with one point a line). Null
 * when the prompt has no "You should say:" list, so it is shown as it is.
 */
export function parseCueCard(prompt: string): ParsedCueCard | null {
  const match = /^([\s\S]*?)\s*You should say:\s*([\s\S]*)$/i.exec(prompt.trim());
  if (!match) return null;
  const task = match[1].trim();
  let rest = match[2];
  let note = '';
  const timing = /\s*(You have (?:one|1) minute[\s\S]*)$/i.exec(rest);
  if (timing) {
    note = timing[1].replace(/\s+/g, ' ').trim();
    rest = rest.slice(0, timing.index);
  }
  const points = rest
    .split(/;|\r?\n/)
    .map(point => point.replace(/^\s*[-•*]\s*/, '').replace(/[\s.;]+$/, '').trim())
    .filter(Boolean);
  if (!task || points.length === 0) return null;
  // The closing "and explain ..." reads as the end of the sentence.
  const last = points.length - 1;
  if (/^and explain/i.test(points[last])) points[last] += '.';
  return { task, points, note };
}

/** The Part 2 card as the test shows it: the task, "You should say:", then the points. */
export default function CueCard({ card }: { card: ParsedCueCard }) {
  return (
    <div className="space-y-2">
      <div data-dictionary className="space-y-3 rounded-xl border border-rose-300/70 bg-card p-4 text-[15px] leading-relaxed text-foreground dark:border-rose-400/40">
        <p>{card.task}</p>
        <p>You should say:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          {card.points.map(point => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      {card.note && <p className="text-xs text-muted-foreground">{card.note}</p>}
    </div>
  );
}

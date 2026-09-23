export type DiffPart = { kind: 'same' | 'removed' | 'added'; text: string };

/**
 * Word-level difference between a learner's sentence and its correction, so
 * only the words that changed are marked instead of the whole sentence.
 *
 * Words are compared exactly, punctuation included. Within a changed stretch
 * the removed words come before the added ones, which reads as "this, not that".
 */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.trim().split(/\s+/).filter(Boolean);
  const b = after.trim().split(/\s+/).filter(Boolean);

  // Longest common subsequence table, filled from the end.
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], word: string) => {
    const last = parts[parts.length - 1];
    if (last && last.kind === kind) last.text += ` ${word}`;
    else parts.push({ kind, text: word });
  };

  let i = 0;
  let j = 0;
  const removed: string[] = [];
  const added: string[] = [];
  const flush = () => {
    removed.forEach(word => push('removed', word));
    added.forEach(word => push('added', word));
    removed.length = 0;
    added.length = 0;
  };

  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      push('same', a[i]);
      i++;
      j++;
    } else if (j >= b.length || (i < a.length && lcs[i + 1][j] >= lcs[i][j + 1])) {
      removed.push(a[i++]);
    } else {
      added.push(b[j++]);
    }
  }
  flush();
  return parts;
}

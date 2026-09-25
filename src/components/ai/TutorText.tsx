import React from 'react';

// Renders the AI coach's replies. The coach is asked for plain text with
// **bold** and "- " lists; this handles those (and stray `code` or ``` fences)
// as React elements, so nothing from the model is ever injected as HTML.

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; lines: string[] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  let inCode = false;

  const close = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    if (raw.trim().startsWith('```')) {
      if (inCode) {
        close();
        inCode = false;
      } else {
        close();
        inCode = true;
        current = { kind: 'code', lines: [] };
      }
      continue;
    }
    if (inCode) {
      (current as Extract<Block, { kind: 'code' }>).lines.push(raw);
      continue;
    }
    if (raw.trim() === '') {
      close();
      continue;
    }
    const bullet = BULLET.test(raw);
    const numbered = !bullet && NUMBERED.test(raw);
    if (bullet || numbered) {
      const item = raw.replace(bullet ? BULLET : NUMBERED, '');
      if (!current || current.kind !== 'list' || current.ordered !== numbered) {
        close();
        current = { kind: 'list', ordered: numbered, items: [] };
      }
      current.items.push(item);
      continue;
    }
    if (!current || current.kind !== 'paragraph') {
      close();
      current = { kind: 'paragraph', lines: [] };
    }
    current.lines.push(raw.replace(/^#{1,6}\s+/, ''));
  }
  close();
  return blocks;
}

export default function TutorText({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2">
      {blocks.map((block, b) => {
        if (block.kind === 'code') {
          return (
            <pre key={b} className="overflow-x-auto rounded-lg bg-muted p-2 font-mono text-[11px] whitespace-pre">
              {block.lines.join('\n')}
            </pre>
          );
        }
        if (block.kind === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={b} className={`${block.ordered ? 'list-decimal' : 'list-disc'} pl-4 space-y-1`}>
              {block.items.map((item, i) => (
                <li key={i}>{inline(item, `${b}-${i}`)}</li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={b}>
            {block.lines.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {inline(line, `${b}-${i}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TutorText, { parseBlocks } from '@/components/ai/TutorText';

describe('TutorText', () => {
  it('renders bold text and bullet lists instead of raw markdown', () => {
    const { container } = render(
      <TutorText text={'A good answer has **four parts**.\n\n- **Introduction** - what it shows\n- **Overview** - the main trend'} />,
    );
    expect(screen.getByText('four parts').tagName).toBe('STRONG');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.textContent).not.toContain('**');
  });

  it('never turns model output into HTML', () => {
    const { container } = render(<TutorText text={'<img src=x onerror=alert(1)> **ok**'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('keeps code fences as preformatted text', () => {
    expect(parseBlocks('Here:\n```js\nlet a = 1;\n```\nDone')).toEqual([
      { kind: 'paragraph', lines: ['Here:'] },
      { kind: 'code', lines: ['let a = 1;'] },
      { kind: 'paragraph', lines: ['Done'] },
    ]);
  });
});

import { useEffect, useRef } from 'react';

const TYPABLE = 'input, textarea, [contenteditable="true"], [contenteditable=""]';

/**
 * Blocks pasting (and dropping text) across the site. Selecting and copying
 * text is allowed.
 *
 * This is a deterrent, not a lock: devtools and browser extensions get around
 * it. What it does stop is the easy path — pasting a pre-written essay into an
 * answer box.
 *
 * Admins are exempt: authoring questions without paste is not workable.
 */
export function useClipboardGuard(enabled: boolean, onBlockedPaste?: () => void) {
  const notify = useRef(onBlockedPaste);
  notify.current = onBlockedPaste;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    let lastNotice = 0;
    const tellOnce = () => {
      const now = Date.now();
      if (now - lastNotice < 4000) return;
      lastNotice = now;
      notify.current?.();
    };

    const blockPaste = (event: Event) => {
      event.preventDefault();
      tellOnce();
    };

    // Dragging text into a field is a paste by another name. Files are left
    // alone so upload drop zones (payment screenshots) keep working.
    const blockTextDrop = (event: DragEvent) => {
      const target = event.target as Element | null;
      const types = Array.from(event.dataTransfer?.types ?? []);
      if (target?.closest?.(TYPABLE) && !types.includes('Files')) {
        event.preventDefault();
        if (event.type === 'drop') tellOnce();
      }
    };

    document.addEventListener('paste', blockPaste, true);
    document.addEventListener('dragover', blockTextDrop, true);
    document.addEventListener('drop', blockTextDrop, true);

    return () => {
      document.removeEventListener('paste', blockPaste, true);
      document.removeEventListener('dragover', blockTextDrop, true);
      document.removeEventListener('drop', blockTextDrop, true);
    };
  }, [enabled]);
}

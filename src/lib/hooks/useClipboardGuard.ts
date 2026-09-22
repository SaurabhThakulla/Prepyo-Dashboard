import { useEffect, useRef } from 'react';

const TYPABLE = 'input, textarea, [contenteditable="true"], [contenteditable=""]';

/**
 * Blocks copying, cutting and pasting across the site, and text selection
 * outside the fields a learner types into.
 *
 * This is a deterrent, not a lock: devtools, screenshots and browser extensions
 * all get around it. What it does stop is the easy path — lifting a passage or
 * pasting a pre-written essay into an answer box.
 *
 * Buttons that write to the clipboard on purpose (the referral link) use
 * navigator.clipboard, which fires no copy event and so still works.
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

    const block = (event: Event) => {
      event.preventDefault();
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

    document.addEventListener('copy', block, true);
    document.addEventListener('cut', block, true);
    document.addEventListener('paste', blockPaste, true);
    document.addEventListener('dragover', blockTextDrop, true);
    document.addEventListener('drop', blockTextDrop, true);
    document.documentElement.setAttribute('data-clipboard-guard', '');

    return () => {
      document.removeEventListener('copy', block, true);
      document.removeEventListener('cut', block, true);
      document.removeEventListener('paste', blockPaste, true);
      document.removeEventListener('dragover', blockTextDrop, true);
      document.removeEventListener('drop', blockTextDrop, true);
      document.documentElement.removeAttribute('data-clipboard-guard');
    };
  }, [enabled]);
}

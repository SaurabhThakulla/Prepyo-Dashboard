import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BookOpen, ZoomIn, ZoomOut, Highlighter, Eraser, PenLine, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { ReadingPassage } from '@/lib/types';

interface PassageReaderProps {
  passage: ReadingPassage;
  /** Caps the height and scrolls, so the questions stay beside it on a mock or practice split screen. */
  scroll?: boolean;
  showLabels?: boolean;
  passageNumber?: number;
  questionRange?: string;
}

type TextSize = 'sm' | 'base' | 'lg';
type FontType = 'reading' | 'sans';

const FONT_CLASSES: Record<TextSize, { body: string; label: string; line: string }> = {
  sm: { body: 'text-[13px] sm:text-[14px] leading-6', label: 'text-[11px]', line: 'space-y-2.5' },
  base: { body: 'text-[14.5px] sm:text-[15.5px] leading-7', label: 'text-xs', line: 'space-y-3' },
  lg: { body: 'text-[16px] sm:text-[17px] leading-8', label: 'text-sm', line: 'space-y-3.5' },
};

interface TextHighlight {
  id: string;
  paragraphIndex: number;
  start: number;
  end: number;
  note?: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  canHighlight: boolean;
  canClear: boolean;
  selectedRanges?: { paragraphIndex: number; start: number; end: number }[];
  targetHighlightId?: string;
}

/**
 * Accurately calculates character offset within a paragraph's body element,
 * ignoring markup differences and text nodes created by previous highlights.
 */
function getCharacterOffset(bodyEl: HTMLElement, targetNode: Node, targetOffset: number): number {
  let actualNode = targetNode;
  let actualOffset = targetOffset;

  while (actualNode.nodeType === Node.ELEMENT_NODE && actualNode.childNodes.length > 0) {
    if (actualOffset < actualNode.childNodes.length) {
      actualNode = actualNode.childNodes[actualOffset];
      actualOffset = 0;
    } else {
      actualNode = actualNode.childNodes[actualNode.childNodes.length - 1];
      actualOffset = actualNode.textContent?.length || 0;
    }
  }

  let offset = 0;
  const walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null);
  let node = walker.nextNode();
  while (node) {
    if (node === actualNode) {
      return offset + actualOffset;
    }
    offset += node.textContent?.length || 0;
    node = walker.nextNode();
  }
  return offset;
}

/**
 * Merge newly added highlight into existing highlights list, combining overlaps.
 */
function addAndMergeHighlight(existing: TextHighlight[], newHl: TextHighlight): TextHighlight[] {
  const all = [...existing, newHl];
  all.sort((a, b) => a.start - b.start);

  const merged: TextHighlight[] = [];
  for (const hl of all) {
    if (merged.length === 0) {
      merged.push({ ...hl });
      continue;
    }
    const prev = merged[merged.length - 1];
    if (hl.start <= prev.end) {
      prev.end = Math.max(prev.end, hl.end);
      if (hl.note) {
        prev.note = prev.note ? `${prev.note}; ${hl.note}` : hl.note;
      }
    } else {
      merged.push({ ...hl });
    }
  }
  return merged;
}

/**
 * Subtracts a cleared range from existing highlights, splitting or shrinking as needed.
 */
function removeRangeFromHighlights(
  existing: TextHighlight[],
  clearStart: number,
  clearEnd: number
): TextHighlight[] {
  const result: TextHighlight[] = [];
  for (const h of existing) {
    if (h.end <= clearStart || h.start >= clearEnd) {
      result.push(h);
    } else if (h.start < clearStart && h.end > clearEnd) {
      result.push({ ...h, id: `${h.id}_a`, end: clearStart });
      result.push({ ...h, id: `${h.id}_b`, start: clearEnd });
    } else if (h.start < clearStart && h.end <= clearEnd) {
      result.push({ ...h, end: clearStart });
    } else if (h.start >= clearStart && h.end > clearEnd) {
      result.push({ ...h, start: clearEnd });
    }
  }
  return result;
}

/**
 * Compact, elegant IELTS passage reader with sans text by default (a serif option for book-style reading),
 * multi-time highlighting opening at the mouse cursor, and right-click clear functionality.
 */
export default function PassageReader({
  passage,
  scroll = true,
  showLabels = false,
  passageNumber = 1,
  questionRange = 'Questions 1–13',
}: PassageReaderProps) {
  const [textSize, setTextSize] = useState<TextSize>('base');
  const [fontType, setFontType] = useState<FontType>('sans');

  // Highlights state stored per passage ID
  const [highlightsByPassage, setHighlightsByPassage] = useState<
    Record<string, Record<number, TextHighlight[]>>
  >({});
  const highlights = highlightsByPassage[passage.id] || {};

  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);
  const [noteModal, setNoteModal] = useState<{
    highlightId: string;
    paragraphIndex: number;
    initialText: string;
  } | null>(null);
  const [noteText, setNoteText] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const cycleTextSize = (direction: 'up' | 'down') => {
    const order: TextSize[] = ['sm', 'base', 'lg'];
    const currentIndex = order.indexOf(textSize);
    if (direction === 'up' && currentIndex < order.length - 1) {
      setTextSize(order[currentIndex + 1]);
    } else if (direction === 'down' && currentIndex > 0) {
      setTextSize(order[currentIndex - 1]);
    }
  };

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuState(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuState(null);
        setNoteModal(null);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle user mouse selection inside passage - opens menu AT THE MOUSE CURSOR
  const handleMouseUp = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      // If user clicked inside the menu itself, do nothing
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      if (!containerRef.current) return;
      const container = containerRef.current;

      // Must be within or intersecting the passage container
      const isInside =
        container.contains(range.commonAncestorContainer) ||
        (Boolean(range.intersectsNode) && range.intersectsNode(container));
      if (!isInside) return;

      const bodyElements = container.querySelectorAll<HTMLElement>('[data-paragraph-body]');
      if (!bodyElements.length) return;

      let startPIndex = -1;
      let endPIndex = -1;

      bodyElements.forEach((el, idx) => {
        if (el.contains(range.startContainer)) startPIndex = idx;
        if (el.contains(range.endContainer)) endPIndex = idx;
      });

      if (startPIndex === -1 || endPIndex === -1) {
        bodyElements.forEach((el, idx) => {
          if (range.intersectsNode(el)) {
            if (startPIndex === -1) startPIndex = idx;
            endPIndex = idx;
          }
        });
      }

      if (startPIndex === -1 || endPIndex === -1) return;
      if (startPIndex > endPIndex) [startPIndex, endPIndex] = [endPIndex, startPIndex];

      const selectedRanges: { paragraphIndex: number; start: number; end: number }[] = [];
      let hasOverlappingHighlights = false;

      for (let pIdx = startPIndex; pIdx <= endPIndex; pIdx++) {
        const el = bodyElements[pIdx];
        const pText = passage.paragraphs[pIdx]?.text || '';
        if (!el || !pText) continue;

        let start = 0;
        let end = pText.length;

        if (pIdx === startPIndex) {
          start = getCharacterOffset(el, range.startContainer, range.startOffset);
        }
        if (pIdx === endPIndex) {
          end = getCharacterOffset(el, range.endContainer, range.endOffset);
        }

        if (start > end) [start, end] = [end, start];
        start = Math.max(0, Math.min(start, pText.length));
        end = Math.max(start, Math.min(end, pText.length));

        if (end > start) {
          selectedRanges.push({ paragraphIndex: pIdx, start, end });

          const pHighlights = highlights[pIdx] || [];
          if (pHighlights.some(h => Math.max(start, h.start) < Math.min(end, h.end))) {
            hasOverlappingHighlights = true;
          }
        }
      }

      if (selectedRanges.length === 0) return;

      // Position context menu directly at the exact position where user released the mouse!
      let mouseX = e.clientX;
      let mouseY = e.clientY;

      if (!mouseX && !mouseY && selection.rangeCount > 0) {
        const rect = range.getBoundingClientRect();
        mouseX = rect.right;
        mouseY = rect.bottom;
      }

      const menuWidth = 140;
      const menuHeight = 110;
      let x = mouseX + 8;
      let y = mouseY + 8;

      // Flip if overflowing screen edge so it never hides
      if (x + menuWidth > window.innerWidth - 12) {
        x = Math.max(10, mouseX - menuWidth - 8);
      }
      if (y + menuHeight > window.innerHeight - 12) {
        y = Math.max(10, mouseY - menuHeight - 8);
      }

      setMenuState({
        x,
        y,
        canHighlight: true,
        canClear: hasOverlappingHighlights,
        selectedRanges,
      });
    },
    [highlights, passage.paragraphs]
  );

  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      handleMouseUp(e);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleMouseUp]);

  // Handle right-click directly on an existing highlight section - opens menu AT THE MOUSE CURSOR
  const handleHighlightContextMenu = useCallback((e: React.MouseEvent, highlight: TextHighlight) => {
    e.preventDefault();
    e.stopPropagation();

    window.getSelection()?.removeAllRanges();

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const menuWidth = 140;
    const menuHeight = 110;
    const x = Math.min(Math.max(10, mouseX + 4), window.innerWidth - menuWidth - 10);
    const y = Math.min(Math.max(10, mouseY + 4), window.innerHeight - menuHeight - 10);

    setMenuState({
      x,
      y,
      canHighlight: false,
      canClear: true,
      targetHighlightId: highlight.id,
      selectedRanges: [
        {
          paragraphIndex: highlight.paragraphIndex,
          start: highlight.start,
          end: highlight.end,
        },
      ],
    });
  }, []);

  // Handle left-click on an existing highlight
  const handleHighlightClick = useCallback((e: React.MouseEvent, highlight: TextHighlight) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;

    e.preventDefault();
    e.stopPropagation();

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const menuWidth = 140;
    const menuHeight = 110;
    const x = Math.min(Math.max(10, mouseX + 4), window.innerWidth - menuWidth - 10);
    const y = Math.min(Math.max(10, mouseY + 4), window.innerHeight - menuHeight - 10);

    setMenuState({
      x,
      y,
      canHighlight: false,
      canClear: true,
      targetHighlightId: highlight.id,
      selectedRanges: [
        {
          paragraphIndex: highlight.paragraphIndex,
          start: highlight.start,
          end: highlight.end,
        },
      ],
    });
  }, []);

  // Apply Highlight action - supports unlimited multiple highlights
  const handleApplyHighlight = useCallback(() => {
    if (!menuState || !menuState.selectedRanges) return;

    setHighlightsByPassage(prev => {
      const passageHighlights = { ...(prev[passage.id] || {}) };

      menuState.selectedRanges!.forEach(({ paragraphIndex, start, end }) => {
        const currentList = passageHighlights[paragraphIndex] ? [...passageHighlights[paragraphIndex]] : [];
        const newHighlight: TextHighlight = {
          id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          paragraphIndex,
          start,
          end,
        };

        passageHighlights[paragraphIndex] = addAndMergeHighlight(currentList, newHighlight);
      });

      return { ...prev, [passage.id]: passageHighlights };
    });

    window.getSelection()?.removeAllRanges();
    setMenuState(null);
  }, [menuState, passage.id]);

  // Apply Clear action - removes right-clicked highlight or clears selected range
  const handleClearHighlight = useCallback(() => {
    if (!menuState) return;

    setHighlightsByPassage(prev => {
      const passageHighlights = { ...(prev[passage.id] || {}) };

      if (menuState.targetHighlightId) {
        for (const pIdx in passageHighlights) {
          passageHighlights[pIdx] = passageHighlights[pIdx].filter(
            h => h.id !== menuState.targetHighlightId
          );
        }
      } else if (menuState.selectedRanges) {
        menuState.selectedRanges.forEach(({ paragraphIndex, start, end }) => {
          const currentList = passageHighlights[paragraphIndex] || [];
          passageHighlights[paragraphIndex] = removeRangeFromHighlights(currentList, start, end);
        });
      }

      return { ...prev, [passage.id]: passageHighlights };
    });

    window.getSelection()?.removeAllRanges();
    setMenuState(null);
  }, [menuState, passage.id]);

  // Open Notes action
  const handleOpenNotes = useCallback(() => {
    if (!menuState) return;

    if (menuState.targetHighlightId) {
      for (const pIdx in highlights) {
        const found = highlights[pIdx]?.find(h => h.id === menuState.targetHighlightId);
        if (found) {
          setNoteModal({
            highlightId: found.id,
            paragraphIndex: found.paragraphIndex,
            initialText: found.note || '',
          });
          setNoteText(found.note || '');
          setMenuState(null);
          return;
        }
      }
    } else if (menuState.selectedRanges && menuState.selectedRanges.length > 0) {
      const first = menuState.selectedRanges[0];
      const newId = `hl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      setHighlightsByPassage(prev => {
        const passageHighlights = { ...(prev[passage.id] || {}) };
        const currentList = passageHighlights[first.paragraphIndex] || [];
        const newHighlight: TextHighlight = {
          id: newId,
          paragraphIndex: first.paragraphIndex,
          start: first.start,
          end: first.end,
        };
        passageHighlights[first.paragraphIndex] = addAndMergeHighlight(currentList, newHighlight);
        return { ...prev, [passage.id]: passageHighlights };
      });

      setNoteModal({
        highlightId: newId,
        paragraphIndex: first.paragraphIndex,
        initialText: '',
      });
      setNoteText('');
      window.getSelection()?.removeAllRanges();
      setMenuState(null);
    }
  }, [menuState, highlights, passage.id]);

  const handleSaveNote = () => {
    if (!noteModal) return;

    setHighlightsByPassage(prev => {
      const passageHighlights = { ...(prev[passage.id] || {}) };
      const pList = passageHighlights[noteModal.paragraphIndex] || [];
      passageHighlights[noteModal.paragraphIndex] = pList.map(h =>
        h.id === noteModal.highlightId ? { ...h, note: noteText.trim() || undefined } : h
      );
      return { ...prev, [passage.id]: passageHighlights };
    });

    setNoteModal(null);
  };

  // Helper to render paragraph with highlighted spans
  const renderParagraphContent = (paragraphText: string, paragraphIndex: number) => {
    const pHighlights = highlights[paragraphIndex];
    if (!pHighlights || pHighlights.length === 0) return paragraphText;

    const sorted = [...pHighlights].sort((a, b) => a.start - b.start);
    const elements: React.ReactNode[] = [];
    let cursor = 0;

    sorted.forEach((hl, i) => {
      const start = Math.max(cursor, Math.min(hl.start, paragraphText.length));
      const end = Math.max(start, Math.min(hl.end, paragraphText.length));

      if (start > cursor) {
        elements.push(paragraphText.slice(cursor, start));
      }

      if (end > start) {
        const textSnippet = paragraphText.slice(start, end);
        elements.push(
          <mark
            key={hl.id || `hl_${paragraphIndex}_${i}_${start}`}
            data-highlight-id={hl.id}
            onContextMenu={e => handleHighlightContextMenu(e, hl)}
            onClick={e => handleHighlightClick(e, hl)}
            className="bg-amber-300/60 dark:bg-[#78541e]/70 text-foreground dark:text-amber-100 border border-amber-400/80 dark:border-[#b87c28]/80 rounded-[2px] px-0.5 cursor-pointer hover:brightness-110 select-text transition-colors"
            title={hl.note ? `Note: "${hl.note}" (Right-click to Clear/Edit)` : 'Right-click to Clear or Add Note'}
          >
            {textSnippet}
            {hl.note && (
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1 bg-amber-600 dark:bg-amber-500 text-white rounded-full text-[9px] font-mono font-bold align-super select-none">
                *
              </span>
            )}
          </mark>
        );
      }

      cursor = end;
    });

    if (cursor < paragraphText.length) {
      elements.push(paragraphText.slice(cursor));
    }

    return elements;
  };

  const currentStyles = FONT_CLASSES[textSize];
  const fontClass = fontType === 'reading' ? 'font-reading' : 'font-sans';

  return (
    <Card className="p-3.5 sm:p-4 gap-2.5 bg-card dark:bg-[#0f141f] border-border/80 border-l-0 rounded-l-none rounded-r-lg shadow-2xs flex flex-col h-full overflow-hidden relative">
      {/* Compact IELTS Top Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-2 shrink-0">
        <div className="space-y-0.5">
          <h2 className="font-sans font-bold text-sm sm:text-base text-foreground tracking-wide uppercase">
            PASSAGE {passageNumber}
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-normal leading-tight">
            You should spend about 20 minutes on {questionRange}, which are based on Reading Passage {passageNumber}.
          </p>
        </div>

        {/* Compact Tool Icons */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <button
            type="button"
            onClick={() => setFontType(f => (f === 'reading' ? 'sans' : 'reading'))}
            className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 transition-colors"
            title={fontType === 'reading' ? 'Switch to Sans-serif font' : 'Switch to Book Serif font'}
          >
            {fontType === 'reading' ? 'Serif' : 'Sans'}
          </button>

          <span className="text-border">|</span>

          <button
            type="button"
            onClick={() => cycleTextSize('down')}
            disabled={textSize === 'sm'}
            aria-label="Decrease text size"
            className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Smaller text"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono font-bold px-0.5 text-muted-foreground select-none">
            {textSize.toUpperCase()}
          </span>

          <button
            type="button"
            onClick={() => cycleTextSize('up')}
            disabled={textSize === 'lg'}
            aria-label="Increase text size"
            className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Larger text"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Paragraphs and Content Container with MouseUp Selection Detection */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className={`flex-1 min-h-0 ${
          scroll
            ? `${currentStyles.line} lg:overflow-y-auto pr-2 scrollbar-thin`
            : currentStyles.line
        }`}
      >
        {/* Title & Subtitle - Refined, elegant, less bold */}
        <div className="text-center space-y-1 pt-1.5 pb-2.5">
          <h1 className={`${fontClass} font-semibold text-xl sm:text-2xl text-foreground/90 tracking-tight leading-snug`}>
            {passage.title}
          </h1>
          {passage.subtitle && (
            <p className={`${fontClass} italic text-xs sm:text-[13px] text-muted-foreground/85 max-w-xl mx-auto leading-relaxed font-normal`}>
              {passage.subtitle}
            </p>
          )}
        </div>

        {/* Paragraphs Flow with Multiple Highlights Support */}
        <div className={currentStyles.line}>
          {passage.paragraphs.map((paragraph, index) => (
            <p
              key={paragraph.label || index}
              className={`${fontClass} font-normal font-[400] text-neutral-800 dark:text-neutral-200 selection:bg-blue-600 selection:text-white text-justify sm:text-left ${currentStyles.body} ${
                showLabels && paragraph.label ? 'relative pl-6 sm:pl-7' : ''
              }`}
            >
              {showLabels && paragraph.label && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 w-4 select-none text-right font-mono text-[11px] font-bold leading-7 text-muted-foreground/60"
                >
                  {paragraph.label}
                </span>
              )}
              <span data-paragraph-body={index}>
                {renderParagraphContent(paragraph.text, index)}
              </span>
            </p>
          ))}
        </div>

      </div>

      {/* Floating IELTS Context Menu: Opens directly at mouse cursor */}
      {menuState && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ left: menuState.x, top: menuState.y }}
          className="fixed z-[9999] bg-[#1c2026] text-white border border-neutral-700/80 shadow-2xl rounded-xl py-1 px-1 min-w-[130px] space-y-0.5 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
        >
          {menuState.canHighlight && (
            <button
              type="button"
              onClick={handleApplyHighlight}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-neutral-200 hover:text-white transition-colors"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">Highlight</span>
            </button>
          )}

          {menuState.canClear && (
            <button
              type="button"
              onClick={handleClearHighlight}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-neutral-200 hover:text-white transition-colors"
            >
              <Eraser className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-medium">Clear</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenNotes}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-neutral-200 hover:text-white transition-colors"
          >
            <PenLine className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium">Notes</span>
          </button>
        </div>,
        document.body
      )}

      {/* Notes Modal / Popover */}
      {noteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#1c2026] text-white border border-neutral-700 rounded-xl p-4 w-full max-w-sm space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5 text-blue-400" />
                Highlight Note
              </span>
              <button
                type="button"
                onClick={() => setNoteModal(null)}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Write your note for this highlight…"
              rows={3}
              className="w-full bg-[#12151b] border border-neutral-700 rounded-lg p-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNoteModal(null)}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-3.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

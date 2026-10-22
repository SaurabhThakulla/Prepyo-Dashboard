import React, { useLayoutEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Zoom steps for the figure and its full view.
const ZOOMS = [1, 1.5, 2, 3];

// Tallest the figure may be drawn, in CSS pixels.
const MAX_HEIGHT = 360;
// Blank canvas kept around the trimmed figure, in image pixels.
const MARGIN = 6;
// Smallest scale on a phone (18px labels come out near 10px); wider figures scroll.
const PHONE_SCALE = 0.55;
// Phone width the figure is assumed to fit in without scrolling.
const PHONE_FIT = 330;

interface Crop { x: number; y: number; w: number; h: number; fullW: number; fullH: number }

// Until the image loads, reserve the bank's full 760x440 canvas.
const FULL: Crop = { x: 0, y: 0, w: 760, h: 440, fullW: 760, fullH: 440 };

/** The part of the image that is not blank white, plus a small margin. */
function trimWhitespace(img: HTMLImageElement): Crop | null {
  const fullW = img.naturalWidth, fullH = img.naturalHeight;
  if (!fullW || !fullH) return null;
  const canvas = document.createElement('canvas');
  canvas.width = fullW;
  canvas.height = fullH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, fullW, fullH).data;
  } catch {
    return null; // a cross-origin image can't be read; show it whole
  }
  let x0 = fullW, y0 = fullH, x1 = -1, y1 = -1;
  for (let y = 0; y < fullH; y++) {
    for (let x = 0; x < fullW; x++) {
      const i = (y * fullW + x) * 4;
      if (data[i + 3] > 16 && (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const x = Math.max(0, x0 - MARGIN), y = Math.max(0, y0 - MARGIN);
  return { x, y, w: Math.min(fullW, x1 + MARGIN + 1) - x, h: Math.min(fullH, y1 + MARGIN + 1) - y, fullW, fullH };
}

/**
 * Zoom and pan for a scrolling box: zooming keeps the same spot in the middle,
 * and when zoomed in a mouse can drag the figure around (touch scrolls natively).
 */
function useZoomPan(zoom: number, setZoom: (zoom: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const center = useRef({ x: 0.5, y: 0.5 });
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = center.current.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = center.current.y * el.scrollHeight - el.clientHeight / 2;
  }, [zoom]);

  const zoomTo = (z: number) => {
    const el = ref.current;
    if (el) {
      center.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
        y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
      };
    }
    setZoom(z);
  };

  const panning = zoom > 1;
  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!panning || !el || e.pointerType !== 'mouse' || e.button !== 0) return;
      drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current, d = drag.current;
      if (!el || !d) return;
      el.scrollLeft = d.left - (e.clientX - d.x);
      el.scrollTop = d.top - (e.clientY - d.y);
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
  };
  return { ref, zoomTo, handlers, panClass: panning ? 'cursor-grab active:cursor-grabbing select-none' : '' };
}

/**
 * The figure a question is about: a chart, table, map or diagram.
 *
 * Bank figures sit on a 760x440 canvas, often with wide blank margins (a small
 * table in the middle). Once the image loads, those margins are trimmed and the
 * rest is drawn as large as fits under MAX_HEIGHT, so the figure is shorter on
 * the page but its content bigger.
 *
 * On a phone the figure keeps a readable width; only figures too wide for that scroll sideways.
 */
export default function QuestionFigure({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // Keyed by src, so the next question's figure never borrows this one's trim.
  const [crop, setCrop] = useState<{ src: string; crop: Crop } | null>(null);
  const c = crop?.src === src ? crop.crop : FULL;
  const phoneMin = Math.round(c.w * PHONE_SCALE);
  // Keyed by src too, so a new question starts at 100%.
  const [zoomFor, setZoomFor] = useState<{ src: string; zoom: number }>({ src, zoom: 1 });
  const zoom = zoomFor.src === src ? zoomFor.zoom : 1;
  const [fullView, setFullView] = useState(false);
  // Zooming widens the frame to the whole card; the figure grows up to that width, never past it.
  const width = `min(100%, ${Math.round((MAX_HEIGHT * c.w * zoom) / c.h)}px)`;
  return (
    <div className={cn('relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl bg-white', className, zoom > 1 && 'max-w-none')}>
      <div className="flex justify-end px-2 pt-2">
        <ZoomControls zoom={zoom} onZoom={z => setZoomFor({ src, zoom: z })} onExpand={() => setFullView(true)} />
      </div>
      <div className="overflow-x-auto overscroll-x-contain px-1 py-1.5 sm:p-1.5">
        {/* At 100% a click opens the large view. */}
        <div
          role={zoom === 1 ? 'button' : undefined}
          tabIndex={zoom === 1 ? 0 : undefined}
          onClick={zoom === 1 ? () => setFullView(true) : undefined}
          onKeyDown={zoom === 1 ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFullView(true); } } : undefined}
          title={zoom === 1 ? 'View the figure larger' : undefined}
          className={cn('relative mx-auto block min-w-[var(--fig-min)] overflow-hidden sm:min-w-0', zoom === 1 && 'cursor-zoom-in')}
          style={{
            ['--fig-min' as string]: `${Math.round(phoneMin * zoom)}px`,
            aspectRatio: `${c.w} / ${c.h}`,
            width,
          }}
        >
          <img
            src={src}
            alt={alt}
            decoding="async"
            onLoad={e => setCrop({ src, crop: trimWhitespace(e.currentTarget) ?? FULL })}
            className="absolute max-w-none"
            style={{
              left: `${(-c.x / c.w) * 100}%`,
              top: `${(-c.y / c.h) * 100}%`,
              width: `${(c.fullW / c.w) * 100}%`,
              height: `${(c.fullH / c.h) * 100}%`,
            }}
          />
        </div>
      </div>
      {/* The frame is white in both themes, so this line is slate rather than a theme colour. */}
      <p className="border-t border-slate-200 px-3 py-1.5 text-center text-[11px] font-medium text-slate-500 sm:hidden">
        {phoneMin > PHONE_FIT ? 'Swipe sideways, or tap the figure to view it larger' : 'Tap the figure to view it larger'}
      </p>
      <FullView src={src} alt={alt} open={fullView} onOpenChange={setFullView} />
    </div>
  );
}

/** −, the zoom level, +, and a button for the large view. */
function ZoomControls({ zoom, onZoom, onExpand, className }: { zoom: number; onZoom: (zoom: number) => void; onExpand?: () => void; className?: string }) {
  const i = ZOOMS.indexOf(zoom);
  const btn = 'flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-30';
  return (
    <div className={cn('flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/95 p-0.5 shadow-md backdrop-blur', className)}>
      <button type="button" className={btn} onClick={() => onZoom(ZOOMS[i - 1])} disabled={i <= 0} aria-label="Zoom out" title="Zoom out">
        <Minus className="h-4 w-4" />
      </button>
      <button type="button" className="min-w-11 text-xs font-semibold tabular-nums text-slate-700" onClick={() => onZoom(1)} title="Back to 100%">
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" className={btn} onClick={() => onZoom(ZOOMS[i + 1])} disabled={i >= ZOOMS.length - 1} aria-label="Zoom in" title="Zoom in">
        <Plus className="h-4 w-4" />
      </button>
      {onExpand && (
        <button type="button" className={cn(btn, 'border-l border-slate-200 rounded-l-none')} onClick={onExpand} aria-label="View larger" title="View larger">
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** The whole image in a large popup, with its own zoom. */
function FullView({ src, alt, open, onOpenChange }: { src: string; alt: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [zoom, setZoom] = useState(1);
  const pan = useZoomPan(zoom, setZoom);
  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setZoom(1); }}>
      <DialogContent centered className="max-w-6xl gap-3 bg-white p-3 sm:p-4">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">The question figure, enlarged</DialogDescription>
        <ZoomControls zoom={zoom} onZoom={pan.zoomTo} className="mr-10 self-end justify-self-end" />
        <div ref={pan.ref} {...pan.handlers} className={cn('max-h-[78vh] overflow-auto overscroll-contain rounded-lg', pan.panClass)}>
          <img src={src} alt={alt} className="mx-auto block max-w-none" style={{ width: `${zoom * 100}%` }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

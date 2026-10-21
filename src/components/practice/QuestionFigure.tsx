import React, { useState } from 'react';
import { cn } from '@/lib/utils';

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
  return (
    <div className={cn('mx-auto w-full max-w-3xl overflow-hidden rounded-xl bg-white', className)}>
      <div className="overflow-x-auto overscroll-x-contain px-1 py-1.5 sm:p-1.5">
        {/* Tapping opens the image on its own, where a phone can pinch-zoom it. */}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          title="Open the figure full size"
          className="relative mx-auto block min-w-[var(--fig-min)] overflow-hidden sm:min-w-0"
          style={{ ['--fig-min' as string]: `${phoneMin}px`, aspectRatio: `${c.w} / ${c.h}`, width: `min(100%, ${Math.round((MAX_HEIGHT * c.w) / c.h)}px)` }}
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
        </a>
      </div>
      {/* The frame is white in both themes, so this line is slate rather than a theme colour. */}
      <p className="border-t border-slate-200 px-3 py-1.5 text-center text-[11px] font-medium text-slate-500 sm:hidden">
        {phoneMin > PHONE_FIT ? 'Swipe sideways, or tap to open the figure full size' : 'Tap the figure to open it full size'}
      </p>
    </div>
  );
}

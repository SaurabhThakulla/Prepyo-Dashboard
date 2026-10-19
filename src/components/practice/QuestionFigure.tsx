import React from 'react';
import { cn } from '@/lib/utils';

/**
 * The figure a question is about: a chart, table, map or diagram.
 *
 * Every figure in the bank is drawn on the same 760x440 canvas, so the frame
 * is cut to that ratio (19:11) and sized from its own width alone. That gives
 * each question identical geometry rather than a size that shifts with the
 * window, and it reserves the figure's footprint before the image loads so
 * nothing below it jumps. object-contain keeps the axis labels out of a crop.
 *
 * A phone is too narrow for that canvas: squeezed to the screen, its 18px
 * labels come out near 6px. So there the figure keeps a readable width and
 * the frame scrolls sideways instead.
 */
export default function QuestionFigure({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-3xl overflow-hidden rounded-xl bg-white', className)}>
      <div className="overflow-x-auto overscroll-x-contain p-3 sm:p-4">
        <div className="relative w-[520px] sm:w-full" style={{ aspectRatio: '19 / 11' }}>
          <img src={src} alt={alt} decoding="async" className="absolute inset-0 h-full w-full object-contain" />
        </div>
      </div>
      {/* The frame is white in both themes, so this line is slate rather than a theme colour. */}
      <p className="border-t border-slate-200 px-3 py-1.5 text-center text-[11px] font-medium text-slate-500 sm:hidden">
        Swipe sideways to see the whole figure
      </p>
    </div>
  );
}

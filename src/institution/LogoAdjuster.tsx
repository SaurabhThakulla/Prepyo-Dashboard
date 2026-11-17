import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';
import { uploadLogo } from './api';

const FRAME = 224; // preview square, CSS px
const OUTPUT = 512; // saved logo, px
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const NUDGE = 4;

export interface Placement {
  zoom: number;
  x: number; // offset from the centre, in preview px
  y: number;
}

/**
 * Where the image lands in a square of `size` px: fitted inside the square at
 * zoom 1, then scaled and moved. The preview and the saved PNG both use it, so
 * what the admin sees is what gets saved.
 */
export function placeImage(width: number, height: number, { zoom, x, y }: Placement, size: number) {
  const scale = (Math.min(FRAME / width, FRAME / height) * zoom * size) / FRAME;
  const w = width * scale;
  const h = height * scale;
  return { left: size / 2 + (x * size) / FRAME - w / 2, top: size / 2 + (y * size) / FRAME - h / 2, width: w, height: h };
}

const START: Placement = { zoom: 1, x: 0, y: 0 };

/** Zoom and move the current logo inside its square, then save the result as the new logo. */
export default function LogoAdjuster({
  open,
  logoUrl,
  onClose,
  onSaved,
}: {
  open: boolean;
  logoUrl: string;
  onClose: () => void;
  onSaved: (logoUrl: string) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [place, setPlace] = useState<Placement>(START);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; from: Placement } | null>(null);

  useEffect(() => {
    if (!open) return;
    setPlace(START);
    setError(null);
    setImage(null);
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setError('We could not load your logo. Please try again.');
    img.src = logoUrl;
  }, [open, logoUrl]);

  const zoomTo = (zoom: number) => setPlace(p => ({ ...p, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }));
  const move = (dx: number, dy: number) => setPlace(p => ({ ...p, x: p.x + dx, y: p.y + dy }));

  const save = async () => {
    if (!image || saving) return;
    setSaving(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('This browser cannot edit images.');
      ctx.imageSmoothingQuality = 'high';
      const r = placeImage(image.naturalWidth, image.naturalHeight, place, OUTPUT);
      ctx.drawImage(image, r.left, r.top, r.width, r.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('We could not prepare your logo. Please try again.');
      const saved = await uploadLogo(blob);
      onSaved(saved.logoUrl);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const r = image ? placeImage(image.naturalWidth, image.naturalHeight, place, FRAME) : null;

  return (
    <Dialog open={open} onOpenChange={next => !next && !saving && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust logo</DialogTitle>
          <DialogDescription>Drag to move it, and zoom in or out until it fits the square.</DialogDescription>
        </DialogHeader>

        <div
          role="application"
          aria-label="Logo position. Drag, or use the arrow keys to move and + or - to zoom."
          tabIndex={0}
          style={{ width: FRAME, height: FRAME }}
          className="relative mx-auto cursor-grab touch-none select-none overflow-hidden rounded-xl border border-border bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
          onPointerDown={event => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, from: place };
          }}
          onPointerMove={event => {
            const d = drag.current;
            if (d) setPlace({ ...d.from, x: d.from.x + event.clientX - d.x, y: d.from.y + event.clientY - d.y });
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={event => zoomTo(place.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08))}
          onKeyDown={event => {
            const keys: Record<string, () => void> = {
              ArrowLeft: () => move(-NUDGE, 0),
              ArrowRight: () => move(NUDGE, 0),
              ArrowUp: () => move(0, -NUDGE),
              ArrowDown: () => move(0, NUDGE),
              '+': () => zoomTo(place.zoom + 0.1),
              '=': () => zoomTo(place.zoom + 0.1),
              '-': () => zoomTo(place.zoom - 0.1),
            };
            if (keys[event.key]) {
              event.preventDefault();
              keys[event.key]();
            }
          }}
        >
          {image && r ? (
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
            />
          ) : (
            !error && <Loader2 className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Zoom out" onClick={() => zoomTo(place.zoom - 0.1)}>
            <Minus className="h-4 w-4" />
          </Button>
          <input
            type="range"
            aria-label="Zoom"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={place.zoom}
            onChange={event => zoomTo(Number(event.target.value))}
            className="w-full accent-primary"
          />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Zoom in" onClick={() => zoomTo(place.zoom + 0.1)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" className="h-9 rounded-lg font-medium" disabled={saving} onClick={() => setPlace(START)}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-lg font-medium" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" className="h-9 rounded-lg font-medium" disabled={!image || saving} onClick={() => void save()}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save logo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

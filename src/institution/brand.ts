import { useEffect } from 'react';

// The institution's brand colour, applied to the whole admin dashboard through the theme's
// --primary variable (buttons, highlights, rings), and to the sidebar's gradient.

const HEX = /^#[0-9a-f]{6}$/i;

/** A #rrggbb colour as [hue, saturation %, lightness %]; null when it is not one. */
export function hexToHsl(hex: string): [number, number, number] | null {
  if (!HEX.test(hex)) return null;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

// Text on the colour: white, unless the colour is light enough that dark text reads better.
function foregroundFor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? '224 71% 12%' : '0 0% 100%';
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The sidebar's top-to-bottom gradient in the brand colour; undefined keeps the default blue. */
export function brandGradient(hex: string): string | undefined {
  const hsl = hexToHsl(hex);
  if (!hsl) return undefined;
  const [h, s, l] = hsl;
  return `linear-gradient(to bottom, hsl(${h} ${s}% ${clamp(l + 10, 0, 70)}%), hsl(${h} ${s}% ${l}%), hsl(${h} ${s}% ${clamp(l - 18, 6, 100)}%))`;
}

const VARS = ['--primary', '--primary-foreground', '--ring', '--sidebar-primary', '--sidebar-ring'] as const;

/** Sets the theme's primary colour to the brand colour while mounted, and restores it after. */
export function useBrandColor(hex: string) {
  useEffect(() => {
    const hsl = hexToHsl(hex);
    if (!hsl) return;
    const value = `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
    const root = document.documentElement;
    const before = VARS.map(name => [name, root.style.getPropertyValue(name)] as const);
    for (const name of VARS) root.style.setProperty(name, name === '--primary-foreground' ? foregroundFor(hex) : value);
    return () => {
      for (const [name, previous] of before) {
        if (previous) root.style.setProperty(name, previous);
        else root.style.removeProperty(name);
      }
    };
  }, [hex]);
}

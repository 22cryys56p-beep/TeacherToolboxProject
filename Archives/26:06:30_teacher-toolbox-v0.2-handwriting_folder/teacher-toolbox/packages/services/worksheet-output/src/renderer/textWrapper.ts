/**
 * @module textWrapper
 * @description SVG text has no native word wrap. This module measures text
 * and breaks it into lines that fit a target width.
 *
 * KNOWN LIMITATION (documented in the renderer design review, Weakness 1):
 * preview-mode measurement uses a fast average-character-width approximation;
 * full-render-mode measurement uses font metrics from the loaded font
 * definition when available. These can disagree in edge cases for unusual
 * character distributions (e.g. a line that is mostly "i" and "l" vs mostly
 * "W" and "M"). This is acceptable for v1.0 — platform.free-text is the only
 * component that currently word-wraps, and its content is short instructional
 * text, not long-form prose where the difference would compound. Revisit
 * with real font metric tables if long-form text components are added later.
 */

import type { FontMetrics } from './types.js';
import { ptToUnits } from './units.js';

export interface WrapResult {
  lines: string[];
  /** Total height in SVG units required to render all lines at the given size/lineHeight */
  totalHeight: number;
}

/**
 * Wrap text to fit within maxWidthUnits (SVG user units), at the given font
 * size in points, using either real font metrics (full mode) or a
 * conservative fallback approximation (preview mode / metrics unavailable).
 */
export function wrapText(
  text: string,
  maxWidthUnits: number,
  sizePt: number,
  lineHeightMultiplier: number,
  metrics: FontMetrics | null,
): WrapResult {
  const averageAdvance = metrics?.averageAdvance ?? 0.55; // fallback: 0.55em average glyph width
  const charWidthUnits = ptToUnits(sizePt) * averageAdvance;

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';
  let currentLineWidth = 0;

  for (const word of words) {
    const wordWidth = word.length * charWidthUnits;
    const spaceWidth = currentLine ? charWidthUnits : 0;

    if (currentLine && currentLineWidth + spaceWidth + wordWidth > maxWidthUnits) {
      lines.push(currentLine);
      currentLine = word;
      currentLineWidth = wordWidth;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
      currentLineWidth += spaceWidth + wordWidth;
    }
  }
  if (currentLine) lines.push(currentLine);
  if (lines.length === 0) lines.push('');

  const lineHeightUnits = ptToUnits(sizePt) * lineHeightMultiplier;

  return {
    lines,
    totalHeight: lines.length * lineHeightUnits,
  };
}

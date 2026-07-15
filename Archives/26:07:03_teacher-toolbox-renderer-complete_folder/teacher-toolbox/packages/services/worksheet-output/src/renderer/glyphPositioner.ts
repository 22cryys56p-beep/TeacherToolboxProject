/**
 * @module glyphPositioner
 * @description Shared positioning math for placing SVG path font glyphs onto
 * ruled handwriting lines.
 *
 * TTHFS §4.1 scaling rule (enforced here — this is the only place in the
 * renderer that computes glyph scale):
 *
 *   scale = targetHeightUnits / unitsPerEm
 *
 * NOT targetHeightUnits / glyph.height. A glyph's own height may be smaller
 * than unitsPerEm (e.g. a descender-free lowercase letter that doesn't use
 * the full em square). Scaling by glyph.height would treat every glyph as
 * if it fills its em square, collapsing the baseline/midline/ascender
 * distinctions that handwriting instruction depends on.
 *
 * unitsPerEm is passed explicitly to every function — callers obtain it via
 * FontRenderContext.getUnitsPerEm(fontId). This keeps the positioner pure
 * (no font registry access needed) while using the correct denominator.
 */

import type { GlyphStroke, SVGGlyph } from '@teacher-toolbox/types';
import { ptToUnits } from './units.js';

export interface GlyphPlacement {
  /** SVG transform attribute value to position and scale the glyph correctly */
  transform: string;
}

/**
 * Compute the transform needed to place a single glyph so its baseline sits
 * exactly on `baselineY`, scaled to `sizePt`, with its left edge at `startX`.
 *
 * @param unitsPerEm  Font-wide em-square size — the TTHFS §4.1 scale denominator.
 */
export function placeGlyph(
  glyph: SVGGlyph,
  startX: number,
  baselineY: number,
  sizePt: number,
  unitsPerEm: number,
): GlyphPlacement {
  const targetHeightUnits = ptToUnits(sizePt);
  const scale = unitsPerEm > 0 ? targetHeightUnits / unitsPerEm : 1;

  const baselineOffsetScaled = glyph.baseline * scale;
  const translateY = baselineY - baselineOffsetScaled;

  return {
    transform: `translate(${startX}, ${translateY}) scale(${scale})`,
  };
}

/**
 * Whole-glyph placement for an entire word — for ghost letters and static
 * "model word" rendering where stroke sequence need not be shown.
 *
 * For stroke-by-stroke trace rendering use placeWordStrokes() instead.
 *
 * @param unitsPerEm  Font-wide em-square size — the TTHFS §4.1 scale denominator.
 */
export function placeWord(
  word: string,
  glyphs: Record<string, SVGGlyph>,
  fallbackGlyph: SVGGlyph | undefined,
  startX: number,
  baselineY: number,
  sizePt: number,
  unitsPerEm: number,
): Array<{ char: string; glyph: SVGGlyph; placement: GlyphPlacement }> {
  const targetHeightUnits = ptToUnits(sizePt);
  const scale = unitsPerEm > 0 ? targetHeightUnits / unitsPerEm : 1;
  const results: Array<{ char: string; glyph: SVGGlyph; placement: GlyphPlacement }> = [];

  let cursorX = startX;

  for (const char of word) {
    const glyph = glyphs[char] ?? fallbackGlyph;
    if (!glyph) continue;

    const placement = placeGlyph(glyph, cursorX, baselineY, sizePt, unitsPerEm);
    results.push({ char, glyph, placement });
    cursorX += glyph.advance * scale;
  }

  return results;
}

// ---------------------------------------------------------------------------
// Stroke-level positioning — the pedagogically authoritative rendering path
// ---------------------------------------------------------------------------

export interface PositionedStroke {
  char:       string;
  charIndex:  number;
  stroke:     GlyphStroke;
  /** SVG transform to apply to this stroke's <path> element */
  transform:  string;
  /** Absolute position of the stroke's start point in SVG user units */
  startPointAbsolute: { x: number; y: number };
}

/**
 * Position every stroke of a single glyph, preserving pedagogical order.
 *
 * This is the function handwriting renderers must use for trace rendering.
 * It is the only positioning path that retains stroke order, start points,
 * and direction — the data that constitutes actual handwriting instruction
 * rather than a shape that merely resembles the target letter.
 *
 * Returns [] when glyph.strokes is empty. Callers must surface this as a
 * visible warning (TTHFS §8.2) — never fabricate stroke data.
 *
 * @param unitsPerEm  Font-wide em-square size — the TTHFS §4.1 scale denominator.
 */
export function placeGlyphStrokes(
  glyph: SVGGlyph,
  char: string,
  charIndex: number,
  startX: number,
  baselineY: number,
  sizePt: number,
  unitsPerEm: number,
): PositionedStroke[] {
  if (glyph.strokes.length === 0) return [];

  const targetHeightUnits = ptToUnits(sizePt);
  const scale = unitsPerEm > 0 ? targetHeightUnits / unitsPerEm : 1;
  const baselineOffsetScaled = glyph.baseline * scale;
  const translateY = baselineY - baselineOffsetScaled;

  // Strokes are sorted by authored order — order in the data IS the
  // pedagogical stroke sequence, never re-sorted geometrically.
  const ordered = [...glyph.strokes].sort((a, b) => a.order - b.order);

  return ordered.map((stroke) => ({
    char,
    charIndex,
    stroke,
    transform: `translate(${startX}, ${translateY}) scale(${scale})`,
    startPointAbsolute: {
      x: startX + stroke.startPoint.x * scale,
      y: translateY + stroke.startPoint.y * scale,
    },
  }));
}

/**
 * Position every stroke of every glyph in a word, in reading order.
 *
 * Glyphs with no stroke data are skipped (not approximated) and reported
 * in missingStrokeData so the caller can surface a visible warning.
 *
 * @param unitsPerEm  Font-wide em-square size — the TTHFS §4.1 scale denominator.
 */
export function placeWordStrokes(
  word: string,
  glyphs: Record<string, SVGGlyph>,
  fallbackGlyph: SVGGlyph | undefined,
  startX: number,
  baselineY: number,
  sizePt: number,
  unitsPerEm: number,
): { strokes: PositionedStroke[]; missingStrokeData: string[] } {
  const targetHeightUnits = ptToUnits(sizePt);
  const scale = unitsPerEm > 0 ? targetHeightUnits / unitsPerEm : 1;
  const strokes: PositionedStroke[] = [];
  const missingStrokeData: string[] = [];

  let cursorX = startX;
  let charIndex = 0;

  for (const char of word) {
    const glyph = glyphs[char] ?? fallbackGlyph;
    if (!glyph) { charIndex++; continue; }

    if (glyph.strokes.length === 0) {
      missingStrokeData.push(char);
    } else {
      strokes.push(
        ...placeGlyphStrokes(glyph, char, charIndex, cursorX, baselineY, sizePt, unitsPerEm),
      );
    }

    cursorX += glyph.advance * scale;
    charIndex++;
  }

  return { strokes, missingStrokeData };
}

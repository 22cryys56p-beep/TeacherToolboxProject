/**
 * @module glyphPositioner
 * @description Shared positioning math for placing SVG path font glyphs onto
 * ruled handwriting lines.
 *
 * This logic must exist in exactly one place. If HandwritingWordRenderer and
 * SpellingWordCellRenderer each independently computed where to position a
 * glyph's baseline, they would inevitably drift apart in behaviour over time.
 * Both call into this module instead.
 */

import type { SVGGlyph } from '@teacher-toolbox/types';
import { ptToUnits } from './units.js';

export interface GlyphPlacement {
  /** SVG transform attribute value to position and scale the glyph correctly */
  transform: string;
}

/**
 * Compute the transform needed to place a single glyph so its baseline sits
 * exactly on `baselineY`, scaled to `sizePt`, with its left edge starting at `startX`.
 *
 * All coordinates are in SVG user units, relative to whatever coordinate
 * space the caller is already working in (typically the component's
 * layoutRect-local space).
 */
export function placeGlyph(
  glyph: SVGGlyph,
  startX: number,
  baselineY: number,
  sizePt: number,
): GlyphPlacement {
  const targetHeightUnits = ptToUnits(sizePt);
  const scale = glyph.height > 0 ? targetHeightUnits / glyph.height : 1;

  // The glyph's own baseline offset, scaled, tells us how far down from the
  // glyph's top-left origin its baseline sits. We need to translate so that
  // point lands exactly on baselineY.
  const baselineOffsetScaled = glyph.baseline * scale;
  const translateY = baselineY - baselineOffsetScaled;

  return {
    transform: `translate(${startX}, ${translateY}) scale(${scale})`,
  };
}

/**
 * Compute placements for an entire word, advancing startX by each glyph's
 * advance width (scaled) as it goes. Returns one GlyphPlacement per character
 * that has a glyph available — characters with no glyph (and no fallback) are
 * skipped, not substituted with a guess.
 */
export function placeWord(
  word: string,
  glyphs: Record<string, SVGGlyph>,
  fallbackGlyph: SVGGlyph | undefined,
  startX: number,
  baselineY: number,
  sizePt: number,
): Array<{ char: string; glyph: SVGGlyph; placement: GlyphPlacement }> {
  const targetHeightUnits = ptToUnits(sizePt);
  const results: Array<{ char: string; glyph: SVGGlyph; placement: GlyphPlacement }> = [];

  let cursorX = startX;

  for (const char of word) {
    const glyph = glyphs[char] ?? fallbackGlyph;
    if (!glyph) continue;

    const placement = placeGlyph(glyph, cursorX, baselineY, sizePt);
    results.push({ char, glyph, placement });

    const scale = glyph.height > 0 ? targetHeightUnits / glyph.height : 1;
    cursorX += glyph.advance * scale;
  }

  return results;
}

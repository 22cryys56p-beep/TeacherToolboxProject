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

import type { GlyphStroke, SVGGlyph } from '@teacher-toolbox/types';
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
 *
 * NOTE: this is whole-glyph placement (one transform per letter), suitable
 * for ghost letters and static "model word" rendering. For stroke-by-stroke
 * trace rendering — the primary handwriting-instruction use case — use
 * placeWordStrokes() instead, which preserves per-stroke order, direction,
 * and start points rather than collapsing a glyph to a single opaque path.
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

// ---------------------------------------------------------------------------
// Stroke-level positioning — the pedagogically authoritative rendering path
// ---------------------------------------------------------------------------

export interface PositionedStroke {
  char: string;
  charIndex: number;
  stroke: GlyphStroke;
  /** SVG transform to apply to this stroke's path so it lands correctly on the baseline, scaled */
  transform: string;
  /** Start-point marker position in the SAME coordinate space as `transform` is applied within (i.e. pre-transform, font units — consumer applies transform to a <circle> at this point too, OR use startPointAbsolute below) */
  startPointAbsolute: { x: number; y: number };
}

/**
 * Position every stroke of a single glyph, preserving order and direction.
 * This is the function the HandwritingWordRenderer must use for trace
 * rendering — it is the only positioning path that retains the pedagogical
 * data (stroke order, start point, direction) needed for genuine handwriting
 * instruction rather than a shape that merely resembles the target letter.
 *
 * If glyph.strokes is empty, returns an empty array — callers must check for
 * this and either fall back to non-directional path rendering (clearly
 * marked as such) or surface a warning. This function never invents stroke
 * data; doing so would risk teaching an incorrect stroke order, which is
 * worse than omitting stroke-order guidance entirely.
 */
export function placeGlyphStrokes(
  glyph: SVGGlyph,
  char: string,
  charIndex: number,
  startX: number,
  baselineY: number,
  sizePt: number,
): PositionedStroke[] {
  if (glyph.strokes.length === 0) return [];

  const targetHeightUnits = ptToUnits(sizePt);
  const scale = glyph.height > 0 ? targetHeightUnits / glyph.height : 1;
  const baselineOffsetScaled = glyph.baseline * scale;
  const translateY = baselineY - baselineOffsetScaled;

  // Strokes are guaranteed rendered/numbered in their authored order, not
  // re-sorted by any geometric heuristic — order in the data IS the
  // pedagogical stroke sequence.
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
 * Position every stroke of every glyph in a word, in reading order, advancing
 * the cursor by each glyph's scaled advance width. This is what
 * HandwritingWordRenderer calls to get the complete, orderable list of
 * strokes to draw — flattened across the whole word but each stroke still
 * tagged with its source character and that character's stroke order, so a
 * renderer can choose to animate per-letter or per-word.
 *
 * Glyphs with no stroke data are SKIPPED (not silently approximated) and the
 * caller receives a separate list of which characters had no stroke data, so
 * a warning can be surfaced rather than presenting an incomplete word as if
 * fully taught.
 */
export function placeWordStrokes(
  word: string,
  glyphs: Record<string, SVGGlyph>,
  fallbackGlyph: SVGGlyph | undefined,
  startX: number,
  baselineY: number,
  sizePt: number,
): { strokes: PositionedStroke[]; missingStrokeData: string[] } {
  const targetHeightUnits = ptToUnits(sizePt);
  const strokes: PositionedStroke[] = [];
  const missingStrokeData: string[] = [];

  let cursorX = startX;
  let charIndex = 0;

  for (const char of word) {
    const glyph = glyphs[char] ?? fallbackGlyph;
    if (!glyph) {
      charIndex++;
      continue;
    }

    if (glyph.strokes.length === 0) {
      missingStrokeData.push(char);
    } else {
      strokes.push(...placeGlyphStrokes(glyph, char, charIndex, cursorX, baselineY, sizePt));
    }

    const scale = glyph.height > 0 ? targetHeightUnits / glyph.height : 1;
    cursorX += glyph.advance * scale;
    charIndex++;
  }

  return { strokes, missingStrokeData };
}

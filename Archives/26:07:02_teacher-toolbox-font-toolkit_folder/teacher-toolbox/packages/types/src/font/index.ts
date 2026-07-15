/**
 * @package @teacher-toolbox/types/font
 * @description Font data model. Distinguishes between standard web fonts
 * (used for UI and document labels) and SVG path fonts (used by the
 * rendering engine for handwriting trace and model text).
 */

import type { FontId, GradeLevel } from '../common/index.js';

export type FontRole = 'display' | 'body' | 'handwriting' | 'monospace';
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontSource = 'bundled' | 'system' | 'user-uploaded' | 'google-fonts';
export type HandwritingScript =
  | 'zaner-bloser-print'
  | 'zaner-bloser-cursive'
  | 'dnealian-print'
  | 'dnealian-cursive'
  | 'hwt-print'
  | 'hwt-cursive'
  | 'custom';

export interface FontDefinition {
  id: FontId;
  name: string;
  familyName: string;
  role: FontRole;
  source: FontSource;
  /** For handwriting fonts only */
  handwriting?: HandwritingFontMeta;
  /** Loadable file variants */
  variants: FontVariant[];
  previewText?: string;
  license: FontLicense;
}

export interface HandwritingFontMeta {
  script: HandwritingScript;
  /** Recommended grade range e.g. ['K', '2'] */
  gradeRange: [GradeLevel, GradeLevel];
  /**
   * Ratio of ascender height to x-height.
   * Used by the renderer to calculate ruling line positions.
   */
  lineHeightRatio: number;
  descenderRatio: number;
  /** How ruling lines should be drawn to complement this font */
  guidelines: GuidelineSpec;
}

export interface GuidelineSpec {
  /** Number of ruling lines per row */
  lineCount: 2 | 3 | 4;
  /** Labels for each line from bottom to top, e.g. ['baseline', 'midline', 'topline'] */
  lineLabels: string[];
  /** Whether to draw a left margin line */
  showMargin: boolean;
  /** Whether to show descender guide */
  showDescender: boolean;
  /**
   * Proportion of total row height for each guide line, from bottom (0) to top (1),
   * in the same order as lineLabels. e.g. [0.6, 0.8, 1.0] for a 3-line baseline/
   * midline/topline system, or [0, 0.6, 0.75, 1.0] for a 4-line system with a
   * descender. The HandwritingLineRenderer reads this array — it never hardcodes
   * proportions itself. This keeps line geometry a property of the font/script
   * definition (an educational fact) rather than a renderer implementation detail.
   */
  lineRatios: number[];
}

export interface FontVariant {
  weight: FontWeight;
  style: 'normal' | 'italic';
  /** Relative path to the font file within the assets package */
  path: string;
  format: 'woff2' | 'woff' | 'ttf' | 'svg-path-font';
}

export interface FontLicense {
  spdx: string;      // e.g. 'OFL-1.1'
  attribution?: string;
  commercialUse: boolean;
}

/**
 * SVG Path Font — the custom format used for handwriting fonts.
 * Each glyph is stored as an SVG path string with dimensional metadata.
 * This format is what makes dotted trace, ghost guides, and stroke animation possible.
 */
export interface SVGPathFont {
  id: FontId;
  version: string;
  meta: HandwritingFontMeta;
  /** Map from character to glyph definition */
  glyphs: Record<string, SVGGlyph>;
  /** Glyph to use when a character has no defined glyph */
  fallbackGlyph?: SVGGlyph;
}

/**
 * A single pen stroke within a glyph, in the order a student should draw it.
 *
 * EDUCATIONAL RATIONALE: A letterform that merely *looks* like the target
 * letter teaches nothing if traced in the wrong order or direction — correct
 * stroke order and direction are part of what handwriting instruction is
 * actually for (motor pattern formation, not shape recognition). This is why
 * a glyph is a sequence of Strokes rather than a single opaque path: the
 * renderer can show stroke order numbering, animate strokes one at a time,
 * and place a start-point marker — all of which are core to the "educational
 * system, not merely font rendering" principle. A SVGGlyph with strokes.length
 * === 0 is treated as INCOMPLETE pedagogical data (see SVGGlyph.strokes).
 */
export interface GlyphStroke {
  /** SVG path data for this single stroke, in font units */
  path: string;
  /** 1-indexed position in the stroke sequence — what number to show a student */
  order: number;
  /**
   * Where the pen should start, in font units relative to the glyph origin.
   * Used to render a start-point dot, the single most effective visual aid
   * for correct stroke initiation in early handwriting instruction.
   */
  startPoint: { x: number; y: number };
  /**
   * The general direction of travel for this stroke, used to optionally
   * render a directional arrowhead partway along the path. Coarse-grained
   * by design — handwriting instruction cares about "down then right", not
   * precise bearing.
   */
  direction: 'down' | 'up' | 'left' | 'right' | 'down-right' | 'down-left' | 'curve-clockwise' | 'curve-counterclockwise';
}

export interface SVGGlyph {
  /**
   * Full combined SVG path data — used for rendering a static/ghost letter
   * where stroke order doesn't need to be shown (e.g. a faint background
   * guide letter, or a "model word" written once for the student to compare
   * against, not trace stroke-by-stroke). This is a DERIVED convenience
   * field; the authoritative pedagogical data is `strokes`.
   */
  path: string;
  /**
   * The ordered, directional decomposition of this glyph into individual pen
   * strokes. This is the data the handwriting renderer actually teaches
   * from: stroke order, start points, and direction all come from here.
   *
   * An empty array means this glyph has only the combined `path` available
   * (e.g. converted from a static font with no stroke metadata) and CANNOT
   * be used for full trace-with-stroke-order instruction. The renderer must
   * treat strokes.length === 0 as incomplete pedagogical data — it may still
   * render the combined path as a non-directional dotted trace or ghost
   * letter, but must not claim to show correct stroke order, and should
   * surface a warning so incomplete font data is visible during development
   * rather than silently shipped as if it were complete.
   */
  strokes: GlyphStroke[];
  /** Natural width of the glyph in font units */
  width: number;
  /** Natural height (ascender + descender) in font units */
  height: number;
  /** Distance from the top of the glyph to the baseline */
  baseline: number;
  /** Distance from the top of the glyph to the midline (x-height) */
  midline: number;
  /** Advance width (spacing to the next glyph) */
  advance: number;
}

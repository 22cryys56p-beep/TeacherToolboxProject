/**
 * @package @teacher-toolbox/types/font
 * @description Font data model — updated to TTHFS v1.0.0 specification.
 *
 * Fields added per TTHFS Appendix A (the complete conformance delta):
 *   SVGGlyph:           character, ascenderLine, descenderLine, penLifts, penLiftBeforeStrokeIndex
 *   GlyphStroke:        endPoint, relativeDuration, difficultyEmphasis, teachingNote
 *   SVGPathFont:        specVersion, validation (FontValidationReport stub)
 *   HandwritingFontMeta: unitsPerEm, methodName, sequencePosition, pedagogicalSource
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
  | 'uk-national-print'
  | 'uk-national-cursive'
  | 'custom';

export type SequencePosition = 'foundational' | 'transitional' | 'advanced';

export interface FontDefinition {
  id:            FontId;
  name:          string;
  familyName:    string;
  role:          FontRole;
  source:        FontSource;
  handwriting?:  HandwritingFontMeta;
  variants:      FontVariant[];
  previewText?:  string;
  license:       FontLicense;
}

export interface HandwritingFontMeta {
  script:           HandwritingScript;
  gradeRange:       [GradeLevel, GradeLevel];
  /**
   * Font coordinate scale — all glyph metrics and stroke paths are in these
   * units. The renderer MUST scale by (targetHeightUnits / unitsPerEm), NOT
   * by (targetHeightUnits / glyph.height). See TTHFS §4.1.
   */
  unitsPerEm:       number;
  lineHeightRatio:  number;
  descenderRatio:   number;
  guidelines:       GuidelineSpec;
  /** Human-readable method name for font-picker UI, e.g. "Zaner-Bloser" */
  methodName:       string;
  sequencePosition: SequencePosition;
  /** Citation for the pedagogical source — required for bundled fonts (S5) */
  pedagogicalSource?: string;
}

export interface GuidelineSpec {
  lineCount:     2 | 3 | 4;
  lineLabels:    string[];
  showMargin:    boolean;
  showDescender: boolean;
  /**
   * Row-height fractions, bottom=0 to top=1, same order as lineLabels.
   * The renderer reads this array; it never hardcodes proportions.
   */
  lineRatios:    number[];
}

export interface FontVariant {
  weight: FontWeight;
  style:  'normal' | 'italic';
  path:   string;
  format: 'woff2' | 'woff' | 'ttf' | 'svg-path-font';
}

export interface FontLicense {
  spdx:          string;
  attribution?:  string;
  commercialUse: boolean;
}

// ---------------------------------------------------------------------------
// SVG Path Font — TTHFS §1 complete
// ---------------------------------------------------------------------------

/** Minimal embedded validation report carried inside a distributed font file */
export interface EmbeddedValidationReport {
  specVersion:       string;
  generatedAt:       string;
  isLoadable:        boolean;
  completenessScore: number;
  hardFailureCount:  number;
  warningCount:      number;
}

export interface SVGPathFont {
  id:              FontId;
  /** TTHFS spec version this font conforms to, e.g. "1.0.0" */
  specVersion:     string;
  /** Font's own content version — independent of specVersion */
  version:         string;
  meta:            HandwritingFontMeta;
  glyphs:          Record<string, SVGGlyph>;
  fallbackGlyph?:  SVGGlyph;
  /**
   * Validation report embedded at build time. The platform re-verifies
   * this at load time — never trusted blindly. See TTHFS §1 and §7.4.
   */
  validation:      EmbeddedValidationReport;
  license:         FontLicense;
}

// ---------------------------------------------------------------------------
// GlyphStroke — TTHFS §3 complete
// ---------------------------------------------------------------------------

export type StrokeDirection =
  | 'down' | 'up' | 'left' | 'right'
  | 'down-right' | 'down-left' | 'up-right' | 'up-left'
  | 'curve-clockwise' | 'curve-counterclockwise';

export interface GlyphStroke {
  /** SVG path data for this stroke, in font units */
  path:              string;
  /** 1-indexed stroke sequence number shown to the student */
  order:             number;
  /** Where the pen touches down to begin this stroke, in font units */
  startPoint:        { x: number; y: number };
  /** Where the pen lifts at the end of this stroke, in font units */
  endPoint:          { x: number; y: number };
  direction:         StrokeDirection;
  /**
   * Fraction of this glyph's total stroke-path length (0–1, all strokes
   * in a glyph sum to 1.0). Drives proportional stroke animation timing.
   */
  relativeDuration:  number;
  /** Stroke that is typically hardest for early writers — highlighted in animation */
  difficultyEmphasis?: boolean;
  /** Plain-language description for a teacher helping a child. Not shown to students. */
  teachingNote?:     string;
}

// ---------------------------------------------------------------------------
// SVGGlyph — TTHFS §2 complete
// ---------------------------------------------------------------------------

export type PenLiftPolicy = 'none' | 'between-all-strokes' | 'custom';

export interface SVGGlyph {
  /**
   * The Unicode character this glyph represents. Explicit on the object
   * (not only the Record key) for self-contained validation.
   */
  character:     string;
  /**
   * Combined path across all strokes. DERIVED by the build tool —
   * never independently authored. Used only for ghost/static contexts
   * where stroke sequence need not be shown. See TTHFS §2.1.
   */
  path:          string;
  /**
   * The educational payload — ordered, directional pen strokes.
   * Empty array = incomplete pedagogical data; renderer must warn.
   * See TTHFS §2 and the Project Bible principle "educational correctness
   * over visual appearance."
   */
  strokes:       GlyphStroke[];

  // ---- Dimensional metadata — all in font units, y increases downward ----

  width:         number;   // advance-bounding width
  height:        number;   // full vertical extent including descender
  baseline:      number;   // distance from bounding-box top to baseline
  midline:       number;   // distance from bounding-box top to x-height line
  /**
   * Distance from bounding-box top to the ascender line.
   * For glyphs that never exceed midline: ascenderLine === midline.
   */
  ascenderLine:  number;
  /**
   * Distance from bounding-box top to the descender line.
   * For glyphs with no descender: descenderLine === baseline.
   */
  descenderLine: number;
  advance:       number;   // horizontal advance to next glyph origin

  penLifts:      PenLiftPolicy;
  /** 0-based stroke indices preceded by a pen lift — only when penLifts === 'custom' */
  penLiftBeforeStrokeIndex?: number[];
}

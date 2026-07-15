/**
 * @module tthfs-types
 * @description TTHFS v1.0.0 complete type definitions.
 *
 * These types represent the full specification as ratified. The current
 * @teacher-toolbox/types/font package contains an older subset of these
 * definitions. The toolkit uses these definitions directly; the platform
 * types package will be updated to match before v0.3 font loading is
 * implemented.
 *
 * IMPORTANT: Do not add fields here without a corresponding update to
 * HANDWRITING_FONT_SPECIFICATION.md. This file IS the executable form of
 * that specification — the two must stay in sync.
 */

// ---------------------------------------------------------------------------
// Script and classification
// ---------------------------------------------------------------------------

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

/** Where this script sits in a method's standard teaching progression */
export type SequencePosition = 'foundational' | 'transitional' | 'advanced';

export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

// ---------------------------------------------------------------------------
// Stroke direction — coarse-grained by design (see TTHFS §3.3)
// ---------------------------------------------------------------------------

export type StrokeDirection =
  | 'down' | 'up' | 'left' | 'right'
  | 'down-right' | 'down-left' | 'up-right' | 'up-left'
  | 'curve-clockwise' | 'curve-counterclockwise';

// ---------------------------------------------------------------------------
// GlyphStroke — TTHFS §3 complete definition
// ---------------------------------------------------------------------------

export interface GlyphStroke {
  /** SVG path data for this single stroke, in font units */
  path: string;
  /** 1-indexed stroke sequence position — the number shown to a student */
  order: number;
  /** Where the pen touches down to begin this stroke, in font units */
  startPoint: { x: number; y: number };
  /** Where the pen lifts at the end of this stroke, in font units */
  endPoint: { x: number; y: number };
  /** Coarse direction of travel — see TTHFS §3.3 */
  direction: StrokeDirection;
  /**
   * Fraction of this glyph's total stroke-path length occupied by this
   * stroke (0–1, all strokes in a glyph sum to 1.0). Used to pace
   * stroke animation proportionally — see TTHFS §3.2.
   */
  relativeDuration: number;
  /**
   * True for strokes that are typically hardest for early writers —
   * used to optionally slow down or highlight that stroke in animation.
   */
  difficultyEmphasis?: boolean;
  /**
   * Plain-language description of this stroke's motion, written for an
   * adult (teacher/parent) assisting a child. Not shown to the student.
   * e.g. "Start at the midline, pull straight down to the baseline."
   * Strongly recommended; affects completeness score (S4).
   */
  teachingNote?: string;
}

// ---------------------------------------------------------------------------
// SVGGlyph — TTHFS §2 complete definition
// ---------------------------------------------------------------------------

export type PenLiftPolicy = 'none' | 'between-all-strokes' | 'custom';

export interface SVGGlyph {
  /**
   * The Unicode character this glyph represents.
   * Explicit on the glyph itself (not only the Record key) for
   * self-contained validation — see TTHFS Appendix A.
   */
  character: string;

  /**
   * Combined path across all strokes. DERIVED — never authored directly.
   * The toolkit builder computes this by concatenating strokes[].path
   * in order. The renderer uses it only for ghost/static contexts where
   * stroke sequence need not be shown. See TTHFS §2.1.
   */
  path: string;

  /**
   * The educational payload. Ordered, directional pen strokes.
   * MUST NOT be empty for a glyph to pass R2. See TTHFS §2.
   */
  strokes: GlyphStroke[];

  // ---- Dimensional metadata in font units (see TTHFS §4.1) ----

  width:         number;  // advance-bounding width
  height:        number;  // full vertical extent including descender
  baseline:      number;  // distance from bounding-box top to baseline
  midline:       number;  // distance from bounding-box top to x-height line
  ascenderLine:  number;  // distance from bounding-box top to ascender line
  descenderLine: number;  // distance from bounding-box top to descender line
  advance:       number;  // horizontal advance to next glyph origin

  // ---- Pedagogical classification ----

  /** Pen-lift policy between strokes — see TTHFS §2 */
  penLifts: PenLiftPolicy;
  /**
   * When penLifts === 'custom': 0-based indices of strokes that are
   * PRECEDED by a pen lift (i.e. strokes[i] where a lift occurs before
   * beginning stroke i). Required only when penLifts === 'custom'.
   */
  penLiftBeforeStrokeIndex?: number[];
}

// ---------------------------------------------------------------------------
// GuidelineSpec — TTHFS §4.4
// ---------------------------------------------------------------------------

export interface GuidelineSpec {
  lineCount:     2 | 3 | 4;
  lineLabels:    string[];   // bottom-to-top, must match lineRatios length
  lineRatios:    number[];   // bottom=0, top=1 fractions of row height
  showMargin:    boolean;
  showDescender: boolean;
}

// ---------------------------------------------------------------------------
// HandwritingFontMeta — TTHFS §5 complete definition
// ---------------------------------------------------------------------------

export interface HandwritingFontMeta {
  script:           HandwritingScript;
  gradeRange:       [GradeLevel, GradeLevel];
  /** Font coordinate scale — see TTHFS §4.1 */
  unitsPerEm:       number;
  /** Ascender/x-height ratio summary — for quick layout estimates */
  lineHeightRatio:  number;
  descenderRatio:   number;
  guidelines:       GuidelineSpec;
  /** Human-readable method name for font-picker UI */
  methodName:       string;
  sequencePosition: SequencePosition;
  /**
   * Citation for the pedagogical source of this script's stroke order
   * and proportions. Required for bundled fonts (S5).
   */
  pedagogicalSource?: string;
}

// ---------------------------------------------------------------------------
// FontLicense
// ---------------------------------------------------------------------------

/** SPDX identifiers accepted by TTHFS §9.1 */
export type AcceptedSpdxLicense =
  | 'OFL-1.1'
  | 'Apache-2.0'
  | 'MIT'
  | 'CC0-1.0'
  | 'CC-BY-4.0'
  | 'Custom-Original';

export interface FontLicense {
  /** Must be one of AcceptedSpdxLicense values to pass R6 */
  spdx:          string;
  attribution?:  string;
  commercialUse: boolean;
}

// ---------------------------------------------------------------------------
// Validation types — TTHFS §7.4
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'hard' | 'soft';
export type ValidationRuleId =
  // Hard rules
  | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8'
  // Soft rules
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5'
  // Cross-glyph checks
  | 'C1' | 'C2' | 'C3';

export interface ValidationFinding {
  rule:             ValidationRuleId;
  severity:         ValidationSeverity;
  /** Which character this finding concerns ('*' = font-wide) */
  glyphCharacter:   string;
  /** Short machine-readable code for tooling, e.g. 'EMPTY_STROKES' */
  code:             string;
  /** Full human-readable message, written for a developer authoring a font */
  message:          string;
  /** Optional: what to do to fix it */
  remediation?:     string;
}

export interface CharacterCoverage {
  required: string[];
  present:  string[];
  missing:  string[];
}

export interface FontValidationReport {
  specVersion:        string;
  generatedAt:        string;  // ISODateTime
  isLoadable:         boolean;
  hardFailures:       ValidationFinding[];
  warnings:           ValidationFinding[];
  /** 0–100 educational completeness score */
  completenessScore:  number;
  characterCoverage:  CharacterCoverage;
}

// ---------------------------------------------------------------------------
// SVGPathFont — TTHFS §1 complete definition
// ---------------------------------------------------------------------------

export interface SVGPathFont {
  id:             string;
  /** TTHFS specification version this font conforms to */
  specVersion:    string;
  /** Font's own content version — independent of specVersion */
  version:        string;
  meta:           HandwritingFontMeta;
  glyphs:         Record<string, SVGGlyph>;
  fallbackGlyph?: SVGGlyph;
  /**
   * Self-reported validation report, computed at build time.
   * The platform re-verifies this at load time — it is never trusted
   * blindly. Its presence is required; its content is cross-checked.
   */
  validation:     FontValidationReport;
  license:        FontLicense;
}

// ---------------------------------------------------------------------------
// Font project format (working directory, not the distributable)
// ---------------------------------------------------------------------------

/**
 * The font project manifest — lives at the root of a font project directory
 * as `font-project.json`. This is the developer's working view: it includes
 * authoring metadata and build configuration not present in the final
 * distributable `SVGPathFont`.
 */
export interface FontProjectManifest {
  /** Must match the output font's id */
  id:             string;
  displayName:    string;
  version:        string;
  specVersion:    string;
  meta:           HandwritingFontMeta;
  license:        FontLicense;
  /** Build configuration */
  build: {
    /** Output directory for the packaged font */
    outDir: string;
    /** Whether to compute and embed the validation report on build */
    embedValidation: boolean;
    /** Whether to fail the build on any hard validation failure */
    failOnHardFailure: boolean;
    /** Whether to fail the build on soft warnings (stricter mode) */
    failOnWarnings: boolean;
  };
  /** Human-readable notes for future maintainers of this font project */
  authoringNotes?: string;
}

// ---------------------------------------------------------------------------
// Toolkit-internal types for import pipeline
// ---------------------------------------------------------------------------

/**
 * The raw format a developer uses to author individual glyphs before
 * building the final font. Strokes are authored without the derived
 * `path` field (the builder computes it) and without the `character`
 * field at the top level (it's the object key, promoted by the builder).
 */
export type GlyphAuthoringRecord = Omit<SVGGlyph, 'path' | 'character'> & {
  /** The builder derives path from strokes; do not author it manually */
  path?: never;
};

/**
 * A font project fully loaded into memory from a project directory.
 * This type lives in types/ (not project/) so the pure builder module
 * can accept it without pulling in Node.js filesystem dependencies.
 */
export interface LoadedFontProject {
  manifest:   FontProjectManifest;
  glyphs:     Record<string, GlyphAuthoringRecord>;
  fallback?:  GlyphAuthoringRecord;
  projectDir: string;
}

/**
 * Directory structure of a font project:
 *
 *   my-font-project/
 *     font-project.json       ← FontProjectManifest
 *     glyphs/
 *       lowercase/
 *         a.json              ← GlyphAuthoringRecord
 *         b.json
 *         ...
 *       uppercase/
 *         A.json
 *         ...
 *       numerals/
 *         0.json
 *         ...
 *       punctuation/          ← optional (S1 coverage)
 *         period.json
 *         ...
 *     fallback.json           ← GlyphAuthoringRecord (optional)
 */
export const FONT_PROJECT_STRUCTURE = {
  MANIFEST:           'font-project.json',
  GLYPHS_DIR:         'glyphs',
  LOWERCASE_DIR:      'glyphs/lowercase',
  UPPERCASE_DIR:      'glyphs/uppercase',
  NUMERALS_DIR:       'glyphs/numerals',
  PUNCTUATION_DIR:    'glyphs/punctuation',
  FALLBACK_FILE:      'fallback.json',
} as const;

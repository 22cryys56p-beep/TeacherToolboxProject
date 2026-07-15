/**
 * @module builder
 * @description Converts a loaded font project into a distributable SVGPathFont.
 *
 * The builder is responsible for:
 *   1. Promoting GlyphAuthoringRecord → SVGGlyph (adding character field,
 *      deriving the combined path from strokes per TTHFS §2.1)
 *   2. Normalising relativeDuration so all strokes in each glyph sum to 1.0
 *   3. Running the full TTHFS validator on the assembled font
 *   4. Embedding the FontValidationReport in the output
 *   5. Returning the complete SVGPathFont ready for serialisation
 *
 * The builder is a pure function — no file I/O. The CLI layer handles
 * reading the project and writing the output file.
 */

import type {
  SVGPathFont,
  SVGGlyph,
  GlyphAuthoringRecord,
  FontProjectManifest,
  GlyphStroke,
  LoadedFontProject,
} from '../types/index.js';
import { validateFont } from '../validator/index.js';

export interface BuildResult {
  font:     SVGPathFont;
  success:  boolean;
  /** True when failOnHardFailure is set and hard failures were found */
  blocked:  boolean;
  summary:  BuildSummary;
}

export interface BuildSummary {
  glyphCount:         number;
  hardFailureCount:   number;
  warningCount:       number;
  completenessScore:  number;
  missingRequired:    string[];
}

// ---------------------------------------------------------------------------
// Build entry point
// ---------------------------------------------------------------------------

export function buildFont(project: LoadedFontProject): BuildResult {
  const { manifest, glyphs, fallback } = project;

  // Step 1: Promote authoring records → full SVGGlyphs
  const assembledGlyphs: Record<string, SVGGlyph> = {};
  for (const [char, record] of Object.entries(glyphs)) {
    assembledGlyphs[char] = promoteGlyph(char, record);
  }

  // Step 2: Assemble the font object (without validation report yet)
  const fontWithoutReport: Omit<SVGPathFont, 'validation'> = {
    id:           manifest.id,
    specVersion:  manifest.specVersion,
    version:      manifest.version,
    meta:         manifest.meta,
    license:      manifest.license,
    glyphs:       assembledGlyphs,
    fallbackGlyph: fallback ? promoteGlyph('fallback', fallback) : undefined,
  };

  // Step 3: Validate
  const report = validateFont(fontWithoutReport as SVGPathFont);

  // Step 4: Embed the validation report
  const font: SVGPathFont = { ...fontWithoutReport as SVGPathFont, validation: report };

  const blocked =
    manifest.build.failOnHardFailure && report.hardFailures.length > 0 ||
    manifest.build.failOnWarnings && report.warnings.length > 0;

  const summary: BuildSummary = {
    glyphCount:        Object.keys(assembledGlyphs).length,
    hardFailureCount:  report.hardFailures.length,
    warningCount:      report.warnings.length,
    completenessScore: report.completenessScore,
    missingRequired:   report.characterCoverage.missing,
  };

  return { font, success: report.isLoadable && !blocked, blocked, summary };
}

// ---------------------------------------------------------------------------
// Glyph promotion: GlyphAuthoringRecord → SVGGlyph
// ---------------------------------------------------------------------------

function promoteGlyph(char: string, record: GlyphAuthoringRecord): SVGGlyph {
  const normalisedStrokes = normaliseRelativeDurations(record.strokes ?? []);
  const derivedPath = derivePathFromStrokes(normalisedStrokes);

  return {
    character:    char,
    path:         derivedPath,
    strokes:      normalisedStrokes,
    width:        record.width,
    height:       record.height,
    baseline:     record.baseline,
    midline:      record.midline,
    ascenderLine: record.ascenderLine,
    descenderLine:record.descenderLine,
    advance:      record.advance,
    penLifts:     record.penLifts ?? 'between-all-strokes',
    penLiftBeforeStrokeIndex: record.penLiftBeforeStrokeIndex,
  };
}

/**
 * Derive the combined path by concatenating stroke paths in order.
 * This is the canonical implementation of TTHFS §2.1 —
 * the combined path is always derived, never independently authored.
 */
function derivePathFromStrokes(strokes: GlyphStroke[]): string {
  if (strokes.length === 0) return '';
  return strokes
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(s => s.path.trim())
    .join(' ');
}

/**
 * Normalise relativeDuration values so all strokes in a glyph sum to 1.0.
 * If all strokes have relativeDuration 0 or the field is absent, distribute
 * evenly (each stroke = 1/n). This ensures the animation contract is always
 * satisfiable without requiring font authors to do the arithmetic manually.
 */
function normaliseRelativeDurations(strokes: GlyphStroke[]): GlyphStroke[] {
  if (strokes.length === 0) return strokes;

  const total = strokes.reduce((sum, s) => sum + (s.relativeDuration ?? 0), 0);

  if (total <= 0) {
    // Even distribution
    const even = 1 / strokes.length;
    return strokes.map(s => ({ ...s, relativeDuration: even }));
  }

  // Normalise so they sum to exactly 1.0
  return strokes.map(s => ({
    ...s,
    relativeDuration: (s.relativeDuration ?? 0) / total,
  }));
}

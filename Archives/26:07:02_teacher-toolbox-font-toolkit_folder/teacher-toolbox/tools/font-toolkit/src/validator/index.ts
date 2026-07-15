/**
 * @module validator
 * @description TTHFS v1.0.0 validation engine.
 *
 * Implements all validation rules defined in HANDWRITING_FONT_SPECIFICATION.md:
 *   R1–R8  Hard requirements (font rejected if any fail)
 *   S1–S5  Soft requirements (font loads but is flagged incomplete)
 *   C1–C3  Cross-glyph consistency checks
 *
 * Every rule is a pure function — no I/O, no side effects, no state.
 * The top-level validateFont() function composes them all and produces
 * a FontValidationReport conforming to TTHFS §7.4.
 *
 * ARCHITECTURAL NOTE: Rule implementations should never make educational
 * judgment calls beyond what the specification defines. If a rule is
 * ambiguous, add a clarification to the spec first, then implement it.
 */

import type {
  SVGPathFont,
  SVGGlyph,
  ValidationFinding,
  FontValidationReport,
  CharacterCoverage,
} from '../types/index.js';
import { msg, computeCompletenessScore } from '../messages/index.js';
import { validateSvgPath } from './svgPathValidator.js';

// ---------------------------------------------------------------------------
// Character set definitions (TTHFS §7.5)
// ---------------------------------------------------------------------------

const LOWERCASE  = 'abcdefghijklmnopqrstuvwxyz'.split('');
const UPPERCASE  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMERALS   = '0123456789'.split('');

/** The 62-character baseline required set every font must have */
export const REQUIRED_CHARACTER_SET: string[] = [...LOWERCASE, ...UPPERCASE, ...NUMERALS];

/** Extended characters that contribute to S1 completeness scoring */
export const EXTENDED_CHARACTER_SET: string[] = [
  '.', ',', '!', '?', '\'', '"', '-', '(', ')',
];

/** Accepted SPDX identifiers (TTHFS §9.1) */
const ACCEPTED_SPDX_LICENSES = new Set([
  'OFL-1.1', 'Apache-2.0', 'MIT', 'CC0-1.0', 'CC-BY-4.0', 'Custom-Original',
]);

/**
 * Typical maximum stroke counts by character class.
 * Used for S2 plausibility checks. These are soft bounds —
 * legitimate stylistic variation can exceed them (but triggers review).
 */
const TYPICAL_MAX_STROKES: Record<string, number> = {
  lowercase: 4,
  uppercase: 5,
  numeral:   3,
  other:     4,
};

function characterClass(char: string): keyof typeof TYPICAL_MAX_STROKES {
  if (LOWERCASE.includes(char))  return 'lowercase';
  if (UPPERCASE.includes(char))  return 'uppercase';
  if (NUMERALS.includes(char))   return 'numeral';
  return 'other';
}

// ---------------------------------------------------------------------------
// C1 constants (TTHFS §4.4)
// ---------------------------------------------------------------------------
const C1_SOFT_THRESHOLD = 0.02;
const C1_HARD_THRESHOLD = 0.08;

// C3 — advance width outlier threshold (TTHFS §7.3, C3)
const C3_OUTLIER_RATIO = 3.0;

// ---------------------------------------------------------------------------
// Hard rules (R1–R8)
// ---------------------------------------------------------------------------

function checkR1(font: SVGPathFont): ValidationFinding[] {
  const missing = REQUIRED_CHARACTER_SET.filter(c => !(c in font.glyphs));
  return missing.length > 0 ? [msg.R1_MISSING_CHARACTERS(missing)] : [];
}

function checkR2(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const [char, glyph] of Object.entries(font.glyphs)) {
    if (!glyph.strokes || glyph.strokes.length === 0) {
      findings.push(msg.R2_EMPTY_STROKES(char));
    }
  }
  return findings;
}

function checkR3(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const [char, glyph] of Object.entries(font.glyphs)) {
    const { ascenderLine, midline, baseline, descenderLine, height } = glyph;
    const issues: string[] = [];
    if (ascenderLine < 0)                issues.push(`ascenderLine (${ascenderLine}) < 0`);
    if (ascenderLine > midline)          issues.push(`ascenderLine (${ascenderLine}) > midline (${midline})`);
    if (midline > baseline)              issues.push(`midline (${midline}) > baseline (${baseline})`);
    if (baseline > descenderLine)        issues.push(`baseline (${baseline}) > descenderLine (${descenderLine})`);
    if (descenderLine > height)          issues.push(`descenderLine (${descenderLine}) > height (${height})`);
    if (issues.length > 0) {
      findings.push(msg.R3_INCOHERENT_GEOMETRY(char, issues.join('; ')));
    }
  }
  return findings;
}

function checkR4(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const [char, glyph] of Object.entries(font.glyphs)) {
    if (!glyph.strokes || glyph.strokes.length === 0) continue; // R2 covers this
    const n = glyph.strokes.length;
    const found = glyph.strokes.map(s => s.order).sort((a, b) => a - b);
    const expected = Array.from({ length: n }, (_, i) => i + 1);
    const isValid = found.every((v, i) => v === expected[i]);
    if (!isValid) {
      findings.push(msg.R4_INVALID_STROKE_ORDER(char, found, expected));
    }
  }
  return findings;
}

function checkR5(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const [char, glyph] of Object.entries(font.glyphs)) {
    // Check combined path (if present)
    if (glyph.path) {
      const result = validateSvgPath(glyph.path);
      if (!result.valid) {
        findings.push(msg.R5_MALFORMED_PATH(char, 'glyph'));
      }
    }
    // Check each stroke path
    if (glyph.strokes) {
      for (const stroke of glyph.strokes) {
        const result = validateSvgPath(stroke.path);
        if (!result.valid) {
          findings.push(msg.R5_MALFORMED_PATH(char, 'stroke', stroke.order));
        }
      }
    }
  }
  return findings;
}

function checkR6(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const license = font.license;

  if (!license) {
    findings.push(msg.R6_MISSING_LICENSE());
    return findings;
  }

  if (!license.commercialUse) {
    findings.push(msg.R6_NON_COMMERCIAL_LICENSE(license.spdx ?? 'unknown'));
    return findings;
  }

  if (!ACCEPTED_SPDX_LICENSES.has(license.spdx)) {
    findings.push(msg.R6_PROHIBITED_LICENSE(license.spdx ?? 'unknown'));
    return findings;
  }

  // Attribution-requiring licenses need an attribution field
  const needsAttribution = ['CC-BY-4.0', 'OFL-1.1', 'Apache-2.0'].includes(license.spdx);
  if (needsAttribution && !license.attribution) {
    findings.push(msg.R6_UNVERIFIABLE_PROVENANCE());
  }

  return findings;
}

function checkR7(font: SVGPathFont): ValidationFinding[] {
  const g = font.meta.guidelines;
  if (!g) return [];
  if (g.lineRatios.length !== g.lineLabels.length) {
    return [msg.R7_RATIO_LABEL_MISMATCH(g.lineRatios.length, g.lineLabels.length)];
  }
  return [];
}

function checkR8(font: SVGPathFont): ValidationFinding[] {
  const u = font.meta.unitsPerEm;
  if (typeof u !== 'number' || !isFinite(u) || u <= 0) {
    return [msg.R8_INVALID_UNITS_PER_EM(u)];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Soft rules (S1–S5)
// ---------------------------------------------------------------------------

function checkS1(font: SVGPathFont): ValidationFinding[] {
  const missing = EXTENDED_CHARACTER_SET.filter(c => !(c in font.glyphs));
  return missing.length > 0 ? [msg.S1_MISSING_EXTENDED_CHARACTERS(missing)] : [];
}

function checkS2(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const [char, glyph] of Object.entries(font.glyphs)) {
    if (!glyph.strokes) continue;
    const cls = characterClass(char);
    const max = TYPICAL_MAX_STROKES[cls] ?? 4;
    if (glyph.strokes.length > max) {
      findings.push(msg.S2_UNUSUAL_STROKE_COUNT(char, glyph.strokes.length, max));
    }
  }
  return findings;
}

function checkS3(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const CONTINUITY_TOLERANCE = font.meta.unitsPerEm * 0.05; // 5% of unitsPerEm

  for (const [char, glyph] of Object.entries(font.glyphs)) {
    if (!glyph.strokes || glyph.strokes.length < 2) continue;

    const sorted = [...glyph.strokes].sort((a, b) => a.order - b.order);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (!current || !next) continue;

      // Is a pen lift declared between these strokes?
      const liftDeclared =
        glyph.penLifts === 'between-all-strokes' ||
        (glyph.penLifts === 'custom' &&
          (glyph.penLiftBeforeStrokeIndex ?? []).includes(next.order - 1));

      if (liftDeclared) continue;

      // No lift declared — check continuity
      const dx = next.startPoint.x - current.endPoint.x;
      const dy = next.startPoint.y - current.endPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > CONTINUITY_TOLERANCE) {
        findings.push(msg.S3_DISCONTINUOUS_STROKES(char, current.order, next.order, distance));
      }
    }
  }
  return findings;
}

function checkS4(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const [char, glyph] of Object.entries(font.glyphs)) {
    if (!glyph.strokes) continue;
    const emphasisWithoutNote = glyph.strokes
      .filter(s => s.difficultyEmphasis && !s.teachingNote)
      .map(s => s.order);
    if (emphasisWithoutNote.length > 0) {
      findings.push(msg.S4_MISSING_TEACHING_NOTES(char, emphasisWithoutNote));
    }
  }
  return findings;
}

function checkS5(font: SVGPathFont): ValidationFinding[] {
  if (!font.meta.pedagogicalSource) {
    return [msg.S5_MISSING_PEDAGOGICAL_SOURCE()];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Cross-glyph consistency (C1–C3)
// ---------------------------------------------------------------------------

function checkC1(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const { unitsPerEm, guidelines } = font.meta;
  if (!unitsPerEm || unitsPerEm <= 0) return []; // R8 will catch this

  // Build a map from label → declared ratio
  const ratioByLabel = new Map<string, number>();
  guidelines.lineLabels.forEach((label, i) => {
    const ratio = guidelines.lineRatios[i];
    if (ratio !== undefined) ratioByLabel.set(label.toLowerCase(), ratio);
  });

  const metricsToCheck: Array<{ metricName: string; label: string; getValue: (g: SVGGlyph) => number }> = [
    { metricName: 'baseline',     label: 'baseline',  getValue: g => g.baseline },
    { metricName: 'midline',      label: 'midline',   getValue: g => g.midline },
    { metricName: 'ascenderLine', label: 'ascender',  getValue: g => g.ascenderLine },
    { metricName: 'ascenderLine', label: 'topline',   getValue: g => g.ascenderLine },
    { metricName: 'descenderLine',label: 'descender', getValue: g => g.descenderLine },
  ];

  for (const [char, glyph] of Object.entries(font.glyphs)) {
    for (const check of metricsToCheck) {
      const declaredRatio = ratioByLabel.get(check.label);
      if (declaredRatio === undefined) continue; // this label isn't in this font's guidelines

      const metricValue = check.getValue(glyph);
      const actualRatio = 1 - metricValue / unitsPerEm;
      const diff = Math.abs(actualRatio - declaredRatio);

      if (diff > C1_HARD_THRESHOLD) {
        findings.push(msg.C1_RULING_INCONSISTENCY(
          char, check.metricName, metricValue, declaredRatio, actualRatio, unitsPerEm, true,
        ));
      } else if (diff > C1_SOFT_THRESHOLD) {
        findings.push(msg.C1_RULING_INCONSISTENCY(
          char, check.metricName, metricValue, declaredRatio, actualRatio, unitsPerEm, false,
        ));
      }
    }
  }
  return findings;
}

function checkC2(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const [char, glyph] of Object.entries(font.glyphs)) {
    if (!glyph.strokes || glyph.strokes.length === 0) continue;
    if (!glyph.path) continue; // no stored path to verify against

    const derived = glyph.strokes
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(s => s.path)
      .join(' ');

    // Normalise whitespace for comparison
    const normalise = (p: string) => p.trim().replace(/\s+/g, ' ');
    if (normalise(derived) !== normalise(glyph.path)) {
      findings.push(msg.C2_PATH_STROKE_MISMATCH(char));
    }
  }
  return findings;
}

function checkC3(font: SVGPathFont): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const advances = Object.values(font.glyphs).map(g => g.advance).filter(a => a > 0);
  if (advances.length === 0) return [];

  const sorted = [...advances].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 1;

  for (const [char, glyph] of Object.entries(font.glyphs)) {
    const ratio = glyph.advance / median;
    if (ratio > C3_OUTLIER_RATIO || (ratio < 1 / C3_OUTLIER_RATIO && glyph.advance > 0)) {
      findings.push(msg.C3_ADVANCE_WIDTH_OUTLIER(char, glyph.advance, median, ratio));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Character coverage
// ---------------------------------------------------------------------------

function buildCharacterCoverage(font: SVGPathFont): CharacterCoverage {
  const present = REQUIRED_CHARACTER_SET.filter(c => c in font.glyphs);
  const missing = REQUIRED_CHARACTER_SET.filter(c => !(c in font.glyphs));
  return { required: REQUIRED_CHARACTER_SET, present, missing };
}

// ---------------------------------------------------------------------------
// Top-level validator
// ---------------------------------------------------------------------------

/**
 * Validate a font against all TTHFS v1.0.0 rules and produce a
 * FontValidationReport. This is the single function the build pipeline,
 * CLI, and FontManager all call — the rules run here, nowhere else.
 *
 * The function is deliberately synchronous and pure — it takes a font
 * object and returns a report, with no file I/O or external dependencies.
 * File loading is the caller's responsibility.
 */
export function validateFont(font: SVGPathFont): FontValidationReport {
  const allFindings: ValidationFinding[] = [
    // Hard rules — run all even if earlier ones fail,
    // so the developer gets the complete picture in one pass
    ...checkR1(font),
    ...checkR2(font),
    ...checkR3(font),
    ...checkR4(font),
    ...checkR5(font),
    ...checkR6(font),
    ...checkR7(font),
    ...checkR8(font),
    // Soft rules
    ...checkS1(font),
    ...checkS2(font),
    ...checkS3(font),
    ...checkS4(font),
    ...checkS5(font),
    // Cross-glyph consistency — only run if hard rules pass
    // (no point running C1 when R8 failed: unitsPerEm is invalid)
  ];

  const hardFailures = allFindings.filter(f => f.severity === 'hard');
  const isLoadable   = hardFailures.length === 0;

  // Only run cross-glyph checks when the font is structurally sound
  const consistencyFindings = isLoadable
    ? [...checkC1(font), ...checkC2(font), ...checkC3(font)]
    : [];

  const allFindingsWithConsistency = [...allFindings, ...consistencyFindings];
  const warnings = allFindingsWithConsistency.filter(f => f.severity === 'soft');

  return {
    specVersion:       '1.0.0',
    generatedAt:       new Date().toISOString(),
    isLoadable,
    hardFailures,
    warnings,
    completenessScore: computeCompletenessScore(allFindingsWithConsistency),
    characterCoverage: buildCharacterCoverage(font),
  };
}

/**
 * Re-verify a font's embedded validation report against a fresh run of
 * validateFont(). Called by FontManager at load time — it never trusts
 * the embedded report blindly (TTHFS §1).
 *
 * Returns true if the font is safe to load, false otherwise.
 * Logs discrepancies so they are visible even when the font loads.
 */
export function verifyEmbeddedReport(font: SVGPathFont): boolean {
  const fresh = validateFont(font);

  if (!fresh.isLoadable) return false;

  // Cross-check the embedded completeness score as a sanity signal
  if (font.validation && Math.abs(font.validation.completenessScore - fresh.completenessScore) > 5) {
    console.warn(
      `[FontValidator] Completeness score mismatch for font "${font.id}": ` +
      `embedded=${font.validation.completenessScore}, verified=${fresh.completenessScore}. ` +
      `Re-run the font build tool to refresh the embedded report.`,
    );
  }

  return true;
}

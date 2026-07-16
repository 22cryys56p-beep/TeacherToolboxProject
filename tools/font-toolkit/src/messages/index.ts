/**
 * @module messages
 * @description All user-facing validation messages in one place.
 *
 * Every message is written for a developer authoring a handwriting font,
 * not for a teacher or student. The tone is specific, actionable, and
 * grounded in the educational rationale — not generic compiler-style errors.
 *
 * Adding a new validation rule requires adding its messages here first,
 * then implementing the rule in the validator. This keeps all user-facing
 * language centralised and reviewable in one file.
 */

import type { ValidationRuleId, ValidationFinding, ValidationSeverity } from '../types/index.js';

export interface MessageArgs {
  character?: string;
  count?: number;
  expected?: string | number;
  actual?: string | number;
  detail?: string;
  lineLabel?: string;
  strokeIndex?: number;
}

function finding(
  rule: ValidationRuleId,
  severity: ValidationSeverity,
  character: string,
  code: string,
  message: string,
  remediation?: string,
): ValidationFinding {
  return { rule, severity, glyphCharacter: character, code, message, remediation };
}

// ---------------------------------------------------------------------------
// R1 — Required character coverage
// ---------------------------------------------------------------------------

export const msg = {

  R1_MISSING_CHARACTERS: (missing: string[]): ValidationFinding =>
    finding('R1', 'hard', '*',
      'MISSING_REQUIRED_CHARACTERS',
      `Font is missing ${missing.length} required character${missing.length === 1 ? '' : 's'}: ${missing.map(c => `'${c}'`).join(', ')}. ` +
      `TTHFS requires all 62 baseline characters (a–z, A–Z, 0–9) before a font is loadable by the renderer.`,
      `Author the missing glyphs in the appropriate glyphs/ subdirectory. Each glyph file must include at least one stroke with a valid SVG path, startPoint, endPoint, order, direction, and relativeDuration.`,
    ),

  // ---------------------------------------------------------------------------
  // R2 — Non-empty strokes
  // ---------------------------------------------------------------------------

  R2_EMPTY_STROKES: (character: string): ValidationFinding =>
    finding('R2', 'hard', character,
      'EMPTY_STROKES',
      `Glyph '${character}' has zero strokes. A glyph with no stroke data cannot teach handwriting — ` +
      `it can only display a static shape, which is not the same thing. ` +
      `The combined path field alone is insufficient for trace, stroke-order, or animation features.`,
      `Decompose the glyph into its individual pen strokes. Each stroke needs: path (SVG path data), ` +
      `order (1-indexed), startPoint, endPoint, direction, and relativeDuration. ` +
      `The combined path will be derived automatically by the build tool — do not author it manually.`,
    ),

  // ---------------------------------------------------------------------------
  // R3 — Geometric coherence
  // ---------------------------------------------------------------------------

  R3_INCOHERENT_GEOMETRY: (character: string, detail: string): ValidationFinding =>
    finding('R3', 'hard', character,
      'INCOHERENT_GEOMETRY',
      `Glyph '${character}' has invalid dimensional relationships: ${detail}. ` +
      `TTHFS §4.3 requires: 0 ≤ ascenderLine ≤ midline ≤ baseline ≤ descenderLine ≤ height (all in font units, y increases downward). ` +
      `This is not a stylistic choice — an inverted relationship is geometrically incoherent and will cause misalignment on the ruling lines.`,
      `Review the glyph's dimensional metadata. Remember that in font-unit space, y increases downward — ` +
      `so ascenderLine (the topmost line) has a SMALLER value than baseline (further down the page). ` +
      `Use the target font's GuidelineSpec.lineRatios to compute expected metric values: metric = (1 - lineRatio) × unitsPerEm.`,
    ),

  // ---------------------------------------------------------------------------
  // R4 — Stroke order permutation
  // ---------------------------------------------------------------------------

  R4_INVALID_STROKE_ORDER: (character: string, found: number[], expected: number[]): ValidationFinding =>
    finding('R4', 'hard', character,
      'INVALID_STROKE_ORDER',
      `Glyph '${character}' has invalid stroke order values: [${found.join(', ')}]. ` +
      `Expected a contiguous sequence from 1 to ${expected.length}: [${expected.join(', ')}]. ` +
      `Stroke order must be a complete, gap-free permutation — a student counts these numbers.`,
      `Renumber the strokes so their 'order' fields form an unbroken 1, 2, 3, ... sequence. ` +
      `If you have added or removed a stroke, update all order values. Gaps and duplicates are both rejected.`,
    ),

  // ---------------------------------------------------------------------------
  // R5 — Path data is well-formed
  // ---------------------------------------------------------------------------

  R5_MALFORMED_PATH: (character: string, which: 'glyph' | 'stroke', strokeOrder?: number): ValidationFinding =>
    finding('R5', 'hard', character,
      'MALFORMED_PATH',
      `Glyph '${character}': ${which === 'stroke' ? `stroke ${strokeOrder ?? '?'}` : 'combined path'} ` +
      `contains malformed SVG path data. The path must be a valid SVG 'd' attribute string.`,
      `Validate the path string using an SVG path parser. Common issues: unclosed paths, ` +
      `invalid command letters, missing coordinate pairs, non-numeric values. ` +
      `If you are authoring strokes by hand, consider using a vector editor and exporting the 'd' attribute.`,
    ),

  // ---------------------------------------------------------------------------
  // R6 — License
  // ---------------------------------------------------------------------------

  R6_MISSING_LICENSE: (): ValidationFinding =>
    finding('R6', 'hard', '*',
      'MISSING_LICENSE',
      `Font has no license field. Teacher Toolbox cannot load a font without verified license information.`,
      `Add a 'license' object to font-project.json with 'spdx', 'commercialUse: true', and optionally 'attribution'. ` +
      `Accepted SPDX identifiers: OFL-1.1, Apache-2.0, MIT, CC0-1.0, CC-BY-4.0, Custom-Original.`,
    ),

  R6_NON_COMMERCIAL_LICENSE: (spdx: string): ValidationFinding =>
    finding('R6', 'hard', '*',
      'NON_COMMERCIAL_LICENSE',
      `Font license '${spdx}' does not permit commercial use (commercialUse: false). ` +
      `Teacher Toolbox is a commercial SaaS product and may only embed fonts licensed for commercial redistribution.`,
      `Use only open licenses that explicitly permit embedding in commercial software: ` +
      `OFL-1.1, Apache-2.0, MIT, CC0-1.0, CC-BY-4.0, or a custom original license ` +
      `(mark as 'Custom-Original' with full attribution text in the 'attribution' field).`,
    ),

  R6_PROHIBITED_LICENSE: (spdx: string): ValidationFinding =>
    finding('R6', 'hard', '*',
      'PROHIBITED_LICENSE',
      `Font license '${spdx}' is not in the Teacher Toolbox accepted license list. ` +
      `Proprietary, per-seat, desktop-only, or "personal use" licenses are categorically prohibited ` +
      `regardless of how the license text is worded informally.`,
      `Replace with an accepted open license (OFL-1.1 is the standard for open-source typefaces). ` +
      `If this is an original font with a custom license, use 'Custom-Original' and provide full ` +
      `license text in the 'attribution' field. If you are unsure, do not proceed — font license ` +
      `violations carry legal risk that cannot be undone by a future patch.`,
    ),

  R6_UNVERIFIABLE_PROVENANCE: (): ValidationFinding =>
    finding('R6', 'hard', '*',
      'UNVERIFIABLE_PROVENANCE',
      `Font has no attribution and uses a license that requires attribution. ` +
      `An unattributed font cannot be verified as legally compliant regardless of the stated SPDX identifier.`,
      `Add an 'attribution' string identifying the original author, source URL, and license version. ` +
      `e.g. "Based on [Font Name] by [Author], licensed under OFL-1.1. Source: https://..."`,
    ),

  // ---------------------------------------------------------------------------
  // R7 — Ratio/label array parity
  // ---------------------------------------------------------------------------

  R7_RATIO_LABEL_MISMATCH: (ratioCount: number, labelCount: number): ValidationFinding =>
    finding('R7', 'hard', '*',
      'RATIO_LABEL_MISMATCH',
      `GuidelineSpec has ${ratioCount} lineRatios but ${labelCount} lineLabels. ` +
      `These arrays must have identical length — each ratio corresponds to exactly one label.`,
      `Ensure lineRatios and lineLabels have the same number of entries. ` +
      `lineCount should also match. Order is bottom-to-top: lineRatios[0] is the lowest line.`,
    ),

  // ---------------------------------------------------------------------------
  // R8 — unitsPerEm
  // ---------------------------------------------------------------------------

  R8_INVALID_UNITS_PER_EM: (value: unknown): ValidationFinding =>
    finding('R8', 'hard', '*',
      'INVALID_UNITS_PER_EM',
      `HandwritingFontMeta.unitsPerEm is '${String(value)}', which is not a positive finite number. ` +
      `Without a valid unitsPerEm, the renderer cannot scale any glyph correctly — all proportions collapse.`,
      `Set unitsPerEm to the positive integer that represents one em in your font's coordinate space. ` +
      `Common values: 1000 (PostScript/OpenType convention), 2048 (TrueType convention), or any ` +
      `value natural to your authoring tool. All glyph metrics and stroke coordinates must be ` +
      `expressed in these same units.`,
    ),

  // ---------------------------------------------------------------------------
  // S1 — Extended character coverage
  // ---------------------------------------------------------------------------

  S1_MISSING_EXTENDED_CHARACTERS: (missing: string[]): ValidationFinding =>
    finding('S1', 'soft', '*',
      'MISSING_EXTENDED_CHARACTERS',
      `Font is missing ${missing.length} recommended extended character${missing.length === 1 ? '' : 's'}: ` +
      `${missing.map(c => `'${c}'`).join(', ')}. ` +
      `Missing characters fall through to the fallbackGlyph at render time, which may be visually ` +
      `inconsistent with the script's style.`,
      `Add glyphs for common punctuation and any locale-specific characters expected for ` +
      `the target classroom context. This is not required to load the font but will affect ` +
      `the completeness score and the font's suitability for sentence-tracing worksheets.`,
    ),

  // ---------------------------------------------------------------------------
  // S2 — Stroke count plausibility
  // ---------------------------------------------------------------------------

  S2_UNUSUAL_STROKE_COUNT: (character: string, count: number, typicalMax: number): ValidationFinding =>
    finding('S2', 'soft', character,
      'UNUSUAL_STROKE_COUNT',
      `Glyph '${character}' has ${count} stroke${count === 1 ? '' : 's'}, which is higher than the ` +
      `typical maximum of ${typicalMax} for this character class. This may indicate a data entry ` +
      `error (e.g. each curve segment authored as a separate stroke rather than one continuous path).`,
      `Review whether each stroke represents a genuine pen lift in classroom handwriting instruction. ` +
      `Continuous curves within one pen stroke should be ONE path entry, not multiple. ` +
      `If this stroke count is correct for your script, add a note in the glyph's authoringNotes field.`,
    ),

  // ---------------------------------------------------------------------------
  // S3 — endPoint continuity
  // ---------------------------------------------------------------------------

  S3_DISCONTINUOUS_STROKES: (character: string, fromOrder: number, toOrder: number, distance: number): ValidationFinding =>
    finding('S3', 'soft', character,
      'DISCONTINUOUS_STROKES',
      `Glyph '${character}': stroke ${fromOrder}'s endPoint is ${distance.toFixed(1)} font units away ` +
      `from stroke ${toOrder}'s startPoint, but no pen lift is declared between them ` +
      `(penLifts does not indicate a lift before stroke ${toOrder}). ` +
      `This may indicate a missing pen-lift declaration or an authoring error in one of the endpoints.`,
      `Either: (a) set penLifts to 'custom' and add ${toOrder - 1} to penLiftBeforeStrokeIndex if ` +
      `there IS a pen lift here, or (b) correct the endPoint of stroke ${fromOrder} or the ` +
      `startPoint of stroke ${toOrder} so they connect correctly.`,
    ),

  // ---------------------------------------------------------------------------
  // S4 — teachingNote coverage
  // ---------------------------------------------------------------------------

  S4_MISSING_TEACHING_NOTES: (character: string, strokeOrders: number[]): ValidationFinding =>
    finding('S4', 'soft', character,
      'MISSING_TEACHING_NOTES',
      `Glyph '${character}': stroke${strokeOrders.length === 1 ? '' : 's'} ` +
      `${strokeOrders.join(', ')} ${strokeOrders.length === 1 ? 'is' : 'are'} marked difficultyEmphasis ` +
      `but lack a teachingNote. Teaching notes on difficult strokes are how a future ` +
      `teacher-facing reference panel will explain correct technique.`,
      `Add a teachingNote string to each difficulty-emphasis stroke. Write for an adult ` +
      `helping a young child — be specific about direction and anchor points. ` +
      `Example: "Start just below the midline. Curve left and down to the baseline, ` +
      `then curve right and back up to just below the midline."`,
    ),

  // ---------------------------------------------------------------------------
  // S5 — pedagogicalSource
  // ---------------------------------------------------------------------------

  S5_MISSING_PEDAGOGICAL_SOURCE: (): ValidationFinding =>
    finding('S5', 'soft', '*',
      'MISSING_PEDAGOGICAL_SOURCE',
      `HandwritingFontMeta.pedagogicalSource is absent. For a bundled (platform-shipped) font, ` +
      `this field is required — it documents which published curriculum, style guide, or ` +
      `named open-source project the stroke order and proportions are based on. ` +
      `Without it, the font cannot be verified as educationally authoritative.`,
      `Add a pedagogicalSource string citing the reference, e.g. ` +
      `"Zaner-Bloser Handwriting, Grade 1 Teacher Edition (2024 edition)" or ` +
      `"Based on the Open Handwriting Project (https://...), MIT licensed." ` +
      `For a custom/original script with no published reference, state that explicitly: ` +
      `"Original script designed for Teacher Toolbox — no external reference."`,
    ),

  // ---------------------------------------------------------------------------
  // C1 — Ruling consistency
  // ---------------------------------------------------------------------------

  C1_RULING_INCONSISTENCY: (
    character: string,
    metricName: string,
    metricValue: number,
    expectedRatio: number,
    actualRatio: number,
    unitsPerEm: number,
    isFatal: boolean,
  ): ValidationFinding =>
    finding(
      'C1',
      isFatal ? 'hard' : 'soft',
      character,
      isFatal ? 'C1_RULING_INCONSISTENCY_FATAL' : 'C1_RULING_INCONSISTENCY',
      `Glyph '${character}': ${metricName} metric (${metricValue} font units) converts to ` +
      `row-ratio ${(1 - metricValue / unitsPerEm).toFixed(4)} but the font's GuidelineSpec ` +
      `declares that line at ratio ${expectedRatio.toFixed(4)}. ` +
      `Difference: ${Math.abs(actualRatio - expectedRatio).toFixed(4)} ` +
      `(${isFatal ? 'EXCEEDS hard' : 'exceeds soft'} threshold of ${isFatal ? '0.08' : '0.02'}). ` +
      `At this magnitude, the letter will visibly ${isFatal ? 'misalign against' : 'not sit cleanly on'} the ruling lines.`,
      `Correct the '${metricName}' value in this glyph to match the font's canonical ruling. ` +
      `Target value: ${Math.round((1 - expectedRatio) * unitsPerEm)} font units ` +
      `(computed as (1 - ${expectedRatio}) × ${unitsPerEm} unitsPerEm). ` +
      `Remember: lineRatios is canonical — individual glyph metrics must conform to it, not the reverse.`,
    ),

  // ---------------------------------------------------------------------------
  // C2 — Derived path integrity
  // ---------------------------------------------------------------------------

  C2_PATH_STROKE_MISMATCH: (character: string): ValidationFinding =>
    finding('C2', 'soft', character,
      'PATH_STROKE_MISMATCH',
      `Glyph '${character}': the stored 'path' field does not match the concatenation of ` +
      `stroke paths in order. This should never happen if the font was built with the ` +
      `font-toolkit builder — it indicates either a manually-edited path or a build tool bug.`,
      `Re-run the build tool to recompute the derived path field from strokes. ` +
      `Never edit the 'path' field manually — it is a build output, not an authoring input.`,
    ),

  // ---------------------------------------------------------------------------
  // C3 — Advance-width sanity
  // ---------------------------------------------------------------------------

  C3_ADVANCE_WIDTH_OUTLIER: (character: string, advance: number, median: number, ratio: number): ValidationFinding =>
    finding('C3', 'soft', character,
      'ADVANCE_WIDTH_OUTLIER',
      `Glyph '${character}' has advance width ${advance} font units, which is ${ratio.toFixed(1)}× ` +
      `the script's median advance of ${median.toFixed(0)}. This is likely a data-entry error ` +
      `(e.g. a misplaced decimal point) rather than intentional design.`,
      `Verify the advance width for '${character}'. If this is intentional (e.g. 'm' is ` +
      `genuinely wider than average), add an 'intentionallyWide: true' flag to suppress this warning. ` +
      `Otherwise, correct the value to a reasonable multiple of the font's unitsPerEm.`,
    ),

};

// ---------------------------------------------------------------------------
// Completeness score computation
// ---------------------------------------------------------------------------

/**
 * Compute the 0–100 completeness score from a set of findings and coverage.
 * This is a pure function — it does not mutate any state.
 *
 * Scoring model:
 * - Start at 100.
 * - Hard failures: -20 per finding (capped — a font with 3+ hard failures
 *   scores 0 regardless, preventing a misleading non-zero score).
 * - S1 (missing extended chars): -1 per missing character, max -10.
 * - S2/S3/C1/C2/C3 warnings: -2 per finding.
 * - S4 (missing teaching notes): -0.5 per finding.
 * - S5 (missing pedagogical source): -5.
 * - Score is floored at 0, never negative.
 */
export function computeCompletenessScore(findings: ValidationFinding[]): number {
  if (findings.some(f => f.severity === 'hard')) {
    const hardCount = findings.filter(f => f.severity === 'hard').length;
    if (hardCount >= 3) return 0;
  }

  let score = 100;

  for (const f of findings) {
    if (f.severity === 'hard') {
      score -= 20;
    } else {
      switch (f.rule) {
        case 'S1': score -= 1;   break;
        case 'S4': score -= 0.5; break;
        case 'S5': score -= 5;   break;
        default:   score -= 2;   break;
      }
    }
  }

  return Math.max(0, Math.round(score));
}

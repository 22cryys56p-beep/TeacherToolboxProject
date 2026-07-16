# Teacher Toolbox Handwriting Font Specification (TTHFS)
**Version:** 1.0.0
**Status:** Ratified — governs all handwriting fonts from v0.3 onward
**Applies to:** `SVGPathFont`, `SVGGlyph`, `GlyphStroke`, `HandwritingFontMeta`, `GuidelineSpec` (`@teacher-toolbox/types/font`)

---

## 0. Purpose and Authority

This document is the contract every handwriting font must satisfy before Teacher Toolbox will load it for instructional use. It is not a style guide and not a typographic preference document. Its only job is to guarantee that anything claiming to be a "handwriting font" in this platform can actually teach a child to form a letter correctly — stroke by stroke, in the right order, in the right direction, at a size and proportion appropriate to their grade.

Where this specification and typographic convention disagree, this specification wins. That is not a tiebreaker rule invoked occasionally — it is the reason this document exists at all. Several decisions below will look unusual to a font engineer coming from print typography. Each one is explained, and none of them are negotiable for the same reason the renderer's `protectedDimensions` and entitlement-isolation rules aren't negotiable: they are the difference between a feature and a thing that merely resembles a feature.

This specification governs the **data format**. It does not mandate any particular tool to produce that data — a font can be authored by hand in a text editor, generated from a stroke-capture tool, or converted from an existing open-licensed source, provided the output conforms to what follows.

---

## 1. The Complete `SVGPathFont` Structure

A handwriting font is one `SVGPathFont` object. This is the root of the file format.

```typescript
interface SVGPathFont {
  id: FontId;
  /** TTHFS specification version this font conforms to, e.g. "1.0.0" */
  specVersion: string;
  /** Font's own content version, independent of specVersion — see §8 */
  version: string;
  meta: HandwritingFontMeta;
  glyphs: Record<string, SVGGlyph>;
  fallbackGlyph?: SVGGlyph;
  /** See §7 — required for every font, no exceptions */
  validation: FontValidationReport;
}
```

`specVersion` and `version` are deliberately separate fields (expanded in §8). `validation` is new in this specification — every font ships with its own self-reported completeness report, computed at build time, not asserted by the font author's say-so. The platform re-verifies this report at load time and refuses to silently trust it (§6).

---

## 2. `SVGGlyph` — Complete Structure and Required Metadata

```typescript
interface SVGGlyph {
  /** Unicode character this glyph represents, e.g. "a", "A", "2" */
  character: string;

  /**
   * Combined path across all strokes — DERIVED, never authored directly.
   * Used only for non-directional rendering contexts: ghost/background
   * letters, static "model word" comparison text, and as the absolute
   * last-resort visual fallback when strokes cannot be rendered at all.
   * The platform computes this from `strokes` rather than trusting an
   * independently-authored value, to guarantee it can never silently
   * diverge from the stroke data that is the actual source of truth.
   */
  path: string;

  /**
   * The ordered, directional decomposition into individual pen strokes.
   * THIS is the educational payload of the glyph. See §3.
   * MUST NOT be empty for a glyph to be considered complete (§7).
   */
  strokes: GlyphStroke[];

  // ---- Dimensional metadata, all in font units (see §4 for the unit system) ----

  /** Natural advance-bounding width of the glyph */
  width: number;
  /** Natural height spanning the full vertical extent the glyph occupies, including any descender */
  height: number;
  /** Distance from the top of the glyph's bounding box to the baseline */
  baseline: number;
  /** Distance from the top of the glyph's bounding box to the midline (x-height line) */
  midline: number;
  /**
   * Distance from the top of the glyph's bounding box to the ascender line,
   * for glyphs that reach above the midline (b, d, h, k, l, t, capitals,
   * numerals). For glyphs that never exceed the midline (a, c, e, m, n, o,
   * etc.) this equals `midline`.
   */
  ascenderLine: number;
  /**
   * Distance from the top of the glyph's bounding box to the descender
   * line, for glyphs that drop below the baseline (g, j, p, q, y). For
   * glyphs with no descender this equals `baseline`.
   */
  descenderLine: number;
  /** Horizontal advance to the start of the next glyph */
  advance: number;

  // ---- Pedagogical classification (new in TTHFS — see §3.5 and §7) ----

  /**
   * Whether this glyph, by design, never lifts the pen between strokes
   * (e.g. cursive lowercase 'l') vs. requires multiple pen lifts (e.g.
   * print 't' — vertical stroke, then lift, then crossbar). This is
   * informational metadata read by the renderer to decide whether to show
   * a pen-lift indicator between strokes during animation (§3.4) — it is
   * NOT inferred from stroke count, because some single-stroke glyphs in
   * cursive scripts are genuinely complex curves, while some multi-stroke
   * print glyphs are simple lifts. Authored explicitly, never guessed.
   */
  penLifts: 'none' | 'between-all-strokes' | 'custom';
  /**
   * If penLifts is 'custom', this array marks which stroke INDICES (0-based,
   * matching strokes[].order - 1) are preceded by a pen lift. Required only
   * in the 'custom' case; absent otherwise.
   */
  penLiftBeforeStrokeIndex?: number[];
}
```

### 2.1 Why `path` is derived, not authored

A typographer would author the combined outline directly — it's the thing that gets drawn, after all. The educational requirement inverts this: the stroke sequence is the thing that's true, and the combined silhouette is a byproduct. If a font tool lets an author hand-author both `path` and `strokes` independently, they can drift — a beautiful combined outline with a stroke sequence that doesn't actually trace it. TTHFS treats this as a validation failure (§7.3), and any font build pipeline implementing this spec must compute `path` programmatically by concatenating `strokes[].path` in `order` rather than accepting two independent inputs.

### 2.2 Why four guide-line offsets instead of two

The existing implementation (`baseline`, `midline`) is correct for the simplest 2-line and 3-line ruling systems but cannot correctly represent a glyph like lowercase `b` (ascender, no descender) or `g` (descender, no ascender, x-height only) against a full 4-line ruling system without `ascenderLine` and `descenderLine` as independent values. Collapsing these into a single `lineHeightRatio`/`descenderRatio` pair on the font (as the current `HandwritingFontMeta` does) is correct as a *default* but cannot represent legitimate per-glyph variation — capital letters in most scripts reach the ascender line even though lowercase x-height letters don't, and this has to be expressible per glyph, not just per font.

---

## 3. `GlyphStroke` — Complete Structure

```typescript
interface GlyphStroke {
  /** SVG path data for this single stroke, in font units, relative to the glyph origin */
  path: string;

  /** 1-indexed position in the stroke sequence — the number shown to a student */
  order: number;

  /** Where the pen touches down to begin this stroke, in font units */
  startPoint: { x: number; y: number };

  /** Where the pen lifts at the end of this stroke, in font units */
  endPoint: { x: number; y: number };

  /**
   * Coarse-grained direction of travel — handwriting instruction teaches
   * "down then right", not a precise bearing in degrees.
   */
  direction:
    | 'down' | 'up' | 'left' | 'right'
    | 'down-right' | 'down-left' | 'up-right' | 'up-left'
    | 'curve-clockwise' | 'curve-counterclockwise';

  /**
   * Relative length of this stroke as a fraction of the glyph's total
   * stroke-path length (0–1, all strokes in a glyph sum to 1.0). Used to
   * pace stroke animation proportionally — a long curved stroke should
   * take longer to draw than a short tick mark, not the same fixed
   * duration. See §3.4.
   */
  relativeDuration: number;

  /**
   * Whether this stroke is typically the hardest part of the letter for
   * early writers (e.g. the diagonal cross-strokes in 'x', the curve-back
   * in cursive 'r'). Used to optionally highlight or slow down animation
   * on the stroke that most needs attention. Optional — absence means
   * "no special emphasis", not "easy".
   */
  difficultyEmphasis?: boolean;

  /**
   * A short, plain-language description of this stroke's motion, written
   * for an adult (teacher or parent) helping a child, e.g. "Start at the
   * top, pull straight down to the baseline." Optional but strongly
   * recommended — see §7.2 for how this affects completeness scoring.
   * This is NOT shown to the student directly; it exists for teacher-facing
   * tooltips and a future "how to teach this letter" reference panel.
   */
  teachingNote?: string;
}
```

### 3.1 Why `endPoint` is required, not optional

The original implementation had only `startPoint`. Stroke animation (§3.4) and direction arrows both need to know where a stroke ends, not just where it begins — without `endPoint`, an animated stroke has no defined terminus to ease into, and a mid-stroke direction arrow has no second reference point to be drawn between. This was a genuine gap rather than a refinement; it is corrected here as part of ratifying the spec, not introduced as new scope.

### 3.2 Why `relativeDuration` exists

A typographic instinct would animate every stroke for the same fixed duration — visually tidy, evenly paced. The pedagogically correct behavior is the opposite: stroke pacing should reflect stroke length and complexity, because a child watching a demonstration needs the long sweeping curve of a cursive capital to visibly take longer than a short crossbar tick. `relativeDuration` is authored per-stroke (not computed from raw path length at render time) because path length alone doesn't account for strokes that are pedagogically meant to be drawn slowly even if geometrically short (a sharp corner that needs a deliberate pause, for instance) — see `difficultyEmphasis`.

### 3.3 Why `direction` stays coarse-grained

This was already correct in the original implementation and is preserved unchanged. Handwriting instruction operates in cardinal/intercardinal directions and curve-rotation sense — "pull down and to the right," "curve back around clockwise" — never in precise angular bearings. A finer-grained direction value would imply a precision the pedagogy doesn't use and would tempt a renderer into computing "more accurate" arrows that contradict how the stroke is actually taught.

### 3.4 Stroke animation contract (new — formalizing a previously-unspecified future feature)

The original handwriting renderer design explicitly named "stroke animation" as a future capability without specifying its data contract. TTHFS specifies it now so that fonts authored today don't need to be revisited later:

- Animation plays strokes in `order` sequence, never reordered or parallelized — two strokes never animate simultaneously, because handwriting is sequential by nature and showing two pen-motions at once would misrepresent that.
- Each stroke's animated draw duration is `relativeDuration × totalAnimationDuration`, where `totalAnimationDuration` is a renderer-level setting (not stored in the font), so a teacher or the renderer can control overall pace without the font dictating absolute timing.
- A pen-lift pause is inserted between two strokes whenever `penLifts` indicates one (§2), using a renderer-level pause duration — again not stored in the font, since "how long the pause feels" is a presentation concern, while "whether a pause is pedagogically real" is a font-data concern.
- The animation path itself is exactly `stroke.path` — no separate "animation path" is authored. One path, one source of truth, consistent with §2.1's same principle applied one level down.

### 3.5 Stroke-count and complexity sanity bounds (validation-relevant, detailed in §7)

A glyph's stroke count must fall within a plausible range for its character class (e.g. a lowercase print letter typically has 1–3 strokes; a capital letter 1–4; a numeral 1–3). This is a **soft validation warning**, not a hard rejection — calligraphic or stylistic variation can legitimately exceed typical counts — but a glyph claiming 11 strokes for a lowercase 'o' is almost certainly a data error, and the validator should flag it for human review rather than silently accept it.

---

## 4. Guideline Relationships — Baseline, Midline, X-Height, Ascender, Descender

### 4.1 The font-unit coordinate system

All dimensional values in `SVGGlyph` (and `GuidelineSpec.lineRatios`, by extension) are expressed in **font units**, an abstract coordinate space local to the font, with **y increasing downward** (matching SVG convention, not traditional font-design convention where y increases upward — this avoids a sign-flip translation step at every single point the renderer touches glyph data, which is a class of bug worth eliminating structurally rather than defending against case-by-case).

The font declares its own unit-per-em equivalent via `HandwritingFontMeta.unitsPerEm` (added below, §5) — there is no platform-wide fixed font-unit scale, because different stroke-capture and authoring tools have different natural resolutions, and forcing a single scale onto every font invites silent precision loss in conversion.

**Current renderer behavior vs. this specification's requirement (an honest gap, per the discipline established in §8.2 and Appendix A):**

The current `glyphPositioner.ts` scales glyphs using `targetHeightUnits / glyph.height` — treating each glyph's own `height` field as the denominator, with no reference to `unitsPerEm`. This is correct *today*, because the platform has no loaded SVG path fonts yet, and `glyph.height` and `unitsPerEm` would be equal if a font authored all glyphs at consistent height. However, it is fragile: a font where individual glyphs have varying `height` values (common in any font with ascenders and descenders of different extent) would produce inconsistent scale if each glyph is normalized against its own `height` rather than against the font-wide `unitsPerEm`.

**The required renderer behavior, to be implemented before the first real SVG path font is registered:**

```
scale = targetHeightUnits / font.meta.unitsPerEm
```

Not `targetHeightUnits / glyph.height`. The glyph's own `height` may be smaller than `unitsPerEm` (a descender-free glyph that doesn't use the full em square), and that difference is meaningful — it is what positions the glyph correctly within the ruled row relative to other glyphs. Normalizing by `glyph.height` treats every glyph as if it fills its em square, which collapses exactly that distinction. This renderer change is required in `glyphPositioner.ts` (`placeGlyph`, `placeGlyphStrokes`, `placeWordStrokes`) and constitutes the fourth item in Appendix A's change list. It is listed here rather than only in the appendix because it must be understood before implementing any font — authoring a font's `height` and `unitsPerEm` values correctly depends on knowing which one the renderer will actually use.

### 4.2 The five reference lines, defined relative to one another

```
┌─────────────────────────────────────── ascender line   (0% — top of tallest lowercase strokes, e.g. 'b','l','t', and ALL capitals/numerals)
│
│         "tall" letters reach here
│
├─────────────────────────────────────── midline          (x-height line — top of lowercase 'x', 'a', 'o', etc.)
│
│         "short" letters occupy this band
│
├─────────────────────────────────────── baseline         (where every letter's bottom sits, no exceptions)
│
│         descenders only
│
└─────────────────────────────────────── descender line   (bottom of 'g','j','p','q','y')
```

A fifth conceptual line — the **topline** — is not a separate measured quantity. It is a *ruling* concept (the top rule drawn on the page for visual framing) and is configured per-`GuidelineSpec`, not per-glyph; it typically coincides with the ascender line but does not have to (some ruling systems draw a topline above the tallest letters for visual headroom). This distinction matters: **glyph metrics describe where ink goes; `GuidelineSpec` describes where rules are drawn on the page.** They are related but not identical, and the renderer must never assume `ascenderLine === topline` without checking — a font or ruling-system combination that wants headroom above the tallest letters is legitimate and must be expressible.

### 4.3 Required per-glyph relationship invariants

Every glyph in a conformant font MUST satisfy:

```
0 ≤ ascenderLine ≤ midline ≤ baseline ≤ descenderLine ≤ height
```

(Recall y increases downward — `ascenderLine` is the smallest y-value, `descenderLine` the largest, both bounded by the glyph's own `height`.)

For glyphs with no ascender reach (`a, c, e, m, n, o, r, s, u, v, w, x, z`, and most numerals in many scripts): `ascenderLine === midline`.
For glyphs with no descender (`a` through `z` minus `g, j, p, q, y`, and most capitals/numerals): `descenderLine === baseline`.

A validator that finds `ascenderLine > midline` or `descenderLine < baseline` (i.e., the relationship inverted) must hard-reject the glyph (§7.3) — this is not stylistic variation, it is geometrically incoherent data.

### 4.4 How `GuidelineSpec.lineRatios` and glyph metrics relate — and the conversion formula for C1

`GuidelineSpec.lineRatios` and glyph dimensional fields (`ascenderLine`, `midline`, `baseline`, `descenderLine`) describe the same pedagogical facts — where each reference line sits — but in two different coordinate systems that exist for good reason and must never be silently conflated.

**`lineRatios` coordinate system:** bottom-up, fraction of total *row* height. `0.0` = the bottom of the practice row on the page; `1.0` = the top of the practice row. This is the row-space coordinate system used by `handwritingLineRenderer.ts` (`y = rowHeight - ratio * rowHeight`). It describes where rules are *drawn on the page*.

**Glyph metric coordinate system:** top-down, font units, measured from the top of the *glyph's bounding box*. This is the per-glyph font-unit coordinate system described in §4.1. `0` = the top of the glyph bounding box; `unitsPerEm` = the bottom.

These two systems express the same underlying proportions in different forms. The conversion between them is:

```
lineRatio(metric) = 1 - (metric / unitsPerEm)
metric(lineRatio) = (1 - lineRatio) × unitsPerEm
```

The `1 -` inversion exists because row-space ratios increase upward (0 = bottom) while glyph metric values increase downward (0 = top).

**Applying this to C1 validation:**

For each named reference line, the font declares both a `lineRatios` entry (in `HandwritingFontMeta.guidelines`) and a corresponding per-glyph metric value. The validator converts one to the other using the formula above and checks that they agree within a tolerance. The expected conversions for a correctly-authored glyph are:

| Glyph metric | Corresponding `lineLabels` entry | Expected `lineRatios` value |
|---|---|---|
| `glyph.baseline` | `'baseline'` | `1 - (glyph.baseline / unitsPerEm)` |
| `glyph.midline` | `'midline'` | `1 - (glyph.midline / unitsPerEm)` |
| `glyph.ascenderLine` | `'ascender'` or `'topline'` (font declares which) | `1 - (glyph.ascenderLine / unitsPerEm)` |
| `glyph.descenderLine` | `'descender'` (if present in guidelines) | `1 - (glyph.descenderLine / unitsPerEm)` |

**C1 tolerance:** A difference of ≤ `0.02` (2% of row height) between the converted glyph metric and the font-declared `lineRatios` value is accepted. A difference > `0.02` triggers a C1 warning. A difference > `0.08` (8%) triggers a C1 hard failure — at that magnitude the glyph would visibly sit off its baseline in rendered output, which is an educational correctness defect, not a rounding issue.

**The canonical direction:** `HandwritingFontMeta.guidelines.lineRatios` is the *authoritative* statement — set once by the font author for the whole script, before any individual glyphs are authored. Individual glyph metrics must be authored to match those ratios (using the inverse formula above to compute target metric values from the declared ratios) — not the reverse. A font build tool that auto-computes `lineRatios` from the first glyph it encounters would be implementing this backward. The ratios are a pedagogical decision about the script; individual glyph metrics are a geometric fact about each letterform; the script-level decision comes first.

---

## 5. `HandwritingFontMeta` — Updated Structure

```typescript
interface HandwritingFontMeta {
  script: HandwritingScript;
  /** Recommended grade range, e.g. ['K', '2'] — see §6 for how this interacts with sizeScale */
  gradeRange: [GradeLevel, GradeLevel];

  /** Font-unit coordinate scale — see §4.1 */
  unitsPerEm: number;

  /** Canonical ratio of ascender height to x-height, for fonts/tools that need a single summary number (e.g. quick layout estimates before full glyph data loads) */
  lineHeightRatio: number;
  descenderRatio: number;

  /** Authoritative ruling-line definition — see §4.4 */
  guidelines: GuidelineSpec;

  /**
   * Human-readable name of the pedagogical method/tradition this script
   * belongs to, e.g. "Zaner-Bloser", "D'Nealian", "UK National Curriculum
   * cursive". Distinct from `script` (the machine-readable enum) — this is
   * for display in font-picker UI and teacher-facing documentation.
   */
  methodName: string;

  /**
   * Whether this script is typically introduced before, alongside, or after
   * print in the method's standard sequence. Informational — used to order
   * font choices sensibly in a grade-appropriate font picker, never to
   * gate access.
   */
  sequencePosition: 'foundational' | 'transitional' | 'advanced';

  /**
   * Free-text citation or reference for the pedagogical source this script's
   * stroke order and proportions are based on (a published curriculum, a
   * style guide, a named open-source project). Required for any bundled
   * (platform-shipped) font — see §6.2. Not required for user-uploaded fonts,
   * though strongly recommended.
   */
  pedagogicalSource?: string;
}
```

### 5.1 Why `unitsPerEm` is now explicit

Covered in §4.1 — this was implicit and tool-dependent before; making it an explicit, required field removes an entire class of "this font renders at the wrong scale" bugs at the integration boundary, where the bug would otherwise only surface visually, late, and be hard to trace back to its actual cause (a units mismatch presents as "everything is slightly wrong," which is one of the hardest categories of bug to diagnose from symptoms alone).

---

## 6. Grade-Level Scaling — Data, Never Hardcoded Rules

This section formalizes a rule the renderer implementation already established (`handwritingLineRenderer.ts`'s `sizeScale` mechanism, `spellingWordCellRenderer.ts`'s pedagogical fade progression) and extends it to the font specification layer, so the rule is enforced at every layer consistently rather than only where it happened to be implemented first.

### 6.1 The single sanctioned mechanism: `sizeScale`

Grade-appropriate sizing is **always** expressed as a uniform multiplier applied to an entire row's height (and, by extension, every glyph rendered into that row scales proportionally with it — see `placeGlyphStrokes`'s existing scale computation, which already does this correctly). There is no other sanctioned mechanism. Specifically prohibited:

- A font defining per-grade-band variant glyph sets (e.g. separate "Kindergarten a" vs "Grade 2 a" glyphs with different proportions). A single glyph's *proportions* (the ratio of ascenderLine/midline/baseline/descenderLine to each other) are a property of the **script**, not the **grade** — what changes by grade is absolute size, never relative proportion. Two different proportion sets for the same script would imply the platform is teaching two different things depending on grade, which is not how handwriting pedagogy actually works: a first-grader and third-grader both learning Zaner-Bloser print are learning the *same* letterforms at different *sizes*.
- A renderer-level grade lookup table (`if (gradeLevel === 'K') { ... }`) anywhere outside the `sizeScale` computation. This was already enforced structurally in the renderer (verified by the "no per-grade branching" grep check in the implementation session) and this specification makes that enforcement a requirement of any future renderer code touching font data, not just a property of the current one.

### 6.2 Where `sizeScale` values come from

`sizeScale` is not stored in the font at all — fonts describe proportions, not sizes-per-grade. Grade-to-scale mapping is a **platform-level, theme-level concern** (already the architecture: `ThemeLayout.defaultLineSpacing: 'primary' | 'intermediate' | 'college'` plus `component.data.sizeScale` for per-row override). A font's only obligation is correctness of `gradeRange` (which grades this script is pedagogically appropriate *for*, regardless of size) — never an opinion about what size each grade should render at. This keeps a strict separation: **fonts own proportion and stroke correctness; themes and worksheet authors own size.**

---

## 7. Validation Rules — What Makes a Font "Educationally Complete"

Every font, at load time, is scored against the following rules. The result is the `FontValidationReport` (§7.4) — a structured, machine-readable, always-present part of the font file (§1), recomputed and cross-checked by the platform at load time rather than trusted blindly from the file.

### 7.1 Hard requirements (font is REJECTED — not loaded — if any fail)

| Rule | Check |
|---|---|
| **R1 — Required character coverage** | Every character in the script's declared `requiredCharacterSet` (§7.5) has a glyph entry. |
| **R2 — Non-empty strokes** | Every required glyph has `strokes.length >= 1`. A glyph with zero strokes is not "low quality," it is **absent** for instructional purposes — see §8 framing in the original renderer design, which already treats `strokes.length === 0` as a hard incompleteness signal, not a soft one. |
| **R3 — Geometric coherence** | Every glyph satisfies the ordering invariant in §4.3. |
| **R4 — Stroke order is a valid permutation** | `strokes[].order` values are exactly `1..N` with no gaps, no duplicates, for a glyph with N strokes. |
| **R5 — Path data is well-formed** | Every `path` string (both glyph-level derived and stroke-level authored) parses as valid SVG path data. |
| **R6 — License is present and compliant** | `FontLicense.spdx` is a recognized open license identifier; `commercialUse` is `true`; the license is NOT in the platform's prohibited-license list (§9 — proprietary/royalty-bearing licenses are categorically rejected at this gate, before any pedagogical check even runs). |
| **R7 — Ratio/label array parity** | `GuidelineSpec.lineRatios.length === GuidelineSpec.lineLabels.length` (this check already exists in the renderer's `handwritingLineRenderer.ts` as a runtime fallback; TTHFS promotes it to a load-time hard rejection so a malformed font never reaches a worksheet in production at all). |
| **R8 — unitsPerEm is positive and finite** | Prevents the entire coordinate system from being degenerate. |

A font failing any R-rule does not load. The platform surfaces the specific failing rule(s) to whoever is installing the font (a developer in v0.2-era, a font-marketplace reviewer in the future commercial era) — never a generic "invalid font" message.

### 7.2 Soft requirements (font LOADS, but is flagged as incomplete and cannot be marked "verified")

| Rule | Check | Consequence |
|---|---|---|
| **S1 — Extended character coverage** | Numerals, punctuation, accented characters beyond the core alphabet. | Missing characters fall through to `fallbackGlyph` at render time, which itself must satisfy R2–R5 if present, or render as a flagged unknown-glyph placeholder. |
| **S2 — Stroke count plausibility** | Per §3.5 — stroke count within typical range for the character class. | Flagged for human review; does not block loading. |
| **S3 — `endPoint` continuity** | A glyph's strokes, in order, should have each stroke's `endPoint` reasonably near the next stroke's `startPoint` (within a tolerance, accounting for legitimate pen lifts) UNLESS `penLifts` indicates a lift at that junction. | Flagged — likely indicates either missing pen-lift metadata or a stroke-order data error. |
| **S4 — `teachingNote` coverage** | Presence of `teachingNote` on strokes, particularly those marked `difficultyEmphasis`. | Reduces completeness score; does not block loading or instructional use, since teaching notes are a value-add, not a strict requirement for trace functionality. |
| **S5 — `pedagogicalSource` presence** | Per §5 — required for bundled fonts, recommended otherwise. | Bundled fonts without this are blocked from `source: 'bundled'` and must ship as `source: 'user-uploaded'` until provided. |

### 7.3 Cross-glyph consistency checks

| Rule | Check |
|---|---|
| **C1 — Ruling consistency** | Per §4.4 (which provides the exact conversion formula and tolerance values) — every glyph's baseline-relative metrics, when converted from font-unit space to row-ratio space using `lineRatio = 1 - (metric / unitsPerEm)`, must agree with the font's declared `guidelines.lineRatios` within ≤ 0.02 (warning) or ≤ 0.08 (hard failure). |
| **C2 — Derived path integrity** | `glyph.path` (when present) must equal the concatenation of `glyph.strokes[].path` in `order` — verified by re-deriving and diffing, never trusting an independently-supplied value (§2.1). |
| **C3 — Advance-width sanity** | No glyph's `advance` should differ from the script's median advance width by more than a generous multiple (catches obvious data-entry typos like a misplaced decimal point) without being explicitly flagged as an intentionally wide/narrow character (e.g. 'm' vs 'i'). |

### 7.4 `FontValidationReport` structure

```typescript
interface FontValidationReport {
  /** When this report was generated */
  generatedAt: ISODateTime;
  /** Did every hard requirement (R1–R8) pass? */
  isLoadable: boolean;
  /** Hard-rule failures, if any — present only when isLoadable is false */
  hardFailures: ValidationFinding[];
  /** Soft-rule and consistency-check findings — present regardless of isLoadable */
  warnings: ValidationFinding[];
  /**
   * 0–100 composite educational-completeness score, computed from coverage
   * + soft-rule pass rate. This is NOT a quality/aesthetic score — a font
   * with perfectly correct but visually plain strokes scores higher than a
   * beautiful font with missing stroke order. Used by the platform to
   * decide whether a font may display a "Verified Complete" badge in any
   * future font picker UI (threshold: 100 required for full required
   * character set with zero warnings; partial scores are shown as-is, never
   * rounded up to imply more completeness than exists).
   */
  completenessScore: number;
  /** Which characters from requiredCharacterSet are present/absent */
  characterCoverage: { required: string[]; present: string[]; missing: string[] };
}

interface ValidationFinding {
  rule: string;            // e.g. "R2", "S3", "C1"
  glyphCharacter?: string; // which glyph this finding concerns, if applicable
  message: string;
  severity: 'hard' | 'soft';
}
```

### 7.5 `requiredCharacterSet` per script family

A script declares which characters are mandatory for R1. The baseline requirement for ANY script accepted by the platform:

- Lowercase `a`–`z` (26 glyphs)
- Uppercase `A`–`Z` (26 glyphs)
- Numerals `0`–`9` (10 glyphs)

Scripts MAY declare a larger required set (e.g. common punctuation `. , ! ?` for a script intended for sentence-tracing worksheets), but may not declare a smaller one — 62 glyphs is the platform-wide floor regardless of script family, because a font missing basic numerals or capitals cannot support the breadth of worksheet types (spelling, dates, sentences) the platform's other components already assume are available.

---

## 8. Reporting Missing or Incomplete Glyph Data

This formalizes and extends the behavior already partially implemented in `handwritingWordRenderer.ts` (`missingStrokeData` surfaced via `renderMissingStrokeDataNotice`), making it a specification-level requirement rather than an implementation detail of one renderer.

### 8.1 Three distinct reporting contexts, three distinct audiences

**Load-time (developer/font-installer audience).** The `FontValidationReport` (§7.4) is the authoritative record. Surfaced in developer console output and any future font-management UI. This is where R-rule failures and the completeness score live.

**Render-time (worksheet-author audience — a teacher building a worksheet).** When a worksheet references a font/character combination that has no usable stroke data, the renderer must not silently omit the letter from the printed page. The existing `renderMissingStrokeDataNotice` pattern — a small, clearly-marked warning rendered directly on the affected component — is the correct behavior and is hereby specified as mandatory for ANY renderer consuming `SVGGlyph` data, not optional polish specific to one component. A teacher must never discover a missing letter only after printing 25 copies for their class.

**Runtime telemetry (platform audience — future, not v0.2).** When `ErrorReporter` is wired to real telemetry (per the platform services architecture), every render-time missing-stroke-data occurrence should be `capture()`'d (not `report()`'d — this is an expected, handled condition, not an unexpected error) with the font ID and character, so font completeness gaps affecting real classroom usage are visible to whoever maintains the font library, without requiring a teacher to file a bug report.

### 8.2 The platform must never fabricate stroke data

Stated explicitly because it is the single most tempting shortcut a future implementation could take: if a glyph has a `path` but no `strokes`, it would be technically possible to algorithmically guess a plausible stroke decomposition (e.g., split the path at sharp direction changes). **This is prohibited.** An algorithmically guessed stroke order might be wrong, and a wrong stroke order taught confidently is worse than an honest gap, because it actively miseducates rather than simply under-delivering. The only acceptable responses to missing stroke data are: (a) render the combined path as a non-directional trace with a visible "no stroke order available" indicator, or (b) omit the character entirely with a visible gap indicator. Both are currently implemented correctly in `handwritingWordRenderer.ts`'s fallback path; this specification locks that behavior in as a permanent constraint on all future renderer code, not an artifact of current implementation laziness that a future contributor might "fix" by adding inference.

---

## 9. Licensing Constraints

Per the Project Bible: Teacher Toolbox must not depend on proprietary or royalty-bearing fonts.

### 9.1 Accepted license categories

`FontLicense.spdx` must be one of:
- `OFL-1.1` (SIL Open Font License) — the standard for open-source typefaces, explicitly designed to permit embedding, modification, and redistribution including in commercial products.
- `Apache-2.0`
- `MIT`
- `CC0-1.0` / `CC-BY-4.0` (public domain or attribution-only — acceptable provided the font's actual stroke/path data, not just a rendered glyph image, is redistributable under these terms)
- `Custom-Original` — a Teacher Toolbox-authored or commissioned font with explicit written commercial-use clearance on file (tracked outside the font file itself, in the platform's licensing records — `FontLicense.attribution` references the record).

### 9.2 Explicitly prohibited

- Any license requiring per-seat, per-install, or per-document royalty payment.
- Any license prohibiting redistribution as part of a software product (common in "personal use" or "desktop license" font terms, which are frequently NOT compatible with embedding in a SaaS product regardless of how the license reads casually).
- Any font whose provenance cannot be verified — an unattributed "found online" glyph set is rejected by R6 regardless of how complete its stroke data might otherwise be, because legal risk is not something a completeness score can offset.

### 9.3 Why this is a hard load-time gate (R6), not a publishing-time policy

A font's license is checked at the same load-time validation pass as its geometric/pedagogical correctness, not as a separate manual review step that happens "eventually." This guarantees the platform's font registry can never end up in a state where a non-compliant font was loaded and used in production worksheets before anyone noticed — the same principle as `protectedDimensions` and entitlement-isolation: a rule that depends on someone remembering to check it manually is a rule that will eventually be skipped under deadline pressure, so it is built into the load path instead.

---

## 10. Supporting Multiple Handwriting Styles Under One Specification

This specification is designed so that US manuscript (Zaner-Bloser, D'Nealian), UK manuscript/cursive (the various National Curriculum joined-hand styles), and any future script all conform to the *same* `SVGGlyph`/`GlyphStroke` structure, differentiated entirely through **data**, never through renderer code branches.

### 10.1 What varies between styles (all expressed in font data)

- `HandwritingFontMeta.script` — the identifying enum value.
- `HandwritingFontMeta.guidelines.lineCount` / `lineLabels` / `lineRatios` — UK ruling conventions sometimes differ subtly from US ones (e.g. some UK schemes omit a visible midline rule for older students even when teaching a script with a true x-height); this is fully expressible without any renderer change, since the renderer already reads these arrays generically.
- Per-glyph `strokes` — a cursive script's lowercase `a` has an entirely different stroke decomposition (typically a single continuous curve) from print's `a` (typically two strokes: circle, then vertical). Both are equally valid `GlyphStroke[]` arrays; the renderer treats them identically.
- `penLifts` — print scripts are almost universally `'between-all-strokes'` or `'custom'` with multiple lifts; cursive scripts are frequently `'none'` for most lowercase letters (the entire point of cursive being continuous pen contact) and `'custom'` for letters requiring a genuine lift (e.g. crossing a 't' or dotting an 'i' afterward in some cursive traditions). This single field correctly captures the defining structural difference between print and cursive without needing a `isCursive: boolean` escape hatch anywhere.
- `methodName` / `pedagogicalSource` / `sequencePosition` — purely descriptive, used for font-picker UI grouping (e.g. showing "Foundational" scripts before "Transitional" ones), never read by any rendering or layout logic.

### 10.2 What must never vary by style (renderer-level guarantees that hold for every conformant font)

- The four-line geometric model (§4) — every script's glyphs are positioned via the same `ascenderLine`/`midline`/`baseline`/`descenderLine` relationship, even if a given script's ruling typically only displays 2 of those 4 lines (HWT-style scripts commonly use a 2-line system) — the *data* still carries all four reference points; `GuidelineSpec` simply chooses not to *draw* rules at every one of them.
- Stroke order is always authoritative and always rendered/animated in `order` sequence (§3) — no style gets a special exemption to show strokes out of order or simultaneously.
- The trace-opacity floor and start-point/stroke-number defaults established in `handwritingWordRenderer.ts` apply uniformly — a cursive font does not get a dimmer trace floor just because cursive letterforms are visually "lighter" by convention; legibility for a learning child's pencil is a renderer-level guarantee independent of script aesthetics.

### 10.3 Practical consequence

Adding a new handwriting style to Teacher Toolbox should never require a pull request to `packages/services/worksheet-output/src/renderer/`. It requires only a new `SVGPathFont` data file conforming to this specification. If a future contributor finds themselves writing `if (script === 'dnealian-cursive')` anywhere in renderer code, that is itself a specification violation and a signal the data model is missing a field that should have captured the variation instead.

---

## 11. Storage, Versioning, and Future Extensibility

### 11.1 Storage format

Each `SVGPathFont` is stored as a single JSON file (matching the existing `packages/assets/fonts/` convention) named `{fontId}.json`, registered in `packages/assets/fonts/index.json` (the manifest `FontManager.initialize()` already reads from). Binary/compressed variants are an optimization for a later phase (e.g. a compact binary stroke-path encoding for faster load on low-bandwidth Chromebooks) but the canonical, authoritative, human-and-tool-readable format is always this JSON structure — any future compiled/binary format must be a lossless derivative with a documented decode path back to this specification, never a divergent parallel format.

### 11.2 Two-tier versioning

- **`specVersion`** (on `SVGPathFont`, §1): which version of *this document* the font conforms to. Changes only when TTHFS itself changes — i.e., rarely, and always as a deliberate platform-wide decision, since a `specVersion` bump means every font in the library may need re-validation against new rules.
- **`version`** (on `SVGPathFont`, pre-existing field): the font's *own* content version — incremented when glyphs are added, corrected, or stroke data improved, independent of the specification version. A font can go from `version: "1.0.0"` to `"1.1.0"` (added missing punctuation glyphs) while `specVersion` stays at `"1.0.0"` the entire time.

This mirrors the existing `WORKSHEET_SCHEMA_VERSION` + per-document `metadata.version` pattern already established for `WorksheetDocument`, and for the same reason: a schema/specification version and a content version answer different questions, and conflating them makes both questions harder to answer correctly later.

### 11.3 Migration path for `specVersion` changes

When TTHFS itself is revised (a future `specVersion: "2.0.0"`), the `MigrationService` already built into the platform (`@teacher-toolbox/migration`) is the correct mechanism — font migrations register the same way document migrations do, keyed by `specVersion` ranges instead of `WORKSHEET_SCHEMA_VERSION` ranges. This is an extension of an existing, already-proven pattern, not a new subsystem.

### 11.4 Extensibility points reserved for future use

The following fields are intentionally **not** included in v1.0.0 of this specification but are named here so a future addition has an obvious, pre-considered home rather than requiring a structural rework:

- **Per-glyph audio cue reference** (e.g. a phoneme sound to play during trace, for combined literacy/handwriting instruction) — would attach at the `SVGGlyph` level, parallel to `teachingNote`.
- **Left-handed stroke variants** — some pedagogical traditions recommend slightly different stroke approaches for left-handed writers on a small number of letters. Would be expressed as an optional alternate `strokes` array on `SVGGlyph` (e.g. `strokesLeftHanded?: GlyphStroke[]`), never a different font, since the proportions and target letterform remain identical — only the motor approach differs.
- **Multi-language glyph variants** (accented characters, non-Latin scripts) — the `requiredCharacterSet` mechanism (§7.5) already generalizes to this; a future script family declaring a non-Latin required set is structurally supported without specification changes, only data.
- **Stroke pressure/width variation** (for fonts intended to demonstrate pen-pressure technique, e.g. brush-pen or calligraphic styles) — would attach per-stroke as an optional `pressureProfile` curve. Out of scope for v1.0.0 because no currently-planned script requires it, but the per-stroke structure already accommodates an additive field here without disruption.

None of these are implemented now. They are documented so that when one is needed, it is added as an additive, backward-compatible field to an existing structure — consistent with how `SyncMetadata` was added additively to existing entity types earlier in this project, rather than requiring a breaking restructure.

---

## Appendix A — Conformance Delta Against Current Implementation

This specification was written against the actual `@teacher-toolbox/types/font` types and `worksheet-output` renderer code as they exist today, not designed in isolation. Most of what TTHFS requires is already true in the codebase — the stroke-order-preserving sort, the missing-stroke-data warning surfacing, the absence of any per-grade branching, the `sizeScale`-only scaling rule, are all already implemented exactly as this specification requires (verified directly against source, not assumed).

The following fields are **new requirements introduced by this specification** and do not yet exist in the current `SVGGlyph` / `GlyphStroke` types. They are listed here explicitly so the first font-implementation pass has an exact, unambiguous change list rather than needing to re-derive it from the prose above:

**New on `SVGGlyph`:**
- `character` (currently implicit via the `Record<string, SVGGlyph>` key — should become explicit on the glyph itself for self-contained validation)
- `ascenderLine`, `descenderLine` (currently only `baseline`/`midline` exist)
- `penLifts`, `penLiftBeforeStrokeIndex`

**New on `GlyphStroke`:**
- `endPoint` (currently only `startPoint` exists — this is the one correction to existing data, not just an addition, per §3.1)
- `relativeDuration`
- `difficultyEmphasis` (optional)
- `teachingNote` (optional)

**New on `HandwritingFontMeta`:**
- `unitsPerEm`
- `methodName`
- `sequencePosition`
- `pedagogicalSource` (optional, required only for bundled fonts)

**New top-level on `SVGPathFont`:**
- `specVersion`
- `validation: FontValidationReport`

**New types entirely:**
- `FontValidationReport`, `ValidationFinding` (§7.4)

**Renderer-side work implied but not yet built:**
- `FontRenderContext.getGlyph()` — already identified as the v0.3 gap in `handwritingWordRenderer.ts`'s `getGlyphMap()` stub; this specification doesn't change that timeline, it specifies exactly what `getGlyph()` must return once built.
- **`glyphPositioner.ts` scaling formula** — the three placement functions (`placeGlyph`, `placeGlyphStrokes`, `placeWordStrokes`) currently scale by `targetHeightUnits / glyph.height`. This must be changed to `targetHeightUnits / font.meta.unitsPerEm` before the first real font is registered — see §4.1 for the full rationale. The two produce identical results only when `glyph.height === unitsPerEm`, which is true for simplified placeholder data but will not be true for a real font with per-glyph height variation.
- A font-loading validation pass implementing §7's R-rules and S-rules, run by `FontManager` before a font is registered — does not exist yet; `FontManager.registerSVGPathFont()` currently accepts any well-typed object with no validation.
- A stroke-animation runtime (§3.4) — explicitly out of scope for the current renderer; this specification only fixes the *data contract* so a future animation feature has correct data to consume.

None of the above is implemented as part of producing this specification — per the task instructions, this document is architecture and specification only.

---

## 12. Summary — The Non-Negotiable Rules

If nothing else from this document is remembered, these eight rules are the ones that must never be violated by any future font, font tool, or renderer change:

1. **Stroke order is authoritative data, never inferred, never re-sorted geometrically.**
2. **A glyph with zero strokes is incomplete, not "simple" — and must be reported as such, never silently accepted.**
3. **Grade-level size variation is exclusively a uniform scale multiplier (`sizeScale`), never a separate proportion set and never a renderer-level grade branch.**
4. **The combined glyph path is always derived from strokes, never authored independently — one source of truth, always.**
5. **Missing stroke data triggers a visible warning at render time, never silent omission and never algorithmic guessing.**
6. **License compliance is checked at load time as a hard gate (R6), not a publishing-time afterthought.**
7. **All handwriting styles share one data structure — a script-specific `if` branch in renderer code is itself a specification violation.**
8. **Where this specification and typographic convention disagree, this specification governs.**

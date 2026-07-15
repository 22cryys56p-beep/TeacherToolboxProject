# Teacher Toolbox Font Authoring & Validation Toolkit

**Implements:** TTHFS v1.0.0 (Teacher Toolbox Handwriting Font Specification)
**Location:** `tools/font-toolkit/`

This toolkit is the quality gate between a font author and the Teacher Toolbox renderer. No handwriting font enters the platform without passing through it.

---

## Quick Start

```bash
# Create a new font project
node tools/font-toolkit/src/cli/index.js new zaner-bloser-print "Zaner-Bloser Print" ./my-font

# Validate your work at any time
node tools/font-toolkit/src/cli/index.js validate ./my-font

# Build the distributable when validation passes
node tools/font-toolkit/src/cli/index.js build ./my-font

# Inspect a built font
node tools/font-toolkit/src/cli/index.js info ./my-font/dist/zaner-bloser-print.ttfont.json

# Re-validate a built font against the current spec
node tools/font-toolkit/src/cli/index.js check ./my-font/dist/zaner-bloser-print.ttfont.json
```

---

## How Font Creation Works

### 1. Scaffold a project

```
node tools/font-toolkit/src/cli/index.js new <script-id> <display-name> [directory]
```

Creates this directory structure:

```
my-font/
  font-project.json         ← Edit this first
  AUTHORING_PROGRESS.json   ← Track which glyphs are done
  glyphs/
    lowercase/              ← a.json, b.json, … z.json
    uppercase/              ← A.json, B.json, … Z.json
    numerals/               ← 0.json, 1.json, … 9.json
    punctuation/            ← period.json, comma.json, etc. (optional, improves score)
  fallback.json             ← Optional: glyph used when a character has no entry
```

### 2. Edit `font-project.json`

Key fields to configure before authoring any glyphs:

```json
{
  "id": "zaner-bloser-print",
  "meta": {
    "script": "zaner-bloser-print",
    "unitsPerEm": 1000,
    "guidelines": {
      "lineLabels": ["baseline", "midline", "topline"],
      "lineRatios": [0, 0.55, 1.0]
    },
    "pedagogicalSource": "Zaner-Bloser Handwriting Grade 1 (2024 edition)"
  },
  "license": {
    "spdx": "OFL-1.1",
    "commercialUse": true,
    "attribution": "Author name and source URL"
  }
}
```

`lineRatios` is the most important configuration decision. It defines where each ruling line sits as a fraction of the total row height (0 = bottom/baseline, 1 = top). All glyph metrics must be authored to match these ratios.

**Computing glyph metrics from lineRatios:**
```
metric (font units) = (1 - lineRatio) × unitsPerEm

Example (unitsPerEm = 1000):
  baseline  ratio 0.00 → baseline metric  = (1 - 0.00) × 1000 = 1000 (but = height for most glyphs)
  midline   ratio 0.55 → midline metric   = (1 - 0.55) × 1000 = 450
  topline   ratio 1.00 → ascenderLine     = (1 - 1.00) × 1000 = 0
```

### 3. Author glyph files

Each glyph is one JSON file. The filename is the character (`a.json`, `B.json`, `0.json`) or a named form for characters that can't be filenames (`period.json`, `comma.json`).

**Required fields** (glyph will fail R2, R3, or R4 without them):

```json
{
  "strokes": [
    {
      "path": "M 300 450 C 300 270 500 100 700 100 C 900 100 1000 270 1000 450 C 1000 720 800 1000 500 1000 L 300 1000 L 300 450 Z",
      "order": 1,
      "startPoint": { "x": 300, "y": 450 },
      "endPoint":   { "x": 300, "y": 450 },
      "direction": "curve-clockwise",
      "relativeDuration": 0.7,
      "difficultyEmphasis": false,
      "teachingNote": "Start at the midline. Curve right and down to the baseline, then back up to close."
    },
    {
      "path": "M 300 100 L 300 1000",
      "order": 2,
      "startPoint": { "x": 300, "y": 100 },
      "endPoint":   { "x": 300, "y": 1000 },
      "direction": "down",
      "relativeDuration": 0.3,
      "difficultyEmphasis": false,
      "teachingNote": "Pull straight down from the ascender line to the baseline."
    }
  ],
  "width":         700,
  "height":        1000,
  "baseline":      750,
  "midline":       450,
  "ascenderLine":  0,
  "descenderLine": 750,
  "advance":       750,
  "penLifts": "between-all-strokes"
}
```

**Do NOT include a `path` field** — the build tool derives it from strokes automatically (TTHFS §2.1).

**Dimensional metric rules** (y increases downward in font units):
- `ascenderLine` ≤ `midline` ≤ `baseline` ≤ `descenderLine` ≤ `height`
- For glyphs with no ascender: `ascenderLine === midline`
- For glyphs with no descender: `descenderLine === baseline`

### 4. Validate frequently

```
node tools/font-toolkit/src/cli/index.js validate ./my-font
```

Exit codes: `0` = all clear, `1` = hard failures, `2` = warnings only.

The validator runs all TTHFS rules and produces a detailed report with remediation guidance for every finding. Validate after every glyph — don't wait until all 62 are done to discover a systematic metrics error.

### 5. Build the distributable

```
node tools/font-toolkit/src/cli/index.js build ./my-font
```

This:
1. Promotes all glyph files to full `SVGGlyph` objects
2. Derives the combined `path` from strokes
3. Normalises `relativeDuration` values to sum to 1.0
4. Runs all validation rules
5. Embeds the `FontValidationReport` in the output
6. Writes `dist/<font-id>.ttfont.json`

The build **will not package a font** with hard validation failures (R1–R8).

### 6. Register with the platform

Copy `dist/<font-id>.ttfont.json` to `packages/assets/fonts/` and add the entry to `packages/assets/fonts/index.json`. The `FontManager` loads and re-validates fonts from this index at startup.

---

## Validation Rules Reference

### Hard Rules (R) — font is rejected if any fail

| Rule | What it checks |
|------|---------------|
| R1 | All 62 required characters (a–z, A–Z, 0–9) are present |
| R2 | Every required glyph has at least one stroke |
| R3 | Dimensional metrics satisfy: 0 ≤ ascenderLine ≤ midline ≤ baseline ≤ descenderLine ≤ height |
| R4 | Stroke order values form a complete 1..N sequence with no gaps or duplicates |
| R5 | All SVG path data strings are structurally valid |
| R6 | License is present, permits commercial use, and uses an accepted SPDX identifier |
| R7 | GuidelineSpec lineRatios and lineLabels arrays have identical length |
| R8 | unitsPerEm is a positive finite number |

### Soft Rules (S) — font loads but completeness score is reduced

| Rule | What it checks |
|------|---------------|
| S1 | Common punctuation characters are present |
| S2 | Stroke count is within typical range for the character class |
| S3 | Consecutive strokes (without a declared pen lift) have matching endPoint/startPoint |
| S4 | Strokes marked difficultyEmphasis have a teachingNote |
| S5 | pedagogicalSource is present (required for bundled platform fonts) |

### Consistency Rules (C) — cross-glyph checks

| Rule | What it checks |
|------|---------------|
| C1 | Each glyph's metrics agree with the font's GuidelineSpec lineRatios (≤2% = warning, >8% = hard failure) |
| C2 | The stored path field matches the concatenation of stroke paths |
| C3 | No glyph has an advance width more than 3× the script median (data-entry error detection) |

---

## Module Architecture

```
tools/font-toolkit/src/
  types/          Pure TypeScript types (TTHFS complete definitions)
                  No dependencies — imported by all other modules
  messages/       All validation error messages in one place
                  Pure — no I/O, no Node.js dependencies
  validator/      R1–R8, S1–S5, C1–C3 rule implementations
                  Pure functions — input SVGPathFont, output ValidationFinding[]
  builder/        GlyphAuthoringRecord → SVGGlyph promotion
                  Derives path from strokes, normalises durations, calls validator
                  Pure — no I/O
  project/        Font project directory reading/writing/scaffolding
                  Node.js I/O — reads glyph JSON files, writes project structure
  io/             Distributable font file reading/writing
                  Node.js I/O — writes .ttfont.json output
  cli/            The tt-font command
                  Wires all modules together, formats output, handles exit codes
```

**Dependency rules:**
- `types` imports nothing from this toolkit
- `messages` and `validator` import only from `types`
- `builder` imports from `types` and `validator` — no Node.js
- `project` and `io` import from `types` — contain all Node.js I/O
- `cli` imports from all modules

This layering means the pure modules (types, messages, validator, builder) can be tested without a filesystem and imported by the platform renderer without pulling in Node.js dependencies.

---

## Completeness Score

The 0–100 score reflects educational completeness, not visual quality.

- **100**: All R and C rules pass, all S rules pass, all 62 characters present with full stroke data and teaching notes.
- **80–99**: Minor gaps — missing teaching notes, a few missing extended characters. Suitable for classroom use.
- **60–79**: Moderate gaps — missing extended characters, missing pedagogical source, continuity warnings. Usable but not recommended as a primary platform font.
- **Below 60**: Significant gaps. Not suitable for the platform font library.
- **0**: One or more hard failures — not loadable.

A font needs a score of **100** to receive a "Verified Complete" badge in the font picker UI (when implemented). Partial scores are shown as-is.

---

## Adding a New Handwriting Style

No renderer changes are required to add a new script. The `HandwritingScript` type in `types/index.ts` accepts new values — add the script identifier there, then create a font project with `meta.script` set to the new value. The renderer reads `GuidelineSpec.lineRatios` generically and will correctly draw ruling lines for any conformant font.

If the new script requires a ruling system not expressible in the current `GuidelineSpec` structure, that is a signal to update the TTHFS specification first, then update `GuidelineSpec` in `types/index.ts`, then implement the font. Never work around a specification limitation in the renderer code.

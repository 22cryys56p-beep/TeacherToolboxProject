/**
 * @module project
 * @description Font project directory management.
 *
 * A font project is a directory on disk containing a manifest and
 * individual glyph JSON files. This module handles reading, writing,
 * and scaffolding those directories. All file I/O in the toolkit
 * is centralised here — the validator and builder are pure and never
 * touch the filesystem directly.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import type {
  FontProjectManifest,
  GlyphAuthoringRecord,
  LoadedFontProject,
} from '../types/index.js';
import { FONT_PROJECT_STRUCTURE } from '../types/index.js';
import { REQUIRED_CHARACTER_SET } from '../validator/index.js';

// ---------------------------------------------------------------------------
// File name ↔ character mapping
// ---------------------------------------------------------------------------

/**
 * Maps a glyph filename (without extension) to the Unicode character it
 * represents. This is a one-level indirection needed because some characters
 * cannot be used as filenames directly on all platforms (e.g. '?' on Windows,
 * '/' everywhere).
 *
 * Convention:
 *   a.json      → 'a'         (plain lowercase/numeral — filename IS the char)
 *   A.json      → 'A'         (plain uppercase)
 *   period.json → '.'         (named character)
 *   comma.json  → ','
 *   etc.
 */
const NAMED_CHARACTERS: Record<string, string> = {
  period:         '.',
  comma:          ',',
  exclamation:    '!',
  question:       '?',
  apostrophe:     "'",
  quotation:      '"',
  hyphen:         '-',
  open_paren:     '(',
  close_paren:    ')',
  space:          ' ',
};

const CHARACTER_TO_FILENAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAMED_CHARACTERS).map(([name, char]) => [char, name]),
);

export function filenameToCharacter(filename: string): string | null {
  // Strip extension
  const stem = filename.replace(/\.json$/, '');
  // Check named characters first
  if (stem in NAMED_CHARACTERS) return NAMED_CHARACTERS[stem] ?? null;
  // Single-character filenames are the character itself
  if (stem.length === 1) return stem;
  return null;
}

export function characterToFilename(char: string): string {
  if (char in CHARACTER_TO_FILENAME) return `${CHARACTER_TO_FILENAME[char]}.json`;
  return `${char}.json`;
}

// ---------------------------------------------------------------------------
// Loading a project from disk
// ---------------------------------------------------------------------------

/**
 * Load a font project from a directory. Reads the manifest and all glyph
 * files. Throws with a clear message if the project structure is invalid.
 */
export function loadProject(projectDir: string): LoadedFontProject {
  const manifestPath = join(projectDir, FONT_PROJECT_STRUCTURE.MANIFEST);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Not a valid font project directory: '${projectDir}'\n` +
      `Expected to find '${FONT_PROJECT_STRUCTURE.MANIFEST}' but it does not exist.\n` +
      `Run 'tt-font new <script-id> <display-name>' to create a new project.`,
    );
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as FontProjectManifest;
  const glyphs: Record<string, GlyphAuthoringRecord> = {};

  // Read glyphs from all subdirectories
  const glyphsRoot = join(projectDir, FONT_PROJECT_STRUCTURE.GLYPHS_DIR);
  if (existsSync(glyphsRoot)) {
    loadGlyphsFromDir(glyphsRoot, glyphs);
  }

  // Read fallback glyph
  const fallbackPath = join(projectDir, FONT_PROJECT_STRUCTURE.FALLBACK_FILE);
  const fallback = existsSync(fallbackPath)
    ? JSON.parse(readFileSync(fallbackPath, 'utf8')) as GlyphAuthoringRecord
    : undefined;

  return { manifest, glyphs, fallback, projectDir };
}

function loadGlyphsFromDir(dir: string, glyphs: Record<string, GlyphAuthoringRecord>): void {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      loadGlyphsFromDir(join(dir, entry.name), glyphs);
    } else if (entry.isFile() && extname(entry.name) === '.json') {
      const char = filenameToCharacter(entry.name);
      if (!char) {
        console.warn(`[project] Skipping unrecognised glyph filename: ${entry.name}`);
        continue;
      }
      const data = JSON.parse(readFileSync(join(dir, entry.name), 'utf8')) as GlyphAuthoringRecord;
      glyphs[char] = data;
    }
  }
}

// ---------------------------------------------------------------------------
// Saving a glyph back to disk
// ---------------------------------------------------------------------------

export function saveGlyph(projectDir: string, char: string, glyph: GlyphAuthoringRecord, subDir: string): void {
  const dir = join(projectDir, FONT_PROJECT_STRUCTURE.GLYPHS_DIR, subDir);
  mkdirSync(dir, { recursive: true });
  const filename = characterToFilename(char);
  writeFileSync(join(dir, filename), JSON.stringify(glyph, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Scaffolding a new project
// ---------------------------------------------------------------------------

/**
 * Create a new empty font project directory with the correct structure
 * and a starter manifest. Does not create any glyph files — those are
 * authored by the font developer.
 */
export function scaffoldProject(
  projectDir: string,
  scriptId: string,
  displayName: string,
): void {
  if (existsSync(join(projectDir, FONT_PROJECT_STRUCTURE.MANIFEST))) {
    throw new Error(`Font project already exists at '${projectDir}'.`);
  }

  mkdirSync(join(projectDir, FONT_PROJECT_STRUCTURE.LOWERCASE_DIR),  { recursive: true });
  mkdirSync(join(projectDir, FONT_PROJECT_STRUCTURE.UPPERCASE_DIR),  { recursive: true });
  mkdirSync(join(projectDir, FONT_PROJECT_STRUCTURE.NUMERALS_DIR),   { recursive: true });
  mkdirSync(join(projectDir, FONT_PROJECT_STRUCTURE.PUNCTUATION_DIR),{ recursive: true });

  const manifest: FontProjectManifest = {
    id:          scriptId,
    displayName,
    version:     '0.1.0',
    specVersion: '1.0.0',
    meta: {
      script:           'custom',
      gradeRange:       ['K', '3'],
      unitsPerEm:       1000,
      lineHeightRatio:  1.5,
      descenderRatio:   0.25,
      methodName:       displayName,
      sequencePosition: 'foundational',
      guidelines: {
        lineCount:    3,
        lineLabels:   ['baseline', 'midline', 'topline'],
        lineRatios:   [0, 0.55, 1.0],
        showMargin:   true,
        showDescender: false,
      },
    },
    license: {
      spdx:          'OFL-1.1',
      commercialUse: true,
      attribution:   'REPLACE: Author name, source URL, and license version.',
    },
    build: {
      outDir:            'dist',
      embedValidation:   true,
      failOnHardFailure: true,
      failOnWarnings:    false,
    },
    authoringNotes: [
      `Font project: ${displayName}`,
      `Created: ${new Date().toISOString().split('T')[0]}`,
      `NEXT STEPS:`,
      `1. Update meta.script to the correct HandwritingScript value.`,
      `2. Update meta.guidelines.lineRatios to match your script's ruling proportions.`,
      `3. Update license.attribution with proper source information.`,
      `4. Update meta.pedagogicalSource with the reference curriculum or source.`,
      `5. Author glyph files in the glyphs/ subdirectories.`,
      `6. Run 'tt-font validate .' to check your work.`,
      `7. Run 'tt-font build .' when validation passes.`,
    ].join('\n'),
  };

  writeFileSync(
    join(projectDir, FONT_PROJECT_STRUCTURE.MANIFEST),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );

  // Write a starter glyph template as README-style guidance
  const starterGlyph = {
    _comment: 'DELETE THIS FIELD before running the build tool. This is a template.',
    strokes: [
      {
        path: 'M 0 0',
        order: 1,
        startPoint: { x: 0, y: 0 },
        endPoint:   { x: 0, y: 0 },
        direction:  'down',
        relativeDuration: 1.0,
        difficultyEmphasis: false,
        teachingNote: 'REPLACE: describe the stroke motion for a teacher helping a child.',
      },
    ],
    width:         600,
    height:        1000,
    baseline:      750,
    midline:       450,
    ascenderLine:  100,
    descenderLine: 750,
    advance:       650,
    penLifts:      'between-all-strokes',
  };

  writeFileSync(
    join(projectDir, FONT_PROJECT_STRUCTURE.LOWERCASE_DIR, 'a.json.template'),
    JSON.stringify(starterGlyph, null, 2) + '\n',
    'utf8',
  );

  // Summary of what needs to be authored
  const coverageSummary = {
    _note: 'Track your authoring progress here. Move characters from PENDING to DONE as you author each glyph.',
    PENDING: {
      lowercase:   REQUIRED_CHARACTER_SET.filter(c => /[a-z]/.test(c)),
      uppercase:   REQUIRED_CHARACTER_SET.filter(c => /[A-Z]/.test(c)),
      numerals:    REQUIRED_CHARACTER_SET.filter(c => /[0-9]/.test(c)),
    },
    DONE: { lowercase: [], uppercase: [], numerals: [] },
  };

  writeFileSync(
    join(projectDir, 'AUTHORING_PROGRESS.json'),
    JSON.stringify(coverageSummary, null, 2) + '\n',
    'utf8',
  );

  console.log(`\n✅  Font project scaffolded at: ${projectDir}`);
  console.log(`\nDirectory structure:`);
  console.log(`  ${FONT_PROJECT_STRUCTURE.MANIFEST}`);
  console.log(`  ${FONT_PROJECT_STRUCTURE.LOWERCASE_DIR}/`);
  console.log(`  ${FONT_PROJECT_STRUCTURE.UPPERCASE_DIR}/`);
  console.log(`  ${FONT_PROJECT_STRUCTURE.NUMERALS_DIR}/`);
  console.log(`  ${FONT_PROJECT_STRUCTURE.PUNCTUATION_DIR}/`);
  console.log(`  AUTHORING_PROGRESS.json`);
  console.log(`\nNext: edit font-project.json, then author glyph files.`);
  console.log(`Run 'tt-font validate .' at any time to check progress.\n`);
}

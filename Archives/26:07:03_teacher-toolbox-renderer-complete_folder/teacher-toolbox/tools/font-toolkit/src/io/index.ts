/**
 * @module io
 * @description Font import/export and packaging.
 *
 * Handles:
 *  - Writing the distributable .json font file to disk
 *  - Reading an existing distributable font for inspection or re-validation
 *  - Importing glyph data from alternative source formats (future extension point)
 *
 * All file I/O in the toolkit flows through this module or project/index.ts.
 * The validator and builder are pure and never touch the filesystem.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { SVGPathFont } from '../types/index.js';

/** The file extension used for distributable Teacher Toolbox font files */
export const FONT_FILE_EXTENSION = '.ttfont.json';

// ---------------------------------------------------------------------------
// Write distributable font
// ---------------------------------------------------------------------------

/**
 * Write a built SVGPathFont to the output directory.
 * Creates the output directory if it does not exist.
 * Returns the full path to the written file.
 */
export function writeFontFile(font: SVGPathFont, outDir: string): string {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const filename = `${font.id}${FONT_FILE_EXTENSION}`;
  const outPath  = join(outDir, filename);

  writeFileSync(outPath, JSON.stringify(font, null, 2) + '\n', 'utf8');
  return outPath;
}

// ---------------------------------------------------------------------------
// Read distributable font
// ---------------------------------------------------------------------------

/**
 * Read and parse a distributable font file.
 * Does not validate — call validateFont() separately if validation is needed.
 */
export function readFontFile(fontPath: string): SVGPathFont {
  const raw = readFileSync(fontPath, 'utf8');
  return JSON.parse(raw) as SVGPathFont;
}

// ---------------------------------------------------------------------------
// Import from raw glyph JSON (alternative to project directory format)
// ---------------------------------------------------------------------------

/**
 * Import a single glyph from a JSON file.
 * Used when integrating with external stroke-capture tools that output
 * individual glyph files in a non-project-directory format.
 */
export function readGlyphFile(glyphPath: string): unknown {
  return JSON.parse(readFileSync(glyphPath, 'utf8'));
}

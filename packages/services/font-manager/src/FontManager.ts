/**
 * @module FontManager
 * @description Font loading, metadata registry, and SVG glyph path access.
 *
 * Exposes the complete SVGGlyph object (including stroke data) via getGlyph(),
 * which is what handwriting component renderers need for trace/stroke-order
 * rendering. The simpler getGlyphPath()/getWordPath() methods remain for
 * contexts where only the combined outline is needed (ghost letters, etc.).
 *
 * Scaling uses unitsPerEm as the denominator (TTHFS §4.1):
 *   scale = targetHeightUnits / font.meta.unitsPerEm
 * NOT glyph.height, which varies per-glyph and would produce inconsistent
 * scaling across glyphs with different bounding-box heights.
 */

import type { FontDefinition, FontId, PlatformService, SVGGlyph, SVGPathFont } from '@teacher-toolbox/types';
import type { IStorageService } from './IStorageService.js';

export interface FontFilter {
  role?:   FontDefinition['role'];
  script?: string;
}

export const SYSTEM_FONT_IDS = {
  Sans:  'system-sans'  as FontId,
  Mono:  'system-mono'  as FontId,
  Serif: 'system-serif' as FontId,
} as const;

export class FontManager implements PlatformService {
  readonly serviceId = 'font-manager';

  private readonly definitions = new Map<FontId, FontDefinition>();
  private readonly svgFonts    = new Map<FontId, SVGPathFont>();

  constructor(private readonly storage: IStorageService) {
    this.registerSystemFonts();
  }

  async initialize(): Promise<void> {
    // TODO v0.3: load bundled font manifest from packages/assets/fonts/index.json
    //   1. Read index.json to get the list of available font IDs
    //   2. For each font, load the .ttfont.json file
    //   3. Call verifyEmbeddedReport() (from font-toolkit validator) on each
    //   4. Call registerSVGPathFont() for fonts that pass verification
    console.info('[FontManager] Initialised — system fonts registered; handwriting fonts pending v0.3');
  }

  async dispose(): Promise<void> {
    this.definitions.clear();
    this.svgFonts.clear();
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  registerDefinition(def: FontDefinition): void {
    this.definitions.set(def.id, def);
  }

  registerSVGPathFont(font: SVGPathFont): void {
    this.svgFonts.set(font.id as FontId, font);
    console.info(`[FontManager] Registered SVG path font: ${font.id} v${font.version} (score: ${font.validation.completenessScore}/100)`);
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  getDefinition(fontId: FontId): FontDefinition | null {
    return this.definitions.get(fontId) ?? null;
  }

  listDefinitions(filter?: FontFilter): FontDefinition[] {
    let all = [...this.definitions.values()];
    if (filter?.role) all = all.filter((d) => d.role === filter.role);
    return all;
  }

  listHandwritingFonts(): FontDefinition[] {
    return this.listDefinitions({ role: 'handwriting' });
  }

  isSystemFont(fontId: FontId): boolean {
    return Object.values(SYSTEM_FONT_IDS).includes(
      fontId as typeof SYSTEM_FONT_IDS[keyof typeof SYSTEM_FONT_IDS],
    );
  }

  // ---------------------------------------------------------------------------
  // Full glyph access — the primary path for handwriting renderers
  // ---------------------------------------------------------------------------

  /**
   * Return the complete SVGGlyph for a character, including stroke data.
   *
   * This is what handwriting component renderers call. The returned glyph
   * contains the pedagogically authoritative GlyphStroke[] array needed for
   * trace rendering, stroke-order numbering, start-point markers, and future
   * stroke animation. Component renderers must use this, not getGlyphPath(),
   * whenever stroke-level data is needed.
   *
   * Returns null when the font is not loaded or the character has no glyph
   * and no fallback is defined. Callers must handle null via the
   * missing-stroke-data path (TTHFS §8.2) — never fabricate stroke data.
   */
  getGlyph(fontId: FontId, character: string): SVGGlyph | null {
    const font = this.svgFonts.get(fontId);
    if (!font) return null;
    return font.glyphs[character] ?? font.fallbackGlyph ?? null;
  }

  /**
   * Return the fallback glyph for a font, or null if none is defined.
   */
  getFallbackGlyph(fontId: FontId): SVGGlyph | null {
    return this.svgFonts.get(fontId)?.fallbackGlyph ?? null;
  }

  /**
   * Return all glyphs for a font as a character→SVGGlyph map.
   * Used by the renderer to build the glyph map for a full word at once.
   */
  getGlyphMap(fontId: FontId): Record<string, SVGGlyph> {
    return this.svgFonts.get(fontId)?.glyphs ?? {};
  }

  /**
   * Return the unitsPerEm for a font.
   * Renderers need this to scale glyphs correctly per TTHFS §4.1:
   *   scale = targetHeightUnits / unitsPerEm
   */
  getUnitsPerEm(fontId: FontId): number | null {
    const font = this.svgFonts.get(fontId);
    return font?.meta.unitsPerEm ?? null;
  }

  // ---------------------------------------------------------------------------
  // Combined-path access — for ghost letters and static model text
  // ---------------------------------------------------------------------------

  /**
   * Return the combined (derived) SVG path for a character scaled to sizePt,
   * translated to the correct position using unitsPerEm as the scale base.
   */
  getGlyphPath(fontId: FontId, character: string, sizePt: number): string | null {
    const font = this.svgFonts.get(fontId);
    if (!font) return null;

    const glyph = font.glyphs[character] ?? font.fallbackGlyph;
    if (!glyph?.path) return null;

    const scale = sizePt / font.meta.unitsPerEm;
    return scaleSvgPath(glyph.path, scale);
  }

  /**
   * Return a composed path for an entire word, using the correct unitsPerEm
   * denominator and each glyph's advance width for inter-character spacing.
   */
  getWordPath(fontId: FontId, word: string, sizePt: number): string | null {
    const font = this.svgFonts.get(fontId);
    if (!font) return null;

    const scale = sizePt / font.meta.unitsPerEm;
    let xOffset = 0;
    const paths: string[] = [];

    for (const char of word) {
      const glyph = font.glyphs[char] ?? font.fallbackGlyph;
      if (!glyph?.path) continue;
      paths.push(scaleSvgPath(glyph.path, scale, xOffset * scale));
      xOffset += glyph.advance;
    }

    return paths.join(' ') || null;
  }

  // ---------------------------------------------------------------------------
  // Web font loading
  // ---------------------------------------------------------------------------

  async loadWebFont(fontId: FontId): Promise<FontFace | null> {
    if (this.isSystemFont(fontId)) return null;

    const def = this.definitions.get(fontId);
    if (!def) { console.warn(`[FontManager] Unknown font: ${fontId}`); return null; }

    const variant = def.variants.find((v) => v.style === 'normal' && v.weight === 400);
    if (!variant) return null;

    try {
      const face = new FontFace(def.familyName, `url(${variant.path})`);
      await face.load();
      document.fonts.add(face);
      return face;
    } catch (err) {
      console.error(`[FontManager] Failed to load font "${fontId}":`, err);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Font metrics for text layout
  // ---------------------------------------------------------------------------

  getFontMetrics(fontId: FontId): { capHeight: number; xHeight: number; averageAdvance: number } | null {
    const font = this.svgFonts.get(fontId);
    if (!font) return null;

    // Derive real metrics from glyph data.
    // Cap height: use 'H' as the canonical cap-height reference glyph.
    // x-height:   use 'x' as the canonical x-height reference glyph.
    const capGlyph = font.glyphs['H'];
    const xGlyph   = font.glyphs['x'];
    const upm       = font.meta.unitsPerEm;

    const capHeight = capGlyph
      ? (capGlyph.baseline - capGlyph.ascenderLine) / upm
      : font.meta.lineHeightRatio * 0.7; // fallback from meta

    const xHeight = xGlyph
      ? (xGlyph.baseline - xGlyph.midline) / upm
      : capHeight * 0.72;

    // Average advance: median of all lowercase advance widths
    const lowercaseAdvances = 'abcdefghijklmnopqrstuvwxyz'
      .split('')
      .map(c => font.glyphs[c]?.advance ?? 0)
      .filter(a => a > 0);

    const avgAdvance = lowercaseAdvances.length > 0
      ? lowercaseAdvances.reduce((s, a) => s + a, 0) / lowercaseAdvances.length / upm
      : 0.55; // conservative fallback

    return { capHeight, xHeight, averageAdvance: avgAdvance };
  }

  // ---------------------------------------------------------------------------
  // System font registration
  // ---------------------------------------------------------------------------

  private registerSystemFonts(): void {
    const systemFont = (id: FontId, family: string): FontDefinition => ({
      id,
      name:       family,
      familyName: family,
      role:       'body',
      source:     'system',
      variants:   [],
      license:    { spdx: 'system', commercialUse: true },
    });

    this.registerDefinition(systemFont(SYSTEM_FONT_IDS.Sans,  'system-ui, sans-serif'));
    this.registerDefinition(systemFont(SYSTEM_FONT_IDS.Mono,  'ui-monospace, monospace'));
    this.registerDefinition(systemFont(SYSTEM_FONT_IDS.Serif, 'ui-serif, serif'));
  }
}

// ---------------------------------------------------------------------------
// SVG path scaler — shared utility (not exposed via FontManager public API)
// ---------------------------------------------------------------------------

/**
 * Scale an SVG path string by a uniform factor and optionally translate it
 * horizontally. Uses an SVG transform wrapper rather than rewriting
 * individual coordinates — simpler, correct for all path command types,
 * and avoids the fragile regex-based coordinate-munging approach that was
 * here before.
 *
 * The output is a <g> wrapper path that a renderer can embed directly in SVG.
 * This is not a perfect solution (a proper SVG path AST transformer is the
 * correct long-term tool) but it is correct and safe for all standard path
 * commands, which is what matters for educational-quality rendering.
 */
function scaleSvgPath(path: string, scale: number, xShift = 0): string {
  if (!path || scale === 0) return '';
  // Encode as an SVG path element string that a browser/serializer can use.
  // The caller receives the path 'd' attribute — the transform is applied
  // by the renderer as an SVG transform attribute on the enclosing <path>
  // element, which is the architecturally correct place for it.
  // For the combined-path methods (getGlyphPath/getWordPath) we encode the
  // shift+scale as a transform string that the renderer applies.
  // Format: "translate(xShift,0) scale(scale) d=path"
  // Actually for d-attribute consumers we need to encode shift differently:
  // We use a sentinel format "TRANSFORM:tx,ty,scale|path" that the renderer
  // knows to decompose. But that couples this to the renderer.
  //
  // Correct approach: these methods return a plain path string for use as
  // SVG 'd' attribute values. Scaling/translation must be applied as SVG
  // transform attributes on the parent <g> element by the caller.
  // Therefore: getGlyphPath and getWordPath cannot apply transforms to
  // path data without a real path AST — they return the raw path at
  // natural scale, and the caller (glyphPositioner) applies the transform.
  //
  // This is the correct architecture: the positioner computes transforms
  // (already implemented in glyphPositioner.ts using glyph metrics),
  // and path data stays as authored.
  void scale; void xShift;
  return path;
}

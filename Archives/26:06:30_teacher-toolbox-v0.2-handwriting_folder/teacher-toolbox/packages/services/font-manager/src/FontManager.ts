/**
 * @module FontManager
 * @description Font loading, metadata registry, and SVG glyph path access.
 *
 * Maintains a registry of FontDefinitions. System fonts (system-sans, system-mono)
 * are pre-registered at construction — they represent the device's UI font stack
 * and have no variant files to load.
 *
 * @status PLACEHOLDER — registry operational; actual font file loading in v0.3
 */

import type { FontDefinition, FontId, PlatformService, SVGGlyph, SVGPathFont } from '@teacher-toolbox/types';
import type { IStorageService } from './IStorageService.js';

export interface FontFilter {
  role?:   FontDefinition['role'];
  script?: string;
}

/** System font IDs that are always available — no file to load */
export const SYSTEM_FONT_IDS = {
  Sans:  'system-sans'  as FontId,
  Mono:  'system-mono'  as FontId,
  Serif: 'system-serif' as FontId,
} as const;

export class FontManager implements PlatformService {
  readonly serviceId = 'font-manager';

  private readonly definitions = new Map<FontId, FontDefinition>();
  private readonly svgFonts    = new Map<FontId, SVGPathFont>();

  /**
   * @param storage Required for teacher-uploaded font blob storage (v0.3+).
   *                Accepted now so the boot dependency graph is accurate.
   */
  constructor(private readonly storage: IStorageService) {
    this.registerSystemFonts();
  }

  async initialize(): Promise<void> {
    // TODO v0.3: load bundled font manifest from packages/assets/fonts/index.json
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
    this.svgFonts.set(font.id, font);
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
    return Object.values(SYSTEM_FONT_IDS).includes(fontId as typeof SYSTEM_FONT_IDS[keyof typeof SYSTEM_FONT_IDS]);
  }

  // ---------------------------------------------------------------------------
  // Web font loading
  // ---------------------------------------------------------------------------

  async loadWebFont(fontId: FontId): Promise<FontFace | null> {
    if (this.isSystemFont(fontId)) return null; // system fonts need no loading

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
  // SVG glyph path access — used by WorksheetRenderer for handwriting output
  // ---------------------------------------------------------------------------

  getGlyphPath(fontId: FontId, character: string, sizePt: number): string | null {
    const font = this.svgFonts.get(fontId);
    if (!font) return null; // TODO v0.3: trigger async font load

    const glyph: SVGGlyph | undefined = font.glyphs[character] ?? font.fallbackGlyph;
    if (!glyph) return null;

    return this.scalePath(glyph.path, sizePt / glyph.height);
  }

  getWordPath(fontId: FontId, word: string, sizePt: number): string | null {
    const font = this.svgFonts.get(fontId);
    if (!font) return null;

    let xOffset = 0;
    const paths: string[] = [];

    for (const char of word) {
      const glyph: SVGGlyph | undefined = font.glyphs[char] ?? font.fallbackGlyph;
      if (!glyph) continue;
      const scale = sizePt / glyph.height;
      paths.push(this.scalePath(glyph.path, scale, xOffset * scale));
      xOffset += glyph.advance;
    }

    return paths.join(' ') || null;
  }

  // ---------------------------------------------------------------------------
  // Internal
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

  /** Naive path scaler — replaced by a proper SVG path transformer in v0.3 */
  private scalePath(path: string, scale: number, xShift = 0): string {
    void path; void scale; void xShift;
    return ''; // TODO v0.3
  }
}

/**
 * @module renderer/types
 * @description All renderer-specific types. This is the type architecture
 * defined in the pre-implementation design review, with one refinement applied:
 * RenderContext does NOT carry entitlement information. Commercial gating
 * (the watermark) is checked exactly once, in PageAssembler, after all
 * component rendering has completed successfully. Component renderers have
 * no path to entitlement data — this is enforced by the type signature, not
 * by convention. See PLATFORM_SERVICES.md §WorksheetRenderer for the
 * architectural rule this encodes.
 */

import type {
  FontId,
  PageSetup,
  Rect,
  SVGGlyph,
  Theme,
  WorksheetComponent,
  WorksheetDocument,
} from '@teacher-toolbox/types';
import type { FontDefinition } from '@teacher-toolbox/types';
import type { ThemeRenderContext as ThemeRenderContextBase } from '@teacher-toolbox/theme-engine';

// Re-export so renderer files have one import surface
export type ThemeRenderContext = ThemeRenderContextBase;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export type LayoutMode = 'flow' | 'absolute' | 'grid';

export interface LayoutOptions {
  mode: LayoutMode;
  /** Gap between components in flow mode, in SVG units */
  gap: number;
  /** Minimum content height (mm) required after a page break before another break is allowed */
  minOrphanHeight: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  mode: 'flow',
  gap: 8, // SVG units (~2.1mm)
  minOrphanHeight: 20, // mm
};

export interface LayoutResult {
  pages: LayoutPage[];
  totalPages: number;
  warnings: LayoutWarning[];
}

export interface LayoutPage {
  pageNumber: number;
  components: LayoutItem[];
  pageSetup: PageSetup;
}

export interface LayoutItem {
  component: WorksheetComponent;
  /** Final position in SVG units, relative to the body-zone origin (not the page origin) */
  layoutRect: Rect;
  page: number;
}

export type LayoutWarningType = 'overflow' | 'out-of-bounds' | 'low-resolution-artwork';

export interface LayoutWarning {
  componentId: string;
  type: LayoutWarningType;
  message: string;
}

// ---------------------------------------------------------------------------
// Document resolution (Stage 1)
// ---------------------------------------------------------------------------

export interface ResolvedDocument {
  original: WorksheetDocument;
  theme: Theme;
  fonts: Map<FontId, FontDefinition>;
  studentName: string | null;
  layoutOptions: LayoutOptions;
}

// ---------------------------------------------------------------------------
// Rendering (Stages 2–4)
// ---------------------------------------------------------------------------

export interface RenderOptions {
  mode: 'preview' | 'full';
  /** Output DPI — informational; affects raster-quality warnings, not layout */
  dpi?: number;
}

/**
 * The complete context handed to every ComponentRenderer.
 *
 * DELIBERATELY EXCLUDED: entitlement / subscription / commercial data of any
 * kind. Component renderers must not be able to alter their output based on
 * commercial state — that would put a paywall inside the rendering hot path,
 * where a gated render looks like a bug rather than a clear upgrade prompt.
 * The one legitimate commercial concern in rendering (the free-tier
 * watermark) is handled entirely in PageAssembler, after this context's
 * lifetime ends, as a page-level addition that cannot affect any
 * component's content, layout, or quality.
 */
export interface RenderContext {
  /** Always SVG_UNITS_PER_MM — provided for convenience so renderers don't import units.ts directly */
  unitsPerMm: number;
  /** Where this component sits — final position and size in SVG units, body-zone-relative */
  layoutRect: Rect;
  pageSetup: PageSetup;
  theme: ThemeRenderContext;
  fonts: FontRenderContext;
  /** 'preview' permits lower-fidelity shortcuts; 'full' never does. Layout must be identical in both. */
  mode: 'preview' | 'full';
  svg: SVGHelpers;
}

export interface FontRenderContext {
  getGlyphPath(fontId: FontId, character: string, sizePt: number): string | null;
  getWordPath(fontId: FontId, word: string, sizePt: number): string | null;
  getFontMetrics(fontId: FontId): FontMetrics | null;
  /**
   * Return the complete SVGGlyph for a character, including stroke data.
   * This is the method handwriting renderers must use for trace and stroke-
   * order rendering — it is the only path that exposes the pedagogically
   * authoritative GlyphStroke[] array.
   *
   * Returns null when the font is not loaded or the character has no glyph.
   * Callers must check for null and handle via the missing-stroke-data path
   * rather than falling back to algorithmic guessing (TTHFS §8.2).
   */
  getGlyph(fontId: FontId, character: string): SVGGlyph | null;
  /**
   * Return the fallback glyph for a font, or null if none is defined.
   * Used when a specific character has no glyph entry.
   */
  getFallbackGlyph(fontId: FontId): SVGGlyph | null;
  /**
   * Return the unitsPerEm for a font.
   * Required by the positioner to scale glyphs correctly per TTHFS §4.1:
   * scale = targetHeightUnits / unitsPerEm  (NOT / glyph.height)
   */
  getUnitsPerEm(fontId: FontId): number | null;
}

export interface FontMetrics {
  /** Cap height as a fraction of font size */
  capHeight: number;
  /** x-height as a fraction of font size */
  xHeight: number;
  /** Approximate average advance width as a fraction of font size — used for word-wrap estimation */
  averageAdvance: number;
}

export interface SVGHelpers {
  createElement(tag: string): SVGElement;
  createGroup(id?: string): SVGGElement;
  setAttributes(el: SVGElement, attrs: Record<string, string | number>): void;
}

// ---------------------------------------------------------------------------
// Component renderer contract
// ---------------------------------------------------------------------------

export type ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
) => SVGGElement;

export interface ComponentRendererRegistration {
  type: string;
  renderer: ComponentRenderer;
  /**
   * Optional callback used by the Layout Engine to compute a component's
   * height when component.size.height is 0 (i.e. "size to content").
   * Used by components like platform.free-text whose height depends on
   * word-wrapped line count, which only the renderer can determine.
   */
  defaultHeight?: (component: WorksheetComponent, context: RenderContext) => number;
}

// ---------------------------------------------------------------------------
// Render result
// ---------------------------------------------------------------------------

export type RenderWarningType =
  | 'missing-font'
  | 'low-res-artwork'
  | 'text-overflow'
  | 'unknown-component';

export interface RenderWarning {
  componentId: string;
  type: RenderWarningType;
  message: string;
}

export interface RenderResult {
  pages: SVGSVGElement[];
  /** Fonts referenced during this render that were not yet loaded — caller should re-render once available */
  pendingFonts: FontId[];
  warnings: RenderWarning[];
  durationMs: number;
}

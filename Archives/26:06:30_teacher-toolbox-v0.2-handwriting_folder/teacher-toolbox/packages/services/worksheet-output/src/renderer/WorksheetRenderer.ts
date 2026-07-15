/**
 * @module WorksheetRenderer
 * @description The orchestrator. Runs the full four-stage pipeline
 * (resolve → layout → render components → assemble pages) and produces the
 * authoritative SVG output that the PDF and Print engines both consume.
 *
 * Entitlement handling: this class reads `identity.can('branding:remove-watermark')`
 * EXACTLY ONCE per render call, before page assembly begins, and passes the
 * resulting boolean to PageAssembler. No entitlement object is ever placed
 * into the RenderContext that component renderers receive — see types.ts for
 * the full rationale. This keeps the entitlement check structurally
 * unreachable from inside any component renderer, satisfying the "commercial
 * features must never interrupt or degrade the teacher's workflow" principle
 * at the type-system level rather than by convention.
 */

import type { WorksheetComponent, WorksheetDocument } from '@teacher-toolbox/types';
import type { ThemeEngine } from '@teacher-toolbox/theme-engine';
import type { FontManager } from '@teacher-toolbox/font-manager';
import type { IMigrationService } from '@teacher-toolbox/migration';
import type { IIdentityService } from '@teacher-toolbox/identity';

import { resolveDocument } from './DocumentResolver.js';
import { runLayout } from './LayoutEngine.js';
import { assemblePage } from './PageAssembler.js';
import { renderWatermark } from './watermarkRenderer.js';
import { createElement, createGroup, setAttributes } from './svgHelpers.js';
import { SVG_UNITS_PER_MM } from './units.js';

import type {
  ComponentRenderer,
  ComponentRendererRegistration,
  FontMetrics,
  RenderContext,
  RenderOptions,
  RenderResult,
  RenderWarning,
} from './types.js';

import { renderStudentNameField, studentNameFieldDefaultHeight } from './platform/studentNameFieldRenderer.js';
import { renderDateField, dateFieldDefaultHeight } from './platform/dateFieldRenderer.js';
import { renderFreeText, freeTextDefaultHeight } from './platform/freeTextRenderer.js';
import { renderHandwritingLine, handwritingLineDefaultHeight } from './platform/handwritingLineRenderer.js';
import { renderHandwritingWord, handwritingWordDefaultHeight } from './platform/handwritingWordRenderer.js';
import { renderSpellingWordCell, spellingWordCellDefaultHeight } from './platform/spellingWordCellRenderer.js';

export type { ComponentRenderer, RenderContext, RenderOptions } from './types.js';

export class WorksheetRenderer {
  private readonly registry = new Map<string, ComponentRendererRegistration>();

  constructor(
    private readonly themeEngine: ThemeEngine,
    private readonly fontManager: FontManager,
    private readonly migrations: IMigrationService,
    /**
     * Optional by design: the renderer must function (and be unit-testable)
     * with no identity service at all — in that case the watermark is always
     * shown, which is the conservative/correct default for an unauthenticated
     * or test context. Only WorksheetRenderer itself ever touches this
     * reference, and only to read a single boolean before assembly.
     */
    private readonly identity?: IIdentityService,
  ) {
    this.registerPlatformRenderers();
  }

  /**
   * Register a renderer for a component type. Called by app modules during
   * AppModule.register(ctx) using the renderer reference provided in
   * PlatformRegistrationContext.
   */
  registerComponentRenderer(
    componentType: string,
    renderer: ComponentRenderer,
    defaultHeight?: ComponentRendererRegistration['defaultHeight'],
  ): void {
    if (this.registry.has(componentType)) {
      console.warn(`[WorksheetRenderer] Overwriting existing renderer for "${componentType}"`);
    }
    this.registry.set(componentType, { type: componentType, renderer, defaultHeight });
  }

  /** Fast preview render — used for the live editor. Same layout as full render; lower-fidelity shortcuts only affect visual quality, never positions. */
  renderPreview(doc: WorksheetDocument): RenderResult {
    return this.render(doc, { mode: 'preview' });
  }

  /** Full-fidelity render — used by PDF and Print. */
  renderFull(doc: WorksheetDocument): RenderResult {
    return this.render(doc, { mode: 'full', dpi: 300 });
  }

  // ---------------------------------------------------------------------------
  // Pipeline orchestration
  // ---------------------------------------------------------------------------

  private render(document: WorksheetDocument, options: RenderOptions): RenderResult {
    const t0 = performance.now();
    const warnings: RenderWarning[] = [];
    const pendingFonts: Set<string> = new Set();

    // Stage 1 — Resolve
    const resolved = resolveDocument(document, {
      themes: this.themeEngine,
      fonts: this.fontManager,
      migrations: this.migrations,
    });

    // Stage 2 — Layout (pure, no SVG yet)
    const layout = runLayout(resolved);
    for (const w of layout.warnings) {
      warnings.push({ componentId: w.componentId, type: 'text-overflow', message: w.message });
    }

    // Entitlement check — read exactly once, here, before any page is assembled.
    const showWatermark = this.identity ? !this.identity.can('branding:remove-watermark') : true;

    // Stage 3 + 4 — Render components per page, then assemble each page
    const pages = layout.pages.map((page) => {
      const contentLayers: SVGGElement[] = [];

      const sortedComponents = [...page.components].sort(
        (a, b) => (a.component.meta?.zIndex ?? 0) - (b.component.meta?.zIndex ?? 0),
      );

      for (const item of sortedComponents) {
        const { component } = item;

        if (options.mode === 'preview' && component.meta?.previewHidden) continue;
        if (options.mode === 'full' && component.meta?.printHidden) continue;

        const registration = this.registry.get(component.type);
        const ctx = this.buildRenderContext(item.layoutRect, resolved, options);

        if (!registration) {
          contentLayers.push(this.renderUnknownComponent(component, ctx, options.mode));
          warnings.push({
            componentId: component.id,
            type: 'unknown-component',
            message: `No renderer registered for component type "${component.type}".`,
          });
          continue;
        }

        try {
          const group = registration.renderer(component, ctx);
          setAttributes(group, { transform: `translate(${item.layoutRect.x}, ${item.layoutRect.y})` });
          contentLayers.push(group);
        } catch (err) {
          console.error(`[WorksheetRenderer] Error rendering component "${component.id}" (${component.type}):`, err);
          warnings.push({
            componentId: component.id,
            type: 'unknown-component',
            message: `Renderer threw an error: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      return assemblePage({
        pageSetup: page.pageSetup,
        theme: resolved.theme,
        contentLayers,
        showWatermark,
        watermarkRenderer: renderWatermark,
      });
    });

    return {
      pages,
      pendingFonts: [...pendingFonts] as unknown as RenderResult['pendingFonts'],
      warnings,
      durationMs: performance.now() - t0,
    };
  }

  // ---------------------------------------------------------------------------
  // RenderContext construction
  // ---------------------------------------------------------------------------

  private buildRenderContext(
    layoutRect: { x: number; y: number; width: number; height: number },
    resolved: ReturnType<typeof resolveDocument>,
    options: RenderOptions,
  ): RenderContext {
    const fontManager = this.fontManager;

    return {
      unitsPerMm: SVG_UNITS_PER_MM,
      layoutRect,
      pageSetup: resolved.original.pageSetup,
      theme: this.themeEngine.getRenderContext(),
      mode: options.mode,
      fonts: {
        getGlyphPath: (fontId, character, sizePt) => fontManager.getGlyphPath(fontId, character, sizePt),
        getWordPath: (fontId, word, sizePt) => fontManager.getWordPath(fontId, word, sizePt),
        getFontMetrics: (fontId): FontMetrics | null => {
          // v0.2: conservative universal approximation. Real per-font metrics
          // (derived from font file metadata) are a v0.3+ enhancement — the
          // FontRenderContext interface already supports it without any
          // caller changes when that data becomes available.
          const def = fontManager.getDefinition(fontId);
          if (!def) return null;
          return { capHeight: 0.7, xHeight: 0.5, averageAdvance: 0.55 };
        },
      },
      svg: { createElement, createGroup, setAttributes },
    };
  }

  // ---------------------------------------------------------------------------
  // Unknown component fallback (preview only — never shown in full/print/PDF)
  // ---------------------------------------------------------------------------

  private renderUnknownComponent(
    component: WorksheetComponent,
    ctx: RenderContext,
    mode: 'preview' | 'full',
  ): SVGGElement {
    const group = createGroup(`unknown-${component.id}`);
    if (mode !== 'preview') return group; // never show debug placeholders in PDF/print

    const rect = createElement('rect');
    setAttributes(rect, {
      x: ctx.layoutRect.x,
      y: ctx.layoutRect.y,
      width: ctx.layoutRect.width,
      height: ctx.layoutRect.height,
      fill: 'none',
      stroke: '#ff9800',
      'stroke-dasharray': '4 2',
    });
    const text = createElement('text');
    setAttributes(text, {
      x: ctx.layoutRect.x + 4,
      y: ctx.layoutRect.y + 14,
      'font-size': 10,
      fill: '#ff9800',
    });
    text.textContent = `[${component.type}]`;
    group.appendChild(rect);
    group.appendChild(text);
    return group;
  }

  // ---------------------------------------------------------------------------
  // Built-in platform component renderers
  // ---------------------------------------------------------------------------

  private registerPlatformRenderers(): void {
    this.registerComponentRenderer(
      'platform.student-name-field',
      renderStudentNameField,
      studentNameFieldDefaultHeight,
    );
    this.registerComponentRenderer('platform.date-field', renderDateField, dateFieldDefaultHeight);
    this.registerComponentRenderer('platform.free-text', renderFreeText, freeTextDefaultHeight);

    // Handwriting components. These MUST be authored with
    // meta.protectedDimensions = true by whatever worksheet builder UI
    // creates them (the Layout Engine honors this flag but cannot infer it
    // from the component type alone — the data-authoring layer is
    // responsible for setting it, per the "educational correctness over
    // visual appearance" principle). The renderer registration itself is
    // identical to any other component; the protection comes from the
    // document data, not a special case here.
    this.registerComponentRenderer(
      'platform.handwriting-line',
      renderHandwritingLine,
      handwritingLineDefaultHeight,
    );
    this.registerComponentRenderer(
      'platform.handwriting-word',
      renderHandwritingWord,
      handwritingWordDefaultHeight,
    );
    this.registerComponentRenderer(
      'platform.spelling-word-cell',
      renderSpellingWordCell,
      spellingWordCellDefaultHeight,
    );

    console.info(
      '[WorksheetRenderer] Platform renderers registered: student-name-field, date-field, free-text, ' +
      'handwriting-line, handwriting-word, spelling-word-cell',
    );
    console.info(
      '[WorksheetRenderer] Stroke-level glyph data (FontRenderContext.getGlyph) lands in v0.3 with the ' +
      'first bundled SVG path font — handwriting-word renders correctly but surfaces a missing-stroke-data ' +
      'warning for every character until then. This is intentional: see handwritingWordRenderer.ts module docstring.',
    );
    console.info('[WorksheetRenderer] Remaining platform renderers (header, footer, artwork-placement) deferred to v0.2 continuation');
  }
}

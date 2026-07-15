/**
 * @module WorksheetRenderer
 * @description Converts a WorksheetDocument into an SVG element.
 * This is the authoritative visual representation — PDF and Print both
 * consume the SVG output produced here, guaranteeing identical output
 * across all output modes.
 *
 * App modules extend the renderer by registering ComponentRenderers for
 * their own component types. The platform provides renderers for built-in
 * platform component types (free-text, student-name-field, etc.)
 *
 * @status PLACEHOLDER — renders a blank page outline with component count.
 *         Full SVG layout engine implemented in v0.2.
 */

import type { WorksheetComponent, WorksheetDocument } from '@teacher-toolbox/types';
import type { ThemeEngine, ThemeRenderContext } from '@teacher-toolbox/theme-engine';
import type { FontManager } from '@teacher-toolbox/font-manager';

// ---------------------------------------------------------------------------
// Component renderer contract
// ---------------------------------------------------------------------------

export interface RenderContext {
  theme: ThemeRenderContext;
  /** SVG user units per millimetre */
  unitsPerMm: number;
  /** Whether this is a preview (lower fidelity OK) or full render */
  mode: 'preview' | 'full';
}

/**
 * A ComponentRenderer converts one WorksheetComponent into an SVG <g> element.
 * App modules implement and register these for their custom component types.
 */
export type ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
  svg: SVGSVGElement,
) => SVGGElement;

// ---------------------------------------------------------------------------
// Render options
// ---------------------------------------------------------------------------

export interface RenderOptions {
  mode: 'preview' | 'full';
  /** DPI for any rasterised elements (default 96 for screen, 300 for PDF) */
  dpi?: number;
}

// ---------------------------------------------------------------------------
// WorksheetRenderer
// ---------------------------------------------------------------------------

/** SVG user units per mm at 96dpi screen resolution */
const UNITS_PER_MM = 3.7795275591;

export class WorksheetRenderer {
  private readonly componentRenderers = new Map<string, ComponentRenderer>();

  constructor(
    private readonly themeEngine: ThemeEngine,
    private readonly fontManager: FontManager,
  ) {
    this.registerPlatformRenderers();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Register a renderer for a component type.
   * Called by app modules at registration time.
   *
   * @param componentType - namespaced type string e.g. 'icanspell.handwriting-line'
   */
  registerComponentRenderer(componentType: string, renderer: ComponentRenderer): void {
    if (this.componentRenderers.has(componentType)) {
      console.warn(`[WorksheetRenderer] Overwriting existing renderer for "${componentType}"`);
    }
    this.componentRenderers.set(componentType, renderer);
    console.info(`[WorksheetRenderer] Registered renderer: ${componentType}`);
  }

  /**
   * Fast preview render — returns an SVG element suitable for screen display.
   * May skip expensive operations (e.g. full font hinting).
   */
  renderPreview(doc: WorksheetDocument): SVGSVGElement {
    return this.render(doc, { mode: 'preview' });
  }

  /**
   * Full-fidelity render — used by PDF and Print engines.
   * All components are rendered at maximum quality.
   */
  renderFull(doc: WorksheetDocument): SVGSVGElement {
    return this.render(doc, { mode: 'full', dpi: 300 });
  }

  // ---------------------------------------------------------------------------
  // Core render implementation
  // ---------------------------------------------------------------------------

  private render(doc: WorksheetDocument, options: RenderOptions): SVGSVGElement {
    const theme = this.themeEngine.getRenderContext();
    const { size, orientation, margins } = doc.pageSetup;

    // Determine page dimensions in mm, respecting orientation
    const pageW = orientation === 'landscape' ? size.height : size.width;
    const pageH = orientation === 'landscape' ? size.width  : size.height;

    // Convert to SVG user units
    const svgW = Math.round(pageW * UNITS_PER_MM);
    const svgH = Math.round(pageH * UNITS_PER_MM);

    const svg = this.createSVGElement(svgW, svgH);

    const ctx: RenderContext = {
      theme,
      unitsPerMm: UNITS_PER_MM,
      mode: options.mode,
    };

    // 1. Page background
    this.renderPageBackground(svg, svgW, svgH, theme);

    // 2. Content area (inside margins)
    const contentX = margins.left  * UNITS_PER_MM;
    const contentY = margins.top   * UNITS_PER_MM;
    const contentW = (pageW - margins.left - margins.right)  * UNITS_PER_MM;
    const contentH = (pageH - margins.top  - margins.bottom) * UNITS_PER_MM;
    const contentGroup = this.createGroup(svg, 'content-area', contentX, contentY);

    // 3. Render each component
    for (const component of doc.components) {
      if (component.meta?.printHidden && options.mode === 'full') continue;
      if (component.meta?.previewHidden && options.mode === 'preview') continue;

      const renderer = this.componentRenderers.get(component.type);
      if (!renderer) {
        // Render a placeholder for unknown component types
        this.renderUnknownComponent(contentGroup, component, ctx);
        continue;
      }

      try {
        const el = renderer(component, ctx, svg);
        contentGroup.appendChild(el);
      } catch (err) {
        console.error(`[WorksheetRenderer] Error rendering component "${component.type}":`, err);
      }
    }

    // 4. Placeholder text in preview mode when page is empty
    if (doc.components.length === 0 && options.mode === 'preview') {
      this.renderEmptyPageHint(svg, svgW, svgH, contentW, contentH);
    }

    return svg;
  }

  // ---------------------------------------------------------------------------
  // SVG helpers
  // ---------------------------------------------------------------------------

  private createSVGElement(width: number, height: number): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns',   'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width',   `${width}`);
    svg.setAttribute('height',  `${height}`);
    return svg;
  }

  private createGroup(
    parent: SVGElement,
    id: string,
    x = 0,
    y = 0,
  ): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', id);
    if (x !== 0 || y !== 0) g.setAttribute('transform', `translate(${x},${y})`);
    parent.appendChild(g);
    return g;
  }

  private renderPageBackground(
    svg: SVGSVGElement,
    w: number,
    h: number,
    theme: ThemeRenderContext,
  ): void {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x',      '0');
    rect.setAttribute('y',      '0');
    rect.setAttribute('width',  `${w}`);
    rect.setAttribute('height', `${h}`);
    rect.setAttribute('fill',   theme.colors.pageBg);
    svg.appendChild(rect);
  }

  private renderUnknownComponent(
    parent: SVGGElement,
    component: WorksheetComponent,
    ctx: RenderContext,
  ): void {
    if (ctx.mode !== 'preview') return;
    const g  = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x',      `${component.position.x}`);
    rect.setAttribute('y',      `${component.position.y}`);
    rect.setAttribute('width',  `${component.size.width}`);
    rect.setAttribute('height', `${component.size.height}`);
    rect.setAttribute('fill',   'none');
    rect.setAttribute('stroke', '#ff9800');
    rect.setAttribute('stroke-dasharray', '4 2');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', `${component.position.x + 4}`);
    text.setAttribute('y', `${component.position.y + 14}`);
    text.setAttribute('font-size', '10');
    text.setAttribute('fill', '#ff9800');
    text.textContent = `[${component.type}]`;
    g.appendChild(rect);
    g.appendChild(text);
    parent.appendChild(g);
  }

  private renderEmptyPageHint(
    svg: SVGSVGElement,
    svgW: number,
    svgH: number,
    _contentW: number,
    _contentH: number,
  ): void {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x',           `${svgW / 2}`);
    text.setAttribute('y',           `${svgH / 2}`);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size',   '14');
    text.setAttribute('fill',        '#cccccc');
    text.textContent = 'Empty worksheet — add components to get started';
    svg.appendChild(text);
  }

  // ---------------------------------------------------------------------------
  // Built-in platform component renderers
  // ---------------------------------------------------------------------------

  private registerPlatformRenderers(): void {
    // TODO v0.2: implement platform.free-text, platform.student-name-field etc.
    // For now, they fall through to renderUnknownComponent (which is a no-op in full mode)
    console.info('[WorksheetRenderer] Platform component renderers: TODO v0.2');
  }
}

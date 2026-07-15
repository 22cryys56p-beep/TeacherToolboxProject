/**
 * @module PageAssembler
 * @description Stage 4 of the rendering pipeline. Assembles a complete SVG
 * page from already-rendered component layers, page background, optional
 * decorative border, and — exactly here, and nowhere else in the renderer —
 * the free-tier watermark.
 *
 * THIS IS THE SINGLE ENTITLEMENT CHECKPOINT IN THE ENTIRE RENDERER.
 * Component renderers (Stage 3) never receive entitlement data — see the
 * RenderContext JSDoc in types.ts for the full rationale. The watermark is
 * appended here, after every component has already rendered successfully,
 * as a page-level addition that cannot affect any component's content,
 * layout, or visual quality. It can only be present or absent.
 */

import type { PageSetup, Theme } from '@teacher-toolbox/types';
import { PlatformComponentTypes } from '@teacher-toolbox/types';
import { computePageDimensions } from './LayoutEngine.js';
import { createElement, setAttributes } from './svgHelpers.js';
import { mmToUnits } from './units.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface PageAssemblyInput {
  pageSetup: PageSetup;
  theme: Theme;
  contentLayers: SVGGElement[];
  /**
   * Whether the watermark should be shown on this page. Resolved by the
   * CALLER (WorksheetRenderer) by reading `entitlements.can('branding:remove-watermark')`
   * exactly once before assembly begins — PageAssembler itself has no
   * dependency on the identity/entitlement packages and never will.
   */
  showWatermark: boolean;
  watermarkRenderer?: (pageWidth: number, pageHeight: number, theme: Theme) => SVGGElement;
}

/**
 * Assemble one complete page SVG from its rendered content layers.
 */
export function assemblePage(input: PageAssemblyInput): SVGSVGElement {
  const { width, height } = computePageDimensions(input.pageSetup);

  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  setAttributes(svg, {
    xmlns: SVG_NS,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
  });

  // 1. Page background
  const bg = createElement('rect');
  setAttributes(bg, { x: 0, y: 0, width, height, fill: input.theme.colors.pageBg });
  svg.appendChild(bg);

  // 2. Decorative border, if the theme specifies one
  if (input.theme.decoration.borderStyle && input.theme.decoration.borderStyle !== 'none') {
    svg.appendChild(renderDecorativeBorder(width, height, input.theme));
  }

  // 3. Content area — translate by the margin offset so component layers
  //    (already positioned relative to the body-zone origin) land correctly.
  const marginXUnits = mmToUnits(input.pageSetup.margins.left);
  const marginYUnits = mmToUnits(input.pageSetup.margins.top);
  const contentGroup = createElement('g') as SVGGElement;
  setAttributes(contentGroup, {
    id: 'content-area',
    transform: `translate(${marginXUnits}, ${marginYUnits})`,
  });
  for (const layer of input.contentLayers) {
    contentGroup.appendChild(layer);
  }
  svg.appendChild(contentGroup);

  // 4. Watermark — the single entitlement-gated addition, applied last so it
  //    always sits on top and is never affected by content layout.
  if (input.showWatermark && input.watermarkRenderer) {
    svg.appendChild(input.watermarkRenderer(width, height, input.theme));
  }

  return svg;
}

function renderDecorativeBorder(width: number, height: number, theme: Theme): SVGGElement {
  const group = createElement('g') as SVGGElement;
  setAttributes(group, { id: PlatformComponentTypes.DecorativeBorder });

  const inset = mmToUnits(4);
  const strokeWidth = theme.decoration.borderWidth ?? 1.5;
  const dashed = theme.decoration.borderStyle === 'dashed';
  const double = theme.decoration.borderStyle === 'double-line';

  const rect = createElement('rect');
  setAttributes(rect, {
    x: inset,
    y: inset,
    width: width - inset * 2,
    height: height - inset * 2,
    fill: 'none',
    stroke: theme.colors.borderColor,
    'stroke-width': strokeWidth,
    ...(dashed ? { 'stroke-dasharray': '6 4' } : {}),
  });
  group.appendChild(rect);

  if (double) {
    const innerInset = inset + strokeWidth * 2;
    const innerRect = createElement('rect');
    setAttributes(innerRect, {
      x: innerInset,
      y: innerInset,
      width: width - innerInset * 2,
      height: height - innerInset * 2,
      fill: 'none',
      stroke: theme.colors.borderColor,
      'stroke-width': strokeWidth,
    });
    group.appendChild(innerRect);
  }

  return group;
}

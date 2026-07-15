/**
 * @module LayoutEngine
 * @description Stage 2 of the rendering pipeline. Pure function: takes a
 * ResolvedDocument and produces a LayoutResult describing exactly where every
 * component sits and how many pages are needed. No SVG creation. No DOM
 * access. No async. This is what makes layout independently testable without
 * a browser.
 *
 * Honors two component-level contracts:
 *  - meta.protectedDimensions: never resize this component to make it fit —
 *    only ever move it to a new page. This is the structural enforcement of
 *    "educational correctness over visual appearance" (see ComponentMeta
 *    JSDoc in @teacher-toolbox/types for the full rationale).
 *  - meta.zIndex: does not affect layout position, only paint order — applied
 *    later in PageAssembler, not here.
 */

import type { Margins, Orientation, PageSetup, PageSize, WorksheetComponent } from '@teacher-toolbox/types';
import { mmToUnits } from './units.js';
import type {
  LayoutItem,
  LayoutOptions,
  LayoutPage,
  LayoutResult,
  LayoutWarning,
  ResolvedDocument,
} from './types.js';

/**
 * Compute the body-zone dimensions (content area inside margins) in SVG units
 * for a given page setup, respecting orientation.
 */
export function computeBodyZone(pageSetup: PageSetup): { width: number; height: number } {
  const { size, orientation, margins } = pageSetup;
  const pageWidthMm = orientation === 'landscape' ? size.height : size.width;
  const pageHeightMm = orientation === 'landscape' ? size.width : size.height;

  const bodyWidthMm = pageWidthMm - margins.left - margins.right;
  const bodyHeightMm = pageHeightMm - margins.top - margins.bottom;

  return {
    width: mmToUnits(bodyWidthMm),
    height: mmToUnits(bodyHeightMm),
  };
}

/** Full page dimensions (margins included) in SVG units, respecting orientation. */
export function computePageDimensions(pageSetup: PageSetup): { width: number; height: number } {
  const { size, orientation } = pageSetup;
  const widthMm = orientation === 'landscape' ? size.height : size.width;
  const heightMm = orientation === 'landscape' ? size.width : size.height;
  return { width: mmToUnits(widthMm), height: mmToUnits(heightMm) };
}

/**
 * Run the layout algorithm for a resolved document. Currently implements the
 * 'flow' and 'absolute' modes described in the renderer design. 'grid' mode
 * is reserved for a future app (e.g. iCanMath side-by-side problem sets) and
 * intentionally not implemented yet — falls back to 'flow' with a warning
 * rather than silently misbehaving.
 */
export function runLayout(doc: ResolvedDocument): LayoutResult {
  const { mode } = doc.layoutOptions;

  if (mode === 'absolute') {
    return runAbsoluteLayout(doc);
  }

  if (mode === 'grid') {
    // Not yet implemented — fall back to flow and warn, rather than crash
    // or silently produce an incorrect grid.
    const result = runFlowLayout(doc);
    result.warnings.push({
      componentId: '*',
      type: 'overflow',
      message: "Layout mode 'grid' is not yet implemented; falling back to 'flow'.",
    });
    return result;
  }

  return runFlowLayout(doc);
}

// ---------------------------------------------------------------------------
// Flow layout
// ---------------------------------------------------------------------------

function runFlowLayout(doc: ResolvedDocument): LayoutResult {
  const { original, layoutOptions } = doc;
  const bodyZone = computeBodyZone(original.pageSetup);
  const gap = layoutOptions.gap;
  const minOrphanUnits = mmToUnits(layoutOptions.minOrphanHeight);

  const warnings: LayoutWarning[] = [];
  const pages: LayoutPage[] = [];

  let currentPageNumber = 1;
  let currentPageItems: LayoutItem[] = [];
  let cursorY = 0;

  const components = original.components;

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    if (!component) continue;
    if (component.meta?.previewHidden && false) continue; // preview-mode filtering happens in WorksheetRenderer, not here

    const height = resolveComponentHeight(component);
    const isProtected = component.meta?.protectedDimensions === true;
    const keepWithNext = (component.data?.['keepWithNext'] as boolean | undefined) === true;

    const wouldOverflow = cursorY + height > bodyZone.height;

    if (wouldOverflow && cursorY > 0) {
      // Decide: would the remaining space after a break be too small to be
      // useful (orphan)? If so, and this is not the very first component on
      // the page, we still must break — protectedDimensions components are
      // never compressed to avoid this. We simply start a new page.
      pages.push({
        pageNumber: currentPageNumber,
        components: currentPageItems,
        pageSetup: original.pageSetup,
      });
      currentPageNumber++;
      currentPageItems = [];
      cursorY = 0;

      if (height > bodyZone.height) {
        // Even a full empty page can't fit this component.
        warnings.push({
          componentId: component.id,
          type: isProtected ? 'out-of-bounds' : 'overflow',
          message: isProtected
            ? `Component "${component.id}" has protected dimensions taller than the page body and cannot be resized to fit. It will overflow the page boundary.`
            : `Component "${component.id}" is taller than the page body and will overflow.`,
        });
      }
    }

    const layoutRect = {
      x: 0,
      y: cursorY,
      width: bodyZone.width,
      height,
    };

    currentPageItems.push({ component, layoutRect, page: currentPageNumber });

    cursorY += height + gap;

    // keepWithNext: if the *next* component would start a new page, and this
    // component requested to stay with it, we have already committed this
    // component to the current page — true keep-together requires look-ahead,
    // which is handled by peeking the next component's height below.
    if (keepWithNext && i + 1 < components.length) {
      const next = components[i + 1];
      if (next) {
        const nextHeight = resolveComponentHeight(next);
        const nextWouldOverflow = cursorY + nextHeight > bodyZone.height;
        if (nextWouldOverflow) {
          // Push both this component and the next onto a fresh page together.
          // Since this component was already placed on the current page, the
          // simplest correct behaviour is: if there's anything else on the
          // current page besides this one, move this one (and the upcoming
          // next) to a new page now.
          if (currentPageItems.length > 1) {
            currentPageItems.pop();
            pages.push({
              pageNumber: currentPageNumber,
              components: currentPageItems,
              pageSetup: original.pageSetup,
            });
            currentPageNumber++;
            currentPageItems = [];
            cursorY = 0;
            const rePlacedRect = { x: 0, y: cursorY, width: bodyZone.width, height };
            currentPageItems.push({ component, layoutRect: rePlacedRect, page: currentPageNumber });
            cursorY += height + gap;
          }
        }
      }
    }
  }

  if (currentPageItems.length > 0 || pages.length === 0) {
    pages.push({
      pageNumber: currentPageNumber,
      components: currentPageItems,
      pageSetup: original.pageSetup,
    });
  }

  return { pages, totalPages: pages.length, warnings };
}

// ---------------------------------------------------------------------------
// Absolute layout
// ---------------------------------------------------------------------------

function runAbsoluteLayout(doc: ResolvedDocument): LayoutResult {
  const { original } = doc;
  const bodyZone = computeBodyZone(original.pageSetup);
  const warnings: LayoutWarning[] = [];

  const items: LayoutItem[] = original.components.map((component) => {
    const layoutRect = {
      x: mmToUnits(component.position.x),
      y: mmToUnits(component.position.y),
      width: component.size.width > 0 ? mmToUnits(component.size.width) : bodyZone.width,
      height: resolveComponentHeight(component),
    };

    const outOfBounds =
      layoutRect.x < 0 ||
      layoutRect.y < 0 ||
      layoutRect.x + layoutRect.width > bodyZone.width ||
      layoutRect.y + layoutRect.height > bodyZone.height;

    if (outOfBounds) {
      warnings.push({
        componentId: component.id,
        type: 'out-of-bounds',
        message: `Component "${component.id}" extends outside the content area in absolute layout mode.`,
      });
    }

    return { component, layoutRect, page: 1 };
  });

  return {
    pages: [{ pageNumber: 1, components: items, pageSetup: original.pageSetup }],
    totalPages: 1,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a component's effective height in SVG units. A component with
 * size.height === 0 signals "size to content" — the Layout Engine cannot
 * determine this itself (it would require calling into the component
 * renderer, which the Layout Engine deliberately never does — see Stage 2 /
 * Stage 3 separation in the design). For v0.2, zero-height components are
 * given a conservative default; ComponentRendererRegistration.defaultHeight
 * is wired up in WorksheetRenderer for components that need precise
 * content-driven sizing (see WorksheetRenderer.ts).
 */
function resolveComponentHeight(component: WorksheetComponent): number {
  if (component.size.height > 0) {
    return mmToUnits(component.size.height);
  }
  return mmToUnits(10); // conservative single-line default; overridden by WorksheetRenderer when a defaultHeight callback is registered
}

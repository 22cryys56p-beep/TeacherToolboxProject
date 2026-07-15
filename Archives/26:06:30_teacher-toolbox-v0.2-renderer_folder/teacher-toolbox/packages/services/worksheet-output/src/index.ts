/**
 * @package @teacher-toolbox/worksheet-output
 * @description Unified worksheet output pipeline: WorksheetDocument → SVG → PDF/Print.
 *
 * The renderer is a four-stage pipeline (resolve → layout → render → assemble)
 * producing one SVGSVGElement per page. WorksheetPDF and WorksheetPrint both
 * consume that same output — there is exactly one rendering code path for
 * all three output modes (preview, PDF, print).
 *
 * See docs/architecture/PLATFORM_SERVICES.md for the full service contract,
 * and the renderer design review for the architectural rationale.
 */

export { WorksheetRenderer } from './renderer/WorksheetRenderer.js';
export type {
  ComponentRenderer,
  ComponentRendererRegistration,
  RenderContext,
  RenderOptions,
  RenderResult,
  RenderWarning,
  FontRenderContext,
  FontMetrics,
  SVGHelpers,
  LayoutMode,
  LayoutOptions,
  LayoutResult,
  LayoutPage,
  LayoutItem,
  LayoutWarning,
  ResolvedDocument,
} from './renderer/types.js';

export { SVG_UNITS_PER_MM, mmToUnits, unitsToMm, ptToUnits } from './renderer/units.js';
export { computeBodyZone, computePageDimensions, runLayout } from './renderer/LayoutEngine.js';
export { resolveDocument } from './renderer/DocumentResolver.js';
export { assemblePage } from './renderer/PageAssembler.js';
export { namespaceSvgIds, createElement, createGroup, setAttributes } from './renderer/svgHelpers.js';
export { placeGlyph, placeWord } from './renderer/glyphPositioner.js';
export { wrapText } from './renderer/textWrapper.js';

export { WorksheetPDF }   from './pdf/WorksheetPDF.js';
export type { PDFOptions } from './pdf/WorksheetPDF.js';

export { WorksheetPrint }   from './print/WorksheetPrint.js';
export type { PrintOptions } from './print/WorksheetPrint.js';

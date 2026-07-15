/**
 * @module WorksheetPrint
 * @description Prepares worksheet SVG output for browser printing.
 * Injects a hidden iframe with @media print CSS, triggers window.print(),
 * then removes the iframe cleanly.
 *
 * Consumes WorksheetRenderer.renderFull(), which returns one SVGSVGElement
 * per page. A single document's multiple pages (from pagination) and a
 * batch of multiple documents both flow through the same flattening step
 * before printing — printSVGs() does not distinguish between them.
 *
 * @status PLACEHOLDER — basic browser print works; cross-browser page-break
 *         testing remains a v0.2 follow-up task per the renderer design review.
 */

import type { WorksheetDocument } from '@teacher-toolbox/types';
import type { WorksheetRenderer } from '../renderer/WorksheetRenderer.js';

export interface PrintOptions {
  /** Show browser's print dialog (default: true) */
  showDialog?: boolean;
}

export class WorksheetPrint {
  constructor(private readonly renderer: WorksheetRenderer) {}

  /** Print a single worksheet (all of its pages) using the browser print dialog. */
  async print(doc: WorksheetDocument, options: PrintOptions = {}): Promise<void> {
    const result = this.renderer.renderFull(doc);
    if (result.warnings.length > 0) {
      console.warn('[WorksheetPrint] Render warnings:', result.warnings);
    }
    await this.printSVGs(result.pages, options);
  }

  /** Print a batch of worksheets — every page of every document, each document separated. */
  async printBatch(docs: WorksheetDocument[], options: PrintOptions = {}): Promise<void> {
    const allPages: SVGSVGElement[] = [];
    for (const doc of docs) {
      const result = this.renderer.renderFull(doc);
      if (result.warnings.length > 0) {
        console.warn(`[WorksheetPrint] Render warnings for "${doc.metadata.title}":`, result.warnings);
      }
      allPages.push(...result.pages);
    }
    await this.printSVGs(allPages, options);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async printSVGs(svgs: SVGSVGElement[], _options: PrintOptions): Promise<void> {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      throw new Error('[WorksheetPrint] Could not access iframe document');
    }

    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; }
  .worksheet-page { page-break-after: always; }
  .worksheet-page:last-child { page-break-after: avoid; }
  svg { display: block; width: 100%; height: auto; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>`);

    for (const svg of svgs) {
      doc.write(`<div class="worksheet-page">${new XMLSerializer().serializeToString(svg)}</div>`);
    }

    doc.write('</body></html>');
    doc.close();

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      setTimeout(resolve, 500);
    });

    iframe.contentWindow?.print();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }
}

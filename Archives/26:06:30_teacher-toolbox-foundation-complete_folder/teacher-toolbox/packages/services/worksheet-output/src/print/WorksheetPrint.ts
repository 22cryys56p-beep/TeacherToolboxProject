/**
 * @module WorksheetPrint
 * @description Prepares worksheet SVG output for browser printing.
 * Injects a print-ready iframe with @media print CSS, triggers window.print(),
 * then removes the iframe cleanly.
 *
 * @status PLACEHOLDER — interface complete; basic browser print works.
 *         Page break handling and batch printing refined in v0.2.
 */

import type { WorksheetDocument } from '@teacher-toolbox/types';
import type { WorksheetRenderer } from '../renderer/WorksheetRenderer.js';

export interface PrintOptions {
  /** Show browser's print dialog (default: true) */
  showDialog?: boolean;
}

export class WorksheetPrint {
  constructor(private readonly renderer: WorksheetRenderer) {}

  /**
   * Print a single worksheet using the browser print dialog.
   */
  async print(doc: WorksheetDocument, options: PrintOptions = {}): Promise<void> {
    const svg = this.renderer.renderFull(doc);
    await this.printSVGs([svg], options);
  }

  /**
   * Print a batch of worksheets — each as a separate page.
   * Used for class-set printing.
   */
  async printBatch(docs: WorksheetDocument[], options: PrintOptions = {}): Promise<void> {
    const svgs = docs.map((d) => this.renderer.renderFull(d));
    await this.printSVGs(svgs, options);
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

    // Wait for any embedded resources to load before printing
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      // Fallback timeout
      setTimeout(resolve, 500);
    });

    iframe.contentWindow?.print();

    // Clean up after a short delay to allow the print dialog to open
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }
}

/**
 * @module WorksheetPDF
 * @description Converts rendered SVG pages into a downloadable PDF.
 * Wraps the PDF library (jsPDF in production) behind a stable interface so
 * the library can be swapped without touching app code.
 *
 * Consumes WorksheetRenderer.renderFull(), which now returns a RenderResult
 * with one SVGSVGElement per page (pagination is computed by the Layout
 * Engine — see LayoutEngine.ts). A single-page document and a multi-page
 * document go through the exact same code path here.
 *
 * @status PLACEHOLDER — interface complete; downloads an SVG bundle as a
 *         stand-in until jsPDF + svg2pdf.js is wired up.
 */

import type { WorksheetDocument } from '@teacher-toolbox/types';
import type { WorksheetRenderer } from '../renderer/WorksheetRenderer.js';

export interface PDFOptions {
  filename?: string;
  /** Embed custom fonts in the PDF (required for handwriting fonts) */
  embedFonts?: boolean;
}

export class WorksheetPDF {
  constructor(private readonly renderer: WorksheetRenderer) {}

  /**
   * Generate a PDF from a single worksheet document (which may itself span
   * multiple pages, per pagination) and trigger a browser download.
   * TODO v0.2 continuation: integrate jsPDF + svg2pdf.js for true PDF output.
   */
  async generate(doc: WorksheetDocument, options: PDFOptions = {}): Promise<void> {
    const filename = options.filename ?? `${doc.metadata.title || 'worksheet'}.pdf`;
    const result = this.renderer.renderFull(doc);

    if (result.warnings.length > 0) {
      console.warn('[WorksheetPDF] Render warnings:', result.warnings);
    }

    // Placeholder: bundle each page's SVG into one file, separated by a
    // comment marker, until jsPDF integration replaces this entirely.
    const combined = result.pages
      .map((svg, i) => `<!-- page ${i + 1} of ${result.pages.length} -->\n${new XMLSerializer().serializeToString(svg)}`)
      .join('\n\n');

    const blob = new Blob([combined], { type: 'image/svg+xml' });
    this.triggerDownload(blob, filename.replace(/\.pdf$/, '.svg'));

    console.info(`[WorksheetPDF] Downloaded ${result.pages.length}-page SVG placeholder for: ${filename}`);
    console.warn('[WorksheetPDF] True PDF generation (jsPDF) deferred — interface is stable for that swap.');
  }

  /**
   * Generate a batch PDF containing every page of every document, in order.
   * Used for class-set printing — 25 personalised worksheets in one download.
   */
  async generateBatch(docs: WorksheetDocument[], options: PDFOptions = {}): Promise<void> {
    console.warn('[WorksheetPDF] Batch PDF: generating individual files until jsPDF merge is wired up');
    for (const doc of docs) {
      await this.generate(doc, options);
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

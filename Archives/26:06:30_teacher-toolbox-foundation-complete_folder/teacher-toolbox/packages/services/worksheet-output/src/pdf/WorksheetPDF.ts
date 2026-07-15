/**
 * @module WorksheetPDF
 * @description Converts rendered SVG output into a downloadable PDF.
 * Wraps the PDF library (jsPDF in production) behind a stable interface
 * so the library can be swapped without touching app code.
 *
 * @status PLACEHOLDER — interface is complete; triggers a browser download
 *         of an SVG file as a stand-in until jsPDF is wired up in v0.2.
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
   * Generate a PDF from a single worksheet document and trigger a browser download.
   * TODO v0.2: integrate jsPDF + svg2pdf.js for true PDF output.
   */
  async generate(doc: WorksheetDocument, options: PDFOptions = {}): Promise<void> {
    const filename = options.filename ?? `${doc.metadata.title || 'worksheet'}.pdf`;
    const svg = this.renderer.renderFull(doc);
    const svgString = new XMLSerializer().serializeToString(svg);

    // Placeholder: download as SVG until jsPDF is integrated
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    this.triggerDownload(blob, filename.replace('.pdf', '.svg'));

    console.info(`[WorksheetPDF] Downloaded SVG placeholder for: ${filename}`);
    console.warn('[WorksheetPDF] True PDF generation (jsPDF) deferred to v0.2');
  }

  /**
   * Generate a batch PDF containing one page per document.
   * Used for class-set printing — 25 personalised worksheets in one download.
   */
  async generateBatch(docs: WorksheetDocument[], options: PDFOptions = {}): Promise<void> {
    // TODO v0.2: merge pages into a single multi-page PDF
    console.warn('[WorksheetPDF] Batch PDF deferred to v0.2 — generating individual files');
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

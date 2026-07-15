/**
 * @package @teacher-toolbox/types/worksheet
 * @description WorksheetDocument — the universal serialisable document format.
 * schemaVersion is required on every document from day one so the MigrationService
 * can upgrade old documents transparently before rendering.
 */

import type { AppId, ISODateTime, Margins, Orientation, PageSize, Position, Size, StudentId, SyncMetadata, TemplateId, ThemeId, WorksheetId } from '../common/index.js';

export const WORKSHEET_SCHEMA_VERSION = '1.0.0';

export interface WorksheetDocument extends SyncMetadata {
  id:            WorksheetId;
  schemaVersion: string;
  appId:         AppId;
  metadata:      DocumentMetadata;
  pageSetup:     PageSetup;
  theme:         ThemeReference;
  student?:      StudentReference;
  components:    WorksheetComponent[];
  appData?:      Record<string, unknown>;
}

export interface DocumentMetadata {
  title:       string;
  description?: string;
  tags:        string[];
  templateId?: TemplateId;
  createdAt:   ISODateTime;
  updatedAt:   ISODateTime;
  version:     number;
}

export interface PageSetup {
  size:        PageSize;
  orientation: Orientation;
  margins:     Margins;
}

export interface ThemeReference {
  themeId:    ThemeId;
  overrides?: Record<string, string>;
}

export interface StudentReference {
  studentId:   StudentId;
  displayName: string;
}

export interface WorksheetComponent {
  id:       string;
  type:     string;
  position: Position;
  size:     Size;
  style?:   ComponentStyle;
  data:     Record<string, unknown>;
  meta?:    ComponentMeta;
}

export interface ComponentStyle {
  colors?:     Record<string, string>;
  fonts?:      Record<string, string>;
  properties?: Record<string, string | number>;
}

export interface ComponentMeta {
  printHidden?:   boolean;
  previewHidden?: boolean;
  zIndex?:        number;
  ariaLabel?:     string;
  /**
   * When true, this component's dimensions carry educational meaning and must
   * never be resized, compressed, or rescaled by the Layout Engine to solve a
   * page-fit problem. The Layout Engine may only move a protected component to
   * a new page — never alter its size.
   *
   * Used for handwriting guides, ruled lines, and any component where
   * proportions (line spacing, baseline/midline ratios) are pedagogically
   * fixed. This is the structural enforcement of "educational correctness
   * over visual appearance" — without it, a generic page-fit algorithm could
   * silently compress a baseline-to-midline ratio to save vertical space,
   * which is invisible as a layout bug but makes the line unusable for
   * handwriting practice.
   */
  protectedDimensions?: boolean;
}

export interface VersionedDocument {
  schemaVersion: string;
  appId:         AppId;
  exportedAt:    ISODateTime;
  payload:       WorksheetDocument;
}

export const PlatformComponentTypes = {
  FreeText:         'platform.free-text',
  StudentNameField: 'platform.student-name-field',
  DateField:        'platform.date-field',
  ArtworkPlacement: 'platform.artwork-placement',
  DecorativeBorder: 'platform.decorative-border',
  PageHeader:       'platform.page-header',
  PageFooter:       'platform.page-footer',
  /** Rendered on free-tier worksheets. Suppressed by the 'branding:remove-watermark' entitlement. */
  Watermark:        'platform.watermark',
} as const;

export type PlatformComponentType = typeof PlatformComponentTypes[keyof typeof PlatformComponentTypes];

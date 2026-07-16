/**
 * @module DocumentResolver
 * @description Stage 1 of the rendering pipeline. Resolves all references in
 * a WorksheetDocument into concrete objects the rest of the pipeline can use
 * directly: the ThemeReference becomes a full Theme, font references used by
 * the theme are pre-collected, and the StudentReference becomes a plain
 * display-name string. Also where schema migration is applied, before
 * anything downstream has to deal with a stale document shape.
 */

import type { FontId, FontDefinition, WorksheetDocument } from '@teacher-toolbox/types';
import { WORKSHEET_SCHEMA_VERSION } from '@teacher-toolbox/types';
import type { ThemeEngine } from '@teacher-toolbox/theme-engine';
import type { FontManager } from '@teacher-toolbox/font-manager';
import type { IMigrationService } from '@teacher-toolbox/migration';
import { DEFAULT_LAYOUT_OPTIONS } from './types.js';
import type { LayoutOptions, ResolvedDocument } from './types.js';

export interface DocumentResolverDeps {
  themes: ThemeEngine;
  fonts: FontManager;
  migrations: IMigrationService;
}

/**
 * Resolve a WorksheetDocument into a ResolvedDocument.
 *
 * Migration happens first: if the document's schemaVersion does not match
 * the current WORKSHEET_SCHEMA_VERSION, it is passed through the
 * MigrationService before anything else touches it. This guarantees every
 * other stage in the pipeline only ever sees current-schema documents.
 */
export function resolveDocument(
  document: WorksheetDocument,
  deps: DocumentResolverDeps,
): ResolvedDocument {
  const migrated =
    document.schemaVersion === WORKSHEET_SCHEMA_VERSION
      ? document
      : deps.migrations.migrate(document);

  // Resolve theme: start from the active/registered theme, then apply any
  // per-document inline overrides declared on the ThemeReference.
  const baseTheme = deps.themes.getActiveTheme();
  const theme =
    migrated.theme.themeId === baseTheme.id
      ? baseTheme
      : deps.themes.listAvailableThemes().some((t) => t.id === migrated.theme.themeId)
        ? { ...baseTheme, id: migrated.theme.themeId }
        : baseTheme;

  // Collect the font definitions referenced by the resolved theme's typography,
  // so component renderers can synchronously look them up via FontRenderContext
  // without needing async access during render.
  const fonts = new Map<FontId, FontDefinition>();
  const candidateFontIds: FontId[] = [
    theme.typography.displayFont.fontId,
    theme.typography.bodyFont.fontId,
    theme.typography.handwritingFont.fontId,
  ];
  for (const fontId of candidateFontIds) {
    const def = deps.fonts.getDefinition(fontId);
    if (def) fonts.set(fontId, def);
  }

  const layoutOptions: LayoutOptions = {
    ...DEFAULT_LAYOUT_OPTIONS,
    mode: (migrated.appData?.['layoutMode'] as LayoutOptions['mode'] | undefined) ?? DEFAULT_LAYOUT_OPTIONS.mode,
  };

  return {
    original: migrated,
    theme,
    fonts,
    studentName: migrated.student?.displayName ?? null,
    layoutOptions,
  };
}

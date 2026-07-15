/**
 * @fixtures worksheetFixtures
 * @description Sample WorksheetDocument instances for use in tests.
 * Uses generateId() — same as production code — so IDs are valid UUID v4 format.
 */
import type { WorksheetDocument, WorksheetId } from '@teacher-toolbox/types';
import { generateId, WORKSHEET_SCHEMA_VERSION, PAGE_SIZES } from '@teacher-toolbox/types';

export function makeEmptyWorksheet(overrides?: Partial<WorksheetDocument>): WorksheetDocument {
  const now = new Date().toISOString();
  return {
    id:            generateId<WorksheetId>(),
    schemaVersion: WORKSHEET_SCHEMA_VERSION,
    appId:         'icanspell' as WorksheetDocument['appId'],
    metadata: {
      title:     'Test Worksheet',
      tags:      [],
      createdAt: now,
      updatedAt: now,
      version:   1,
    },
    pageSetup: {
      size:        PAGE_SIZES.Letter,
      orientation: 'portrait',
      margins:     { top: 20, right: 20, bottom: 20, left: 20 },
    },
    theme: {
      themeId: 'default' as WorksheetDocument['theme']['themeId'],
    },
    components: [],
    ...overrides,
  };
}

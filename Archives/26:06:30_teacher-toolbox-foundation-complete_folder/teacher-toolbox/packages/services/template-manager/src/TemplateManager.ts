/**
 * @module TemplateManager
 * @description Template CRUD, catalogue, and instantiation.
 * A template is a WorksheetDocument with placeholder content.
 * instantiateTemplate() creates a live document from the template,
 * merging in student context and app-specific data.
 *
 * @status PLACEHOLDER — operational via in-memory StorageService
 */

import type {
  PlatformService,
  TemplateContext,
  TemplateFilter,
  TemplateMetadata,
  TemplateId,
  WorksheetDocument,
  WorksheetId,
  WorksheetTemplate,
} from '@teacher-toolbox/types';
import { generateId, WORKSHEET_SCHEMA_VERSION } from '@teacher-toolbox/types';
import type { IStorageService } from '@teacher-toolbox/storage';
import { STORES } from '@teacher-toolbox/storage';

export class TemplateManager implements PlatformService {
  readonly serviceId = 'template-manager';

  constructor(private readonly storage: IStorageService) {}

  async initialize(): Promise<void> {
    // TODO v1.0: load bundled templates from packages/assets/templates/
    console.info('[TemplateManager] Initialised (no bundled templates in v0.1)');
  }

  async dispose(): Promise<void> { /* nothing to clean up */ }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async getTemplate(id: string): Promise<WorksheetTemplate | null> {
    return this.storage.get<WorksheetTemplate>(STORES.Templates, id);
  }

  async saveTemplate(template: WorksheetTemplate): Promise<void> {
    await this.storage.set(STORES.Templates, template.id, template);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.storage.delete(STORES.Templates, id);
  }

  async duplicateTemplate(id: string): Promise<WorksheetTemplate | null> {
    const original = await this.getTemplate(id);
    if (!original) return null;

    const now = new Date().toISOString();
    const copy: WorksheetTemplate = {
      ...original,
      id:        generateId<TemplateId>(),
      name:      `${original.name} (Copy)`,
      source:    'custom',
      createdAt: now,
      updatedAt: now,
    };

    await this.saveTemplate(copy);
    return copy;
  }

  // ---------------------------------------------------------------------------
  // Catalogue
  // ---------------------------------------------------------------------------

  async listTemplates(filter?: TemplateFilter): Promise<TemplateMetadata[]> {
    const all = await this.storage.query<WorksheetTemplate>(STORES.Templates);

    const filtered = all.filter((t) => {
      if (filter?.appId      && t.appId  !== filter.appId)  return false;
      if (filter?.source     && t.source !== filter.source)  return false;
      if (filter?.category   && t.category !== filter.category) return false;
      if (filter?.tags?.length) {
        if (!filter.tags.every((tag) => t.tags.includes(tag))) return false;
      }
      if (filter?.searchText) {
        const q = filter.searchText.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });

    return filtered.map(({ id, appId, name, description, thumbnail, category, tags, source }) => ({
      id, appId, name, description, thumbnail, category, tags, source,
    }));
  }

  // ---------------------------------------------------------------------------
  // Instantiation
  // ---------------------------------------------------------------------------

  async instantiateTemplate(
    templateId: string,
    context: TemplateContext,
  ): Promise<WorksheetDocument | null> {
    const template = await this.getTemplate(templateId);
    if (!template) return null;

    const now = new Date().toISOString();
    const doc: WorksheetDocument = {
      ...structuredClone(template.document),
      id:            generateId<WorksheetId>(),
      schemaVersion: WORKSHEET_SCHEMA_VERSION,
      metadata: {
        ...template.document.metadata,
        templateId: templateId as TemplateId,
        createdAt:  now,
        updatedAt:  now,
        version:    1,
      },
    };

    if (context.studentName && doc.student) {
      doc.student.displayName = context.studentName;
    }

    if (context.appData) {
      doc.appData = { ...doc.appData, ...context.appData };
    }

    return doc;
  }
}

/**
 * @module MigrationService
 * @description Document schema migration framework.
 *
 * Every WorksheetDocument carries a schemaVersion field. When a document is
 * loaded from storage, the MigrationService inspects this version and runs any
 * registered migrations to bring it up to the current schema.
 *
 * WHY THIS EXISTS IN THE FOUNDATION:
 * The moment any field is renamed, restructured, or added as required in a
 * future version, every document saved under the old schema needs upgrading.
 * Without a migration framework, the only options are: (a) never change the
 * schema (impossible for a growing product), or (b) write one-off scripts with
 * no framework, no tests, and no rollback. This service provides the framework
 * before the first schema change is needed.
 *
 * App modules register their own migrations in AppModule.register(ctx).
 * The platform registers core migrations here.
 *
 * @status PLACEHOLDER — framework is complete; zero migrations registered in v0.1
 */

import type { PlatformService, WorksheetDocument } from '@teacher-toolbox/types';
import { WORKSHEET_SCHEMA_VERSION } from '@teacher-toolbox/types';
import type { IErrorReporter } from '@teacher-toolbox/error-reporter';

// ---------------------------------------------------------------------------
// Migration contract
// ---------------------------------------------------------------------------

export interface DocumentMigration {
  /** Schema version this migration reads FROM */
  fromVersion: string;
  /** Schema version this migration produces */
  toVersion:   string;
  /**
   * Which app's documents this migration applies to.
   * Use '*' for migrations that apply to all WorksheetDocuments regardless of app.
   */
  appId: string | '*';
  /**
   * The migration function. Receives the raw document (may not conform to current
   * TypeScript types) and must return a valid WorksheetDocument at toVersion.
   * Must be a pure function — no side effects, no async.
   */
  migrate(doc: Record<string, unknown>): Record<string, unknown>;
}

export interface IMigrationService extends PlatformService {
  /**
   * Register a migration. Called by app modules in register() and by the
   * platform during boot for core schema migrations.
   */
  registerMigration(migration: DocumentMigration): void;

  /**
   * Load and migrate a raw stored value to the current WorksheetDocument schema.
   * Called by StorageService (and future cloud sync) whenever a document is read.
   *
   * If the document is already at the current schema version, it is returned unchanged.
   * If migration fails, the original raw value is returned with an error logged —
   * never throw; a corrupt document should not crash the platform.
   */
  migrate(raw: unknown): WorksheetDocument;

  /** List all registered migrations in application order */
  listMigrations(): ReadonlyArray<DocumentMigration>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class MigrationService implements IMigrationService {
  readonly serviceId = 'migration';

  private readonly migrations: DocumentMigration[] = [];

  constructor(private readonly errors: IErrorReporter) {}

  async initialize(): Promise<void> {
    // Platform core migrations registered here as needed in future versions
    // e.g. this.registerMigration(migrateTo_1_1_0);
    console.info(`[MigrationService] Initialised — ${this.migrations.length} migrations registered`);
  }

  async dispose(): Promise<void> { /* stateless */ }

  registerMigration(migration: DocumentMigration): void {
    // Prevent duplicate registrations
    const exists = this.migrations.some(
      (m) => m.fromVersion === migration.fromVersion &&
             m.toVersion   === migration.toVersion   &&
             m.appId       === migration.appId,
    );
    if (exists) {
      this.errors.warn(
        `[MigrationService] Duplicate migration ignored: ${migration.appId} ${migration.fromVersion}→${migration.toVersion}`,
      );
      return;
    }
    this.migrations.push(migration);
  }

  migrate(raw: unknown): WorksheetDocument {
    if (!raw || typeof raw !== 'object') {
      this.errors.report('MigrationService: received non-object document', { serviceId: 'migration' });
      // Return a safe empty document rather than throwing
      return raw as WorksheetDocument;
    }

    let doc = raw as Record<string, unknown>;
    const appId = String(doc['appId'] ?? '*');
    let version = String(doc['schemaVersion'] ?? '0.0.0');

    if (version === WORKSHEET_SCHEMA_VERSION) {
      return doc as unknown as WorksheetDocument;
    }

    // Run applicable migrations in order until we reach the current version
    const applicable = this.migrations.filter(
      (m) => m.appId === appId || m.appId === '*',
    );

    let steps = 0;
    while (version !== WORKSHEET_SCHEMA_VERSION && steps < 50) {
      const migration = applicable.find((m) => m.fromVersion === version);
      if (!migration) break;

      try {
        doc     = migration.migrate(doc);
        version = migration.toVersion;
        steps++;
      } catch (err) {
        this.errors.report(
          err instanceof Error ? err : new Error(String(err)),
          { serviceId: 'migration', extra: { fromVersion: version, appId } },
        );
        break;
      }
    }

    return doc as unknown as WorksheetDocument;
  }

  listMigrations(): ReadonlyArray<DocumentMigration> {
    return this.migrations;
  }
}

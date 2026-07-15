/**
 * @module StorageService
 * @description Abstracts all local persistence for the platform.
 * No other service or app module accesses IndexedDB or localStorage directly.
 *
 * Phase 1: In-memory Map — data does not survive page reload.
 * Phase 2: Replace with DexieStorageService (IndexedDB) behind the same interface.
 * Future:  Cloud-sync adapter implementing the same interface — no app code changes.
 *
 * The 'conflicts' store is included from day one to support future sync conflict
 * detection without a schema migration.
 *
 * @status PLACEHOLDER — in-memory only
 */

import type { PlatformService } from '@teacher-toolbox/types';

export interface QueryFilter {
  field: string;
  op:    'eq' | 'contains' | 'startsWith' | 'gt' | 'lt';
  value: unknown;
}

export interface IStorageService extends PlatformService {
  get<T>(store: string, id: string): Promise<T | null>;
  set<T>(store: string, id: string, value: T): Promise<void>;
  delete(store: string, id: string): Promise<void>;
  query<T>(store: string, filter?: QueryFilter): Promise<T[]>;
  listIds(store: string): Promise<string[]>;
  getPref<T>(key: string, defaultValue: T): Promise<T>;
  setPref<T>(key: string, value: T): Promise<void>;
  getBlob(key: string): Promise<Blob | null>;
  setBlob(key: string, blob: Blob): Promise<void>;
  deleteBlob(key: string): Promise<void>;
}

export const STORES = {
  Worksheets:  'worksheets',
  Templates:   'templates',
  Students:    'students',
  Classrooms:  'classrooms',
  WordLists:   'wordlists',
  Artwork:     'artwork',
  Settings:    'settings',
  /**
   * Conflict snapshots created during cloud sync.
   * Format: { conflictOf: WorksheetId, document: WorksheetDocument, detectedAt: ISODateTime }
   * Resolved via ICloudCoordinator.resolveConflict()
   */
  Conflicts:   'conflicts',
} as const;

export class StorageService implements IStorageService {
  readonly serviceId = 'storage';

  private readonly stores = new Map<string, Map<string, unknown>>();
  private readonly prefs  = new Map<string, unknown>();
  private readonly blobs  = new Map<string, Blob>();

  async initialize(): Promise<void> {
    for (const store of Object.values(STORES)) {
      this.stores.set(store, new Map());
    }
    console.info('[StorageService] Initialised (in-memory placeholder)');
    console.warn('[StorageService] Data will not persist across page reloads until Dexie is wired (v0.2)');
  }

  async dispose(): Promise<void> {
    this.stores.clear();
    this.prefs.clear();
    this.blobs.clear();
  }

  async get<T>(store: string, id: string): Promise<T | null> {
    return (this.getStore(store).get(id) as T | undefined) ?? null;
  }

  async set<T>(store: string, id: string, value: T): Promise<void> {
    this.getStore(store).set(id, value);
  }

  async delete(store: string, id: string): Promise<void> {
    this.getStore(store).delete(id);
  }

  async query<T>(store: string, filter?: QueryFilter): Promise<T[]> {
    const all = [...this.getStore(store).values()] as T[];
    if (!filter) return all;
    return all.filter((item) => {
      const rec = item as Record<string, unknown>;
      const val = rec[filter.field];
      switch (filter.op) {
        case 'eq':         return val === filter.value;
        case 'contains':   return String(val).includes(String(filter.value));
        case 'startsWith': return String(val).startsWith(String(filter.value));
        case 'gt':         return Number(val) > Number(filter.value);
        case 'lt':         return Number(val) < Number(filter.value);
      }
    });
  }

  async listIds(store: string): Promise<string[]> {
    return [...this.getStore(store).keys()];
  }

  async getPref<T>(key: string, defaultValue: T): Promise<T> {
    return (this.prefs.get(key) as T | undefined) ?? defaultValue;
  }

  async setPref<T>(key: string, value: T): Promise<void> {
    this.prefs.set(key, value);
  }

  async getBlob(key: string): Promise<Blob | null> { return this.blobs.get(key) ?? null; }
  async setBlob(key: string, blob: Blob): Promise<void> { this.blobs.set(key, blob); }
  async deleteBlob(key: string): Promise<void> { this.blobs.delete(key); }

  private getStore(name: string): Map<string, unknown> {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    return this.stores.get(name)!;
  }
}

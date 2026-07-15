/**
 * @module CloudCoordinator
 * @description Cloud service availability, sync status, and conflict management.
 *
 * The platform is local-first. Cloud services are additive — the platform
 * operates fully offline and degrades gracefully when cloud is unavailable.
 *
 * This service:
 *  - Reports the availability of each cloud service (sync, backup, share, AI, assets)
 *  - Manages sync queue and reports pending item count
 *  - Handles conflict detection and routes conflicts to resolution UI
 *  - Gates cloud operations on entitlement and feature flag checks
 *
 * The IStorageService interface is designed for a future cloud adapter:
 * swap the in-memory/Dexie implementation for a cloud-backed one
 * that implements the same IStorageService interface.
 *
 * @status STUB — all services report 'not-enabled'; no network calls made
 */

import type { CloudServiceId, CloudServiceStatus, CloudServiceState, PlatformService } from '@teacher-toolbox/types';
import type { Unsubscribe } from '@teacher-toolbox/core';

export interface ICloudCoordinator extends PlatformService {
  getStatus(service: CloudServiceId): CloudServiceStatus;
  getState(): CloudServiceState;

  /**
   * Request a sync operation for the given scope.
   * Returns immediately — sync is performed asynchronously.
   * Listen to the sync:completed EventBus event for results.
   */
  requestSync(scope?: 'all' | 'worksheets' | 'settings'): void;

  onStatusChange(
    service: CloudServiceId,
    handler: (status: CloudServiceStatus) => void,
  ): Unsubscribe;

  /**
   * Resolve a detected sync conflict.
   * 'local' keeps the local version; 'cloud' keeps the cloud version.
   * 'merge' is reserved for future implementation.
   */
  resolveConflict(conflictId: string, resolution: 'local' | 'cloud' | 'merge'): Promise<void>;

  /** Returns the IDs of all unresolved sync conflicts */
  getPendingConflicts(): string[];
}

export class StubCloudCoordinator implements ICloudCoordinator {
  readonly serviceId = 'cloud-coordinator';

  private readonly handlers = new Map<
    CloudServiceId,
    Array<(status: CloudServiceStatus) => void>
  >();

  async initialize(): Promise<void> {
    console.info('[CloudCoordinator] Initialised (stub — all cloud services disabled)');
  }

  async dispose(): Promise<void> {
    this.handlers.clear();
  }

  getStatus(_service: CloudServiceId): CloudServiceStatus {
    return 'not-enabled';
  }

  getState(): CloudServiceState {
    return {
      services:     {},
      lastSyncAt:   null,
      pendingCount: 0,
    };
  }

  requestSync(_scope?: 'all' | 'worksheets' | 'settings'): void {
    console.info('[CloudCoordinator] requestSync() — no cloud service connected');
    // TODO: queue sync operation when cloud storage adapter is connected
  }

  onStatusChange(
    service: CloudServiceId,
    handler: (status: CloudServiceStatus) => void,
  ): Unsubscribe {
    if (!this.handlers.has(service)) this.handlers.set(service, []);
    this.handlers.get(service)!.push(handler);
    return () => {
      const list = this.handlers.get(service);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  async resolveConflict(_conflictId: string, _resolution: 'local' | 'cloud' | 'merge'): Promise<void> {
    console.warn('[CloudCoordinator] resolveConflict() — no sync implemented yet');
  }

  getPendingConflicts(): string[] {
    return [];
  }
}

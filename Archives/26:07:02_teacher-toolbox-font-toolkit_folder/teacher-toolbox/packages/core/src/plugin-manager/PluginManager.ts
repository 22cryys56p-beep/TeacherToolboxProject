/**
 * @module PluginManager
 * @description Manages the lifecycle of app modules.
 * App modules self-register; the shell queries the PluginManager to build
 * navigation and activate/deactivate apps.
 *
 * Includes error boundary around activate() — a broken app module
 * cannot crash the shell.
 */

import type { AppId, AppManifest, AppModule, PlatformRegistrationContext } from '@teacher-toolbox/types';
import type { EventBus } from '../event-bus/EventBus.js';

export class PluginManager {
  private readonly modules  = new Map<AppId, AppModule>();
  private activeAppId: AppId | null = null;

  constructor(private readonly bus: EventBus) {}

  /**
   * Register an app module with the platform.
   * Calls module.register(ctx) to let the module wire up its renderers,
   * event listeners, and migrations.
   *
   * @throws If an app with the same ID is already registered.
   */
  registerApp(module: AppModule, ctx: PlatformRegistrationContext): void {
    const { id, name } = module.manifest;

    if (this.modules.has(id)) {
      throw new Error(`[PluginManager] App "${id}" is already registered.`);
    }

    this.modules.set(id, module);

    // Pass the registration context so the module can wire itself up
    module.register(ctx);

    this.bus.emit({ type: 'app:registered', payload: { appId: id } });
    console.info(`[PluginManager] Registered: ${name} (${id})`);
  }

  /**
   * Activate an app module into the provided container.
   * Deactivates the current app first if one is running.
   *
   * Error boundary: if activation throws, emits app:activation-failed and
   * renders a safe fallback message into the container — never crashes the shell.
   */
  async activateApp(appId: AppId, container: HTMLElement, path: string): Promise<void> {
    if (this.activeAppId === appId) return;

    if (this.activeAppId) {
      await this.deactivateCurrentApp();
    }

    const module = this.modules.get(appId);
    if (!module) {
      throw new Error(`[PluginManager] Cannot activate unknown app "${appId}"`);
    }

    try {
      await module.activate(container, path);
      this.activeAppId = appId;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[PluginManager] Activation failed for "${appId}":`, err);

      // Render a safe fallback — never leave the container blank
      container.innerHTML = `
        <div style="padding:40px;text-align:center;font-family:system-ui;color:#666;">
          <p style="font-size:18px;margin-bottom:8px;">Unable to load ${module.manifest.name}</p>
          <p style="font-size:13px;color:#999;">Please refresh the page. If this persists, contact support.</p>
        </div>`;

      this.bus.emit({
        type: 'app:activation-failed',
        payload: { appId, error: message },
      });
    }
  }

  async deactivateCurrentApp(): Promise<void> {
    if (!this.activeAppId) return;
    const module = this.modules.get(this.activeAppId);
    if (module) {
      try {
        await module.deactivate();
      } catch (err) {
        console.error(`[PluginManager] Error deactivating "${this.activeAppId}":`, err);
      }
    }
    this.activeAppId = null;
  }

  getApp(appId: AppId):      AppModule | null  { return this.modules.get(appId) ?? null; }
  getManifest(appId: AppId): AppManifest | null { return this.modules.get(appId)?.manifest ?? null; }

  listManifests(): AppManifest[] {
    return [...this.modules.values()]
      .map((m) => m.manifest)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get currentAppId(): AppId | null { return this.activeAppId; }

  async disposeAll(): Promise<void> {
    for (const module of this.modules.values()) {
      try { await module.dispose(); }
      catch (err) { console.error(`[PluginManager] Error disposing "${module.manifest.id}":`, err); }
    }
    this.modules.clear();
  }
}

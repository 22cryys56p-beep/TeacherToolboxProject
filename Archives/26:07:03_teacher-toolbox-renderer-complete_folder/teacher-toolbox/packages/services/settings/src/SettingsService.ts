/**
 * @module SettingsService
 * @description Layered teacher preferences and per-app settings.
 *
 * Setting resolution order (last wins):
 *   1. Platform defaults (hardcoded in this file)
 *   2. Teacher preferences (persisted via StorageService)
 *   3. Per-app settings (namespaced by appId)
 *
 * App modules read/write their own namespace via getAppSetting / setAppSetting.
 * The platform shell reads/writes global settings via get / set.
 *
 * @status PLACEHOLDER — reads/writes work in-memory via StorageService
 */

import type { PlatformService } from '@teacher-toolbox/types';
import type { IStorageService } from '@teacher-toolbox/storage';

// ---------------------------------------------------------------------------
// Platform-level settings shape
// ---------------------------------------------------------------------------

export interface PlatformSettings {
  locale: string;
  colorMode: 'light' | 'dark' | 'system';
  defaultThemeId: string;
  defaultPageSize: 'Letter' | 'A4' | 'Legal' | 'A3';
  teacherName: string;
  schoolName: string;
  schoolLogoId?: string;
}

const PLATFORM_DEFAULTS: PlatformSettings = {
  locale:          'en-US',
  colorMode:       'light',
  defaultThemeId:  'default',
  defaultPageSize: 'Letter',
  teacherName:     '',
  schoolName:      '',
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const PREF_PREFIX          = 'platform:';
const APP_PREF_PREFIX      = (appId: string) => `app:${appId}:`;

export class SettingsService implements PlatformService {
  readonly serviceId = 'settings';

  constructor(private readonly storage: IStorageService) {}

  async initialize(): Promise<void> {
    console.info('[SettingsService] Initialised');
  }

  async dispose(): Promise<void> { /* nothing to flush in placeholder */ }

  // ---------------------------------------------------------------------------
  // Platform settings
  // ---------------------------------------------------------------------------

  async get<K extends keyof PlatformSettings>(
    key: K,
  ): Promise<PlatformSettings[K]> {
    const stored = await this.storage.getPref<PlatformSettings[K]>(
      `${PREF_PREFIX}${key}`,
      PLATFORM_DEFAULTS[key],
    );
    return stored;
  }

  async set<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ): Promise<void> {
    await this.storage.setPref(`${PREF_PREFIX}${key}`, value);
  }

  /** Read all platform settings, merging defaults with stored values */
  async getAll(): Promise<PlatformSettings> {
    const result = { ...PLATFORM_DEFAULTS };
    for (const key of Object.keys(PLATFORM_DEFAULTS) as (keyof PlatformSettings)[]) {
      // @ts-expect-error — dynamic key assignment is safe here
      result[key] = await this.get(key);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Per-app settings (namespaced)
  // ---------------------------------------------------------------------------

  async getAppSetting<T>(appId: string, key: string, defaultValue: T): Promise<T> {
    return this.storage.getPref<T>(`${APP_PREF_PREFIX(appId)}${key}`, defaultValue);
  }

  async setAppSetting<T>(appId: string, key: string, value: T): Promise<void> {
    await this.storage.setPref(`${APP_PREF_PREFIX(appId)}${key}`, value);
  }

  async resetAppSettings(appId: string): Promise<void> {
    // TODO v1.1: enumerate and clear app-namespaced keys
    console.info(`[SettingsService] resetAppSettings("${appId}") — not yet implemented`);
  }

  async resetToDefaults(): Promise<void> {
    for (const [key, value] of Object.entries(PLATFORM_DEFAULTS)) {
      await this.storage.setPref(`${PREF_PREFIX}${key}`, value);
    }
    console.info('[SettingsService] Reset to defaults');
  }
}

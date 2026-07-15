/**
 * @package @teacher-toolbox/types/events
 * @description All platform event types for the EventBus.
 *
 * IMPORTANT: The EventBus.on() / emit() methods accept AnyEvent (PlatformEvent | AppEvent).
 * App modules extend AppEventMap via declaration merging to add their own event types
 * without modifying this file.
 */

import type { AppId, StudentId, ThemeId, WorksheetId } from '../common/index.js';
import type { AuthState, SubscriptionState } from '../commercial/index.js';

// ---------------------------------------------------------------------------
// Platform events
// ---------------------------------------------------------------------------

export interface StudentSelectedEvent {
  type: 'student:selected';
  payload: { studentId: StudentId | null };
}

export interface ThemeChangedEvent {
  type: 'theme:changed';
  payload: { themeId: ThemeId };
}

export interface WorksheetSavedEvent {
  type: 'worksheet:saved';
  payload: { worksheetId: WorksheetId; appId: AppId };
}

export interface WorksheetOpenedEvent {
  type: 'worksheet:opened';
  payload: { worksheetId: WorksheetId; appId: AppId };
}

export interface SettingsUpdatedEvent {
  type: 'settings:updated';
  payload: { key: string; value: unknown; appId?: AppId };
}

export interface PlatformReadyEvent {
  type: 'platform:ready';
  payload: Record<string, never>;
}

export interface AppRegisteredEvent {
  type: 'app:registered';
  payload: { appId: AppId };
}

export interface AppActivationFailedEvent {
  type: 'app:activation-failed';
  payload: { appId: AppId; error: string };
}

export interface NavigationChangedEvent {
  type: 'navigation:changed';
  payload: { appId: AppId | null; path: string };
}

/** Emitted when auth state changes (sign in, sign out, token refresh, session expire) */
export interface AuthStateChangedEvent {
  type: 'auth:state-changed';
  payload: { state: AuthState };
}

/** Emitted when subscription state changes (upgrade, renewal, expiry) */
export interface SubscriptionChangedEvent {
  type: 'subscription:changed';
  payload: { state: SubscriptionState };
}

/** Emitted when a user action requires an upgrade to proceed */
export interface UpgradeRequiredEvent {
  type: 'upgrade:required';
  payload: { trigger: string; requiredTier: string };
}

/** Emitted when cloud sync completes or fails */
export interface SyncCompletedEvent {
  type: 'sync:completed';
  payload: { success: boolean; itemCount: number; error?: string };
}

// ---------------------------------------------------------------------------
// Discriminated union of all platform events
// ---------------------------------------------------------------------------

export type PlatformEvent =
  | StudentSelectedEvent
  | ThemeChangedEvent
  | WorksheetSavedEvent
  | WorksheetOpenedEvent
  | SettingsUpdatedEvent
  | PlatformReadyEvent
  | AppRegisteredEvent
  | AppActivationFailedEvent
  | NavigationChangedEvent
  | AuthStateChangedEvent
  | SubscriptionChangedEvent
  | UpgradeRequiredEvent
  | SyncCompletedEvent;

// ---------------------------------------------------------------------------
// App module event extension point
// ---------------------------------------------------------------------------

/**
 * Extend this interface in your app module to register custom event types.
 *
 * @example
 * // In apps/icanspell/src/events.ts:
 * declare module '@teacher-toolbox/types' {
 *   interface AppEventMap {
 *     'icanspell:wordlist:updated': { wordListId: string; wordCount: number };
 *   }
 * }
 */
export interface AppEventMap {
  // Augmented by app modules via declaration merging — do not add entries here
}

export type AppEvent = {
  [K in keyof AppEventMap]: { type: K; payload: AppEventMap[K] };
}[keyof AppEventMap];

/** The complete set of events the EventBus accepts */
export type AnyEvent = PlatformEvent | AppEvent;

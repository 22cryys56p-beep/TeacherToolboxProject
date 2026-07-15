/**
 * @package @teacher-toolbox/types/services
 * @description Base service contract and the AppModule interface,
 * including the PlatformRegistrationContext passed to register().
 */

import type { AppId } from '../common/index.js';

// ---------------------------------------------------------------------------
// Base service contract
// ---------------------------------------------------------------------------

export interface PlatformService {
  readonly serviceId: string;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

// ---------------------------------------------------------------------------
// App Module contract
// ---------------------------------------------------------------------------

export interface RouteDefinition {
  path:       string;
  title:      string;
  showInNav:  boolean;
  icon?:      string;
}

export type AppCapability =
  | 'worksheet:create'
  | 'worksheet:print'
  | 'worksheet:pdf'
  | 'student:personalise'
  | 'template:use'
  | 'artwork:use'
  | 'ai:generate';

export interface AppManifest {
  id:               AppId;
  name:             string;
  description:      string;
  version:          string;
  icon:             string;
  defaultRoute:     string;
  routes:           RouteDefinition[];
  capabilities:     AppCapability[];
  requiredServices: string[];
}

/**
 * Context passed to AppModule.register().
 * Contains every platform service an app module may legitimately use
 * during registration (registering renderers, listeners, migrations, etc.).
 *
 * App modules receive this object — they never import service packages directly.
 * This is the enforcement boundary for the capability/permission system.
 */
export interface PlatformRegistrationContext {
  // Core
  bus: import('../events/index.js').AnyEvent extends never ? never : {
    on(type: string, handler: (e: unknown) => void): () => void;
    emit(event: unknown): void;
  };
  // Services accessed by type name to avoid circular imports at the type level.
  // Concrete types are provided by the implementing service packages.
  renderer:   unknown;  // WorksheetRenderer — typed in worksheet-output
  settings:   unknown;  // SettingsService
  identity:   unknown;  // IIdentityService — typed in identity service
  analytics:  unknown;  // IAnalyticsService
  flags:      unknown;  // IFeatureFlags
  errors:     unknown;  // IErrorReporter
  migrations: unknown;  // IMigrationService
  ads:        unknown;  // IAdService
}

export interface AppModule {
  readonly manifest: AppManifest;

  /**
   * Called once at platform boot.
   * Register component renderers, event listeners, migrations, and settings sections.
   * The ctx parameter provides access to all platform services needed during registration.
   */
  register(ctx: PlatformRegistrationContext): void;

  /** Mount into container. Called when user navigates to this app. */
  activate(container: HTMLElement, path: string): Promise<void>;

  /** Unmount. Called when user navigates away. */
  deactivate(): Promise<void>;

  /** Release all resources. Called on platform shutdown. */
  dispose(): Promise<void>;
}

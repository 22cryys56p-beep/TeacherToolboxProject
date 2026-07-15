/**
 * @module boot
 * @description Platform boot sequence.
 *
 * Constructs and initialises all services in strict dependency order.
 * Returns the fully initialised Platform object passed to the shell and app modules.
 *
 * Dependency order (each level may only depend on levels above it):
 *
 *  Level 1 — Infrastructure (no deps)
 *    EventBus, PluginManager, Router
 *
 *  Level 2 — Persistence (no deps)
 *    StorageService
 *
 *  Level 3 — Developer tooling (depends on nothing from platform)
 *    ConsoleErrorReporter, FeatureFlagsService
 *
 *  Level 4 — User preferences (← Storage)
 *    SettingsService
 *
 *  Level 5 — Commercial identity (← Auth, Subscription → Entitlements → Identity)
 *    AnonymousAuthService, LocalSubscriptionService, EntitlementService, IdentityService
 *
 *  Level 6 — Content services (← Storage, Settings, Identity)
 *    ThemeEngine, FontManager, MigrationService, TemplateManager
 *
 *  Level 7 — Output pipeline (← Theme, Font, Identity/Entitlements)
 *    WorksheetRenderer, WorksheetPDF, WorksheetPrint
 *
 *  Level 8 — Peripheral services (← Identity, Bus)
 *    StubAnalyticsService, StubAdService, StubCloudCoordinator, AIService
 */

import { EventBus, PluginManager, Router }   from '@teacher-toolbox/core';
import { StorageService }                    from '@teacher-toolbox/storage';
import { SettingsService }                   from '@teacher-toolbox/settings';
import { ThemeEngine }                       from '@teacher-toolbox/theme-engine';
import { FontManager }                       from '@teacher-toolbox/font-manager';
import { WorksheetRenderer, WorksheetPDF, WorksheetPrint } from '@teacher-toolbox/worksheet-output';
import { TemplateManager }                   from '@teacher-toolbox/template-manager';
import { AIService }                         from '@teacher-toolbox/ai-service';
import { ConsoleErrorReporter }              from '@teacher-toolbox/error-reporter';
import { MigrationService }                  from '@teacher-toolbox/migration';
import { FeatureFlagsService }               from '@teacher-toolbox/feature-flags';
import { StubAnalyticsService }              from '@teacher-toolbox/analytics';
import {
  AnonymousAuthService,
  LocalSubscriptionService,
  EntitlementService,
  IdentityService,
}                                            from '@teacher-toolbox/identity';
import { StubAdService }                     from '@teacher-toolbox/ad-service';
import { StubCloudCoordinator }              from '@teacher-toolbox/cloud-coordinator';

import type { PlatformRegistrationContext }  from '@teacher-toolbox/types';
import type { IErrorReporter }               from '@teacher-toolbox/error-reporter';
import type { IFeatureFlags }                from '@teacher-toolbox/feature-flags';
import type { IAnalyticsService }            from '@teacher-toolbox/analytics';
import type { IIdentityService }             from '@teacher-toolbox/identity';
import type { IMigrationService }            from '@teacher-toolbox/migration';
import type { IAdService }                   from '@teacher-toolbox/ad-service';

import { config }                            from './config.js';

// ---------------------------------------------------------------------------
// Platform type
// ---------------------------------------------------------------------------

export interface Platform {
  // Core infrastructure
  bus:         EventBus;
  plugins:     PluginManager;
  router:      Router;

  // Persistence + settings
  storage:     StorageService;
  settings:    SettingsService;

  // Developer tooling
  errors:      IErrorReporter;
  flags:       IFeatureFlags;

  // Commercial identity
  identity:    IIdentityService;

  // Content services
  themes:      ThemeEngine;
  fonts:       FontManager;
  migrations:  IMigrationService;
  templates:   TemplateManager;

  // Output pipeline
  renderer:    WorksheetRenderer;
  pdf:         WorksheetPDF;
  print:       WorksheetPrint;

  // Peripheral services
  analytics:   IAnalyticsService;
  ads:         IAdService;
  cloud:       StubCloudCoordinator;
  ai:          AIService;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

export async function boot(): Promise<Platform> {
  console.info(`[boot] ${config.appName} ${config.appVersion} — starting up…`);
  const t0 = performance.now();

  // ── Level 1: Infrastructure ────────────────────────────────────────────────
  const bus     = new EventBus();
  const plugins = new PluginManager(bus);
  const router  = new Router(bus);

  // ── Level 2: Persistence ───────────────────────────────────────────────────
  const storage = new StorageService();
  await storage.initialize();

  // ── Level 3: Developer tooling ─────────────────────────────────────────────
  const errors = new ConsoleErrorReporter();
  const flags  = new FeatureFlagsService();
  await errors.initialize();
  await flags.initialize();

  // ── Level 4: Settings ──────────────────────────────────────────────────────
  const settings = new SettingsService(storage);
  await settings.initialize();

  // ── Level 5: Commercial identity ───────────────────────────────────────────
  const auth         = new AnonymousAuthService();
  const subscription = new LocalSubscriptionService();
  await auth.initialize();
  await subscription.initialize();

  const entitlements = new EntitlementService(subscription.getState());
  const identity     = new IdentityService(auth, subscription, entitlements);
  await entitlements.initialize();
  await identity.initialize();

  // ── Level 6: Content services ──────────────────────────────────────────────
  const themes     = new ThemeEngine(settings);
  const fonts      = new FontManager(storage);
  const migrations = new MigrationService(errors);
  await themes.initialize();
  await fonts.initialize();
  await migrations.initialize();

  const templates = new TemplateManager(storage);
  await templates.initialize();

  // ── Level 7: Output pipeline ───────────────────────────────────────────────
  const renderer = new WorksheetRenderer(themes, fonts, migrations, identity);
  const pdf      = new WorksheetPDF(renderer);
  const print    = new WorksheetPrint(renderer);

  // ── Level 8: Peripheral services ───────────────────────────────────────────
  const analytics = new StubAnalyticsService();
  const ads       = new StubAdService(identity);
  const cloud     = new StubCloudCoordinator();
  const ai        = new AIService();
  await analytics.initialize();
  await ads.initialize();
  await cloud.initialize();
  await ai.initialize();

  // ── Registration context (passed to every app module's register()) ─────────
  // This is constructed here — after all services are initialised — and passed
  // to PluginManager.registerApp(). App modules receive only this context;
  // they never import service packages directly.
  const registrationCtx: PlatformRegistrationContext = {
    bus:        bus as unknown as PlatformRegistrationContext['bus'],
    renderer,
    settings,
    identity,
    analytics,
    flags,
    errors,
    migrations,
    ads,
  };

  // Expose the context so main.ts can pass it to registerApp()
  (plugins as unknown as { _ctx: PlatformRegistrationContext })._ctx = registrationCtx;

  // ── Platform ready ─────────────────────────────────────────────────────────
  const elapsed = (performance.now() - t0).toFixed(1);
  console.info(`[boot] Platform ready in ${elapsed}ms`);

  if (config.analyticsEnabled) {
    analytics.track({ name: 'platform:booted', props: { durationMs: Number(elapsed) } });
  }

  bus.emit({ type: 'platform:ready', payload: {} });

  return {
    bus, plugins, router,
    storage, settings,
    errors, flags,
    identity,
    themes, fonts, migrations, templates,
    renderer, pdf, print,
    analytics, ads, cloud, ai,
  };
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

export async function shutdown(p: Platform): Promise<void> {
  console.info('[boot] Shutting down…');
  p.router.stop();
  await p.plugins.disposeAll();
  // Dispose in reverse init order
  await p.ai.dispose();
  await p.cloud.dispose();
  await p.ads.dispose();
  await p.analytics.dispose();
  await p.templates.dispose();
  await p.migrations.dispose();
  await p.fonts.dispose();
  await p.themes.dispose();
  await p.identity.dispose();
  await p.settings.dispose();
  await p.flags.dispose();
  await p.errors.dispose();
  await p.storage.dispose();
  console.info('[boot] Shutdown complete');
}

/** Helper used by main.ts to obtain the registration context after boot */
export function getRegistrationContext(plugins: PluginManager): PlatformRegistrationContext {
  return (plugins as unknown as { _ctx: PlatformRegistrationContext })._ctx;
}

# Teacher Toolbox — Platform Services Reference
**Version:** 0.1.0  
**Status:** Foundation Complete — Pre-v0.2

This document is the authoritative reference for every platform service. It covers purpose, responsibilities, public interface, current implementation status, planned implementation, and the dependency rules that keep the architecture clean.

**Dependency rule:** Services are arranged in layers. A service may only depend on services in layers above it (closer to the top of this document). No service imports from an app module. No app module imports from another app module.

---

## Layer 0 — Types

### `@teacher-toolbox/types`

**Purpose:** Single source of truth for all shared TypeScript interfaces, types, and enums. The foundation every other package builds on.

**Responsibilities:**
- Define all domain entities: `WorksheetDocument`, `Student`, `Classroom`, `WorksheetTemplate`, `Theme`, `FontDefinition`, `ArtworkItem`
- Define all commercial types: `AuthState`, `SubscriptionState`, `Entitlement`, `IdentityContext`, `AdUnit`, `CloudServiceState`
- Define all event types for the `EventBus` (`PlatformEvent`, `AppEvent`, `AnyEvent`)
- Define the `AppModule` and `AppManifest` contracts
- Define `SyncMetadata` — the `userId`, `syncedAt`, `conflictOf` fields present on every cloud-syncable entity
- Export `generateId<T>()` — the platform-wide UUID factory
- Export `PAGE_SIZES`, `WORKSHEET_SCHEMA_VERSION`, `PlatformComponentTypes`

**Public interface:** Pure TypeScript types — no runtime exports except `generateId()`, `ok()`, `err()`, and constants.

**Current status:** ✅ Complete. All domain, commercial, event, and service types defined.

**Planned future:** New types are added here as new features are designed. Types are never removed — only deprecated with `@deprecated` JSDoc. Breaking type changes require a major version bump and a migration path.

**May be depended on by:** Every package in the monorepo.  
**Must never depend on:** Any other `@teacher-toolbox/*` package.

---

## Layer 1 — Core Infrastructure

### `@teacher-toolbox/core`

**Purpose:** The load-bearing infrastructure that makes the plugin architecture work. Three classes and one utility.

**Responsibilities:**

*EventBus* — Typed publish/subscribe. The enforcement mechanism for the open/closed principle. Modules communicate only through typed events, never by importing each other. Accepts both `PlatformEvent` (built-in) and `AppEvent` (app-module extensions via declaration merging). Handler errors are caught individually so a broken handler cannot prevent other handlers from running.

*PluginManager* — App module lifecycle management. Receives `AppModule` implementations and a `PlatformRegistrationContext`, calls `register(ctx)` to let each module wire itself up, then manages `activate → deactivate → dispose` transitions. Contains an error boundary around `activate()` so a broken app module renders a safe fallback card rather than crashing the shell.

*Router* — Hash-based client-side navigation (`/#/appId/subpath`). Works from a static CDN or `file://` with no server configuration. Emits `navigation:changed` on every route change. The shell subscribes and delegates to `PluginManager.activateApp()`.

*generateId* — Re-exported from `@teacher-toolbox/types`. All entity ID creation uses `crypto.randomUUID()` — never `Date.now()` or `Math.random()`. UUID v4 is offline-generatable and globally unique, making it safe for future cloud sync without collision.

**Public interface:**
```typescript
class EventBus {
  on(type, handler): Unsubscribe
  onApp(type, handler): Unsubscribe   // for app-module custom events
  once(type, handler): Unsubscribe
  emit(event: AnyEvent): void
  removeAllListeners(type?): void
}

class PluginManager {
  registerApp(module: AppModule, ctx: PlatformRegistrationContext): void
  activateApp(appId, container, path): Promise<void>
  deactivateCurrentApp(): Promise<void>
  getApp(appId): AppModule | null
  getManifest(appId): AppManifest | null
  listManifests(): AppManifest[]
  disposeAll(): Promise<void>
}

class Router {
  start(): void
  stop(): void
  navigate(path): void
  navigateToApp(appId, subPath?): void
  getCurrentRoute(): ParsedRoute | null
  onChange(handler): Unsubscribe
}

function generateId<T extends BrandedId<string>>(): T
```

**Current status:** ✅ Complete. EventBus accepts `AnyEvent` (fix from architecture review applied). PluginManager has error boundary and passes `PlatformRegistrationContext` to `register()`. Router is hash-based.

**Planned future:** Router gains `:param` pattern matching (v0.2). PluginManager gains dynamic app loading via `import()` (v2.0 when second app ships).

**May be depended on by:** All service packages, all app modules.  
**Must never depend on:** Any service package, any app module.

---

## Layer 2 — Persistence

### `@teacher-toolbox/storage`

**Purpose:** Abstracts all local persistence. Nothing else in the platform touches IndexedDB, localStorage, or any storage API directly.

**Responsibilities:**
- Provide a typed key/value document store for structured data (worksheets, templates, students)
- Provide a preference store for simple key/value settings (survives sessions in the real implementation)
- Provide a blob store for binary data (teacher-uploaded fonts, artwork)
- Define all named store identifiers in the `STORES` constant
- Include the `conflicts` store from day one for future cloud sync conflict snapshots

**Named stores:** `worksheets`, `templates`, `students`, `classrooms`, `wordlists`, `artwork`, `settings`, `conflicts`

**Public interface:**
```typescript
interface IStorageService extends PlatformService {
  get<T>(store, id): Promise<T | null>
  set<T>(store, id, value): Promise<void>
  delete(store, id): Promise<void>
  query<T>(store, filter?): Promise<T[]>
  listIds(store): Promise<string[]>
  getPref<T>(key, defaultValue): Promise<T>
  setPref<T>(key, value): Promise<void>
  getBlob(key): Promise<Blob | null>
  setBlob(key, blob): Promise<void>
  deleteBlob(key): Promise<void>
}
```

**Current status:** ✅ Placeholder. `StorageService` is an in-memory Map — fully functional, data does not survive page reload. The `IStorageService` interface is stable.

**Planned future (v0.2):** Replace `StorageService` with `DexieStorageService` implementing the same `IStorageService` interface. Dexie.js provides typed IndexedDB access with migration support. No call sites change — the interface is the contract, not the implementation.

**Planned future (cloud era):** A `CloudStorageService` wraps the same `IStorageService` interface and routes writes to both local and remote. Sync conflicts are detected by comparing `updatedAt` timestamps and written to the `conflicts` store for resolution via `ICloudCoordinator`.

**May be depended on by:** `settings`, `font-manager`, `template-manager`, `migration`, and any future service that persists data.  
**Must never depend on:** Any other service package. Any app module.

---

## Layer 3 — Developer Tooling

These services have no platform dependencies and are initialised first so they are available to all subsequent services during their own initialisation.

### `@teacher-toolbox/error-reporter`

**Purpose:** Centralised error and warning reporting. The single swap point for routing platform errors to a remote telemetry service.

**Responsibilities:**
- Receive structured error reports from all services and app modules
- Attach `ErrorContext` (appId, documentId, serviceId, userId) to every report
- Distinguish between unexpected errors (`report`), recoverable warnings (`warn`), and handled-but-notable catches (`capture`)
- In Phase 1: write to `console.error/warn/info`
- In future: forward to Sentry, Datadog, or a custom endpoint

**Public interface:**
```typescript
interface IErrorReporter extends PlatformService {
  report(error: Error | string, context?: ErrorContext): void
  warn(message: string, context?: ErrorContext): void
  capture(error: Error | string, context?: ErrorContext): void
}

interface ErrorContext {
  appId?:      string
  documentId?: string
  serviceId?:  string
  userId?:     string
  extra?:      Record<string, unknown>
}
```

**Current status:** ✅ Implemented. `ConsoleErrorReporter` wraps `console.error/warn/info` with structured context logging.

**Planned future:** Swap `ConsoleErrorReporter` for a `RemoteErrorReporter` that batches and sends to a telemetry endpoint when cloud services are enabled. The interface is identical — no call site changes.

**May be depended on by:** All service packages (via injection), all app modules (via `PlatformRegistrationContext`).  
**Must never depend on:** Any other service package.

---

### `@teacher-toolbox/feature-flags`

**Purpose:** Runtime feature flag evaluation. Controls which capabilities are visible in the UI, independent of subscription entitlements.

**Responsibilities:**
- Evaluate boolean flags against bundled defaults
- Support per-session overrides for dev tools and testing
- Provide a typed `FeatureFlag` union covering all gatable capabilities
- In future: merge bundled defaults with remote config overrides (LaunchDarkly, Unleash, or custom)

**Key distinction:** Feature flags answer "does this feature exist yet?" Entitlements answer "is this user allowed to use it?" Both checks are required for a fully gated feature.

**Public interface:**
```typescript
interface IFeatureFlags extends PlatformService {
  isEnabled(flag: FeatureFlag): boolean
  getVariant(flag: VariantFlag): string | null
  override(flag: FeatureFlag, value: boolean): void   // dev/test only
  clearOverrides(): void
}
```

**Current status:** ✅ Implemented. All flags default to `false`. `BUNDLED_FLAGS` object enables flags as features stabilise.

**Planned future:** Add remote config fetch in `initialize()`. Remote overrides merge on top of bundled defaults. Specific users (beta testers, reviewers) can have flags enabled server-side without a code deployment.

**May be depended on by:** All service packages and app modules (via `PlatformRegistrationContext`).  
**Must never depend on:** Any other service package.

---

## Layer 4 — User Preferences

### `@teacher-toolbox/settings`

**Purpose:** Layered teacher preferences and per-app configuration.

**Responsibilities:**
- Store and retrieve platform-level preferences (locale, colour mode, default theme, teacher name, school name)
- Store and retrieve per-app settings namespaced by `appId`
- Provide typed defaults so every `get()` call has a fallback
- Support bulk export/import for teacher onboarding and device transfer

**Setting resolution order (last wins):**
1. Hardcoded platform defaults (in `SettingsService`)
2. Teacher preferences (persisted via `StorageService`)
3. Per-app settings (namespaced `app:{appId}:{key}`)
4. Per-document overrides (stored inside `WorksheetDocument`)

**Public interface:**
```typescript
class SettingsService extends PlatformService {
  get<K extends keyof PlatformSettings>(key: K): Promise<PlatformSettings[K]>
  set<K extends keyof PlatformSettings>(key: K, value): Promise<void>
  getAll(): Promise<PlatformSettings>
  getAppSetting<T>(appId, key, defaultValue): Promise<T>
  setAppSetting<T>(appId, key, value): Promise<void>
  resetToDefaults(): Promise<void>
}
```

**Current status:** ✅ Functional. Reads/writes through `StorageService` in-memory store.

**Planned future:** No structural changes needed. When `StorageService` swaps to Dexie, preferences automatically persist. Cloud sync of preferences is an `ICloudCoordinator` concern.

**May be depended on by:** `theme-engine`, app modules (via `PlatformRegistrationContext`).  
**Must never depend on:** `theme-engine`, `identity`, or any service at Layer 5+.

---

## Layer 5 — Commercial Identity

These four services form the commercial identity layer. They must be initialised before any service or UI component that gates on subscription, entitlements, or auth state.

### `@teacher-toolbox/identity` — AuthService

**Purpose:** Authentication state management. Manages the user lifecycle from anonymous through authenticated to expired.

**Responsibilities:**
- Maintain the current `AuthState` (status, userId, email, displayName, provider, sessionToken)
- Provide sign-in entry points for each `AuthProvider` (Google, Microsoft, email, SAML SSO)
- Handle silent session refresh
- Notify subscribers of any state change
- Keep the session token internal — never expose it to app modules

**Public interface:**
```typescript
interface IAuthService extends PlatformService {
  getState(): AuthState
  signIn(provider: AuthProvider): Promise<void>
  signOut(): Promise<void>
  refreshSession(): Promise<boolean>
  onStateChange(handler): Unsubscribe
}
```

**Current status:** ✅ Stub. `AnonymousAuthService` always returns `{ status: 'anonymous' }`. No network calls.

**Planned future:** Implement a concrete `AuthService` integrating with the chosen provider (Firebase Auth, Supabase, Auth0, or custom JWT). The stub's `onStateChange` infrastructure is already wired — adding real auth is an implementation swap, not an interface change. Session tokens are stored in memory only (never `localStorage`) to mitigate XSS risk.

**May be depended on by:** `identity` (IdentityService only).  
**Must never depend on:** Any other service. App modules must never import `IAuthService` directly — they use `IIdentityService`.

---

### `@teacher-toolbox/identity` — SubscriptionService

**Purpose:** Tracks the user's commercial relationship with the platform.

**Responsibilities:**
- Maintain current `SubscriptionState` (tier, status, expiry, organisation, seat counts)
- Open the upgrade flow when called
- Refresh subscription status from the billing backend after payment events
- Notify subscribers of state changes

**Public interface:**
```typescript
interface ISubscriptionService extends PlatformService {
  getState(): SubscriptionState
  openUpgradeFlow(trigger?: string): Promise<void>
  refresh(): Promise<void>
  onStateChange(handler): Unsubscribe
}
```

**Current status:** ✅ Stub. `LocalSubscriptionService` always returns `{ tier: 'free', status: 'none' }`.

**Planned future:** Implement `RemoteSubscriptionService` that verifies status against Stripe/Paddle on load and after webhook receipt. Subscription state is cached locally with a TTL so offline users retain their access. The `openUpgradeFlow()` method redirects to the billing portal URL from `config.billingPortalUrl`.

**May be depended on by:** `identity` (IdentityService and EntitlementService only).  
**Must never depend on:** Any other service. App modules must never import `ISubscriptionService` directly.

---

### `@teacher-toolbox/identity` — EntitlementService

**Purpose:** Resolves subscription tier + promotional grants into yes/no capability checks.

**Responsibilities:**
- Maintain the `ENTITLEMENT_MATRIX` — the authoritative map from entitlement to permitted tiers
- Resolve `has(entitlement)` as a single boolean regardless of how the grant was acquired
- Return `getLimit()` for capped entitlements (free tier student/classroom caps)
- Return `getReason()` with upgrade target and trigger for UI components showing paywall prompts
- Provide `gate()` for clean conditional code paths
- Update when subscription state changes (called by `IdentityService`)

**Public interface:**
```typescript
interface IEntitlementService extends PlatformService {
  has(entitlement: Entitlement): boolean
  getLimit(entitlement: LimitedEntitlement): number   // Infinity = unlimited
  getReason(entitlement: Entitlement): EntitlementReason
  gate<T>(entitlement, onGranted, onDenied): T
  updateSubscription(state: SubscriptionState): void
}
```

**Current status:** ✅ Implemented. `EntitlementService` resolves correctly against the `ENTITLEMENT_MATRIX`. Free tier gets `export:pdf` and all current app modules. All paid features correctly denied.

**Planned future:** Add promotional grant overlay (time-limited grants from marketing campaigns applied on top of subscription). Add admin override capability for school IT departments. The matrix is the single place to change when new tiers or bundles are introduced.

**May be depended on by:** `identity` (IdentityService only).  
**Must never depend on:** Any other service. App modules check entitlements through `IIdentityService.can()`, not directly.

---

### `@teacher-toolbox/identity` — IdentityService

**Purpose:** The single source of truth for all commercial questions. Composes auth + subscription + entitlements into one `IdentityContext`.

**Responsibilities:**
- Compose `AuthState`, `SubscriptionState`, and resolved `AdEligibility` into `IdentityContext`
- Re-compute and re-emit context whenever auth or subscription changes
- Provide `can()`, `isPaid()`, `isAnonymous()` convenience methods
- Be the **only** commercial service that app modules interact with directly

**The key architectural rule:** App modules import `IIdentityService` only. They never import `IAuthService`, `ISubscriptionService`, or `IEntitlementService`. This means the commercial model (new tiers, promotional grants, bundle deals) can change entirely without touching app module code.

**Public interface:**
```typescript
interface IIdentityService extends PlatformService {
  getContext(): IdentityContext
  can(entitlement: Entitlement): boolean
  isPaid(): boolean
  isAnonymous(): boolean
  onContextChange(handler): Unsubscribe
}
```

**Current status:** ✅ Implemented. Wires `AnonymousAuthService` + `LocalSubscriptionService` + `EntitlementService`. Context is anonymous/free tier. Re-composition on state change is wired and tested in types.

**Planned future:** No interface changes needed. When real auth and subscription services are swapped in, `IdentityService` reacts automatically via its `onStateChange` subscriptions.

**May be depended on by:** `ad-service`, `worksheet-output` (watermark check), `template-manager`, all app modules (via `PlatformRegistrationContext`).  
**Must never depend on:** `worksheet-output`, `template-manager`, `theme-engine`, or any Layer 6+ service.

---

## Layer 6 — Content Services

### `@teacher-toolbox/theme-engine`

**Purpose:** Loads, validates, and applies themes. Bridges the theme data model to both the CSS variable system (shell UI) and the render context (WorksheetRenderer).

**Responsibilities:**
- Maintain a registry of `Theme` objects
- Apply the active theme by injecting CSS custom properties into `document.documentElement`
- Provide `ThemeRenderContext` to the `WorksheetRenderer` — no DOM dependency, fully testable
- Allow app modules to extend theme namespaces without modifying the theme definition
- Load the bundled default theme; load additional themes from `packages/assets/themes/`

**Public interface:**
```typescript
class ThemeEngine extends PlatformService {
  applyTheme(themeId): Promise<void>
  getActiveTheme(): Theme
  listAvailableThemes(): ThemeMetadata[]
  registerTheme(theme: Theme): void
  injectCSSVariables(theme, root?): void
  getRenderContext(): ThemeRenderContext
  extendTheme(themeId, namespace, tokens): void
  getExtension<T>(namespace, themeId?): T | null
}
```

**Current status:** ✅ Functional. Default theme loads and injects CSS variables. `defaultTheme.ts` uses `SYSTEM_FONT_IDS` from `FontManager` — no casting workarounds.

**Planned future (v1.0):** Add `classic-blue`, `high-contrast`, `seasonal-autumn` themes from `packages/assets/themes/`. Add teacher-importable custom theme JSON.

**May be depended on by:** `worksheet-output`.  
**Must never depend on:** `worksheet-output`, `identity`, or any Layer 7+ service.

---

### `@teacher-toolbox/font-manager`

**Purpose:** Font metadata registry, web font loading, and SVG glyph path access for handwriting rendering.

**Responsibilities:**
- Pre-register system fonts (`system-sans`, `system-mono`, `system-serif`) at construction — always available, no file loading
- Register `FontDefinition` records for bundled and user-uploaded fonts
- Register `SVGPathFont` records for handwriting fonts (custom JSON format)
- Load web fonts via the `FontFace` API on demand
- Provide `getGlyphPath()` and `getWordPath()` for the `WorksheetRenderer` to access SVG glyph paths
- Store teacher-uploaded font blobs in `StorageService`

**The SVG path font format** is the critical design decision: standard web fonts cannot be decomposed into stroke paths. The custom `SVGPathFont` / `SVGGlyph` format in `@teacher-toolbox/types` stores each glyph as an SVG path string with dimensional metadata, enabling dotted trace overlays, ghost guides, opacity control, and future stroke animation.

**Public interface:**
```typescript
class FontManager extends PlatformService {
  registerDefinition(def: FontDefinition): void
  registerSVGPathFont(font: SVGPathFont): void
  getDefinition(fontId): FontDefinition | null
  listDefinitions(filter?): FontDefinition[]
  listHandwritingFonts(): FontDefinition[]
  isSystemFont(fontId): boolean
  loadWebFont(fontId): Promise<FontFace | null>
  getGlyphPath(fontId, character, sizePt): string | null
  getWordPath(fontId, word, sizePt): string | null
}
```

**Current status:** ✅ Foundation. System fonts registered. `getGlyphPath` / `getWordPath` return `null` until SVG path fonts are loaded (v0.3).

**Planned future (v0.3):** Load first SVG path font (Zaner-Bloser Print) from `packages/assets/fonts/`. Implement `scalePath()` using a proper SVG path transformer. Full glyph rendering enables the handwriting line component.

**May be depended on by:** `worksheet-output`, `theme-engine`.  
**Must never depend on:** `worksheet-output`, `identity`, or any Layer 7+ service.

---

### `@teacher-toolbox/migration`

**Purpose:** Document schema migration framework. Upgrades stored `WorksheetDocument` records from older schema versions to the current version before rendering.

**Responsibilities:**
- Accept `DocumentMigration` registrations from app modules (in `register(ctx)`) and from core (in `initialize()`)
- Chain applicable migrations in version order when a document's `schemaVersion` is older than `WORKSHEET_SCHEMA_VERSION`
- Handle migration failures gracefully — log the error, return the best available document, never throw
- Support per-app migrations (`appId` filter) and cross-app migrations (`appId: '*'`)

**Public interface:**
```typescript
interface IMigrationService extends PlatformService {
  registerMigration(migration: DocumentMigration): void
  migrate(raw: unknown): WorksheetDocument
  listMigrations(): ReadonlyArray<DocumentMigration>
}

interface DocumentMigration {
  fromVersion: string
  toVersion:   string
  appId:       string | '*'
  migrate(doc: Record<string, unknown>): Record<string, unknown>
}
```

**Current status:** ✅ Framework complete. Zero migrations registered — correct for v0.1 where no schema changes have occurred yet.

**Planned future:** App modules register migrations in `register(ctx)`. The `StorageService` (and future cloud storage adapter) calls `migrate()` on every document load. Migrations are pure functions — testable in isolation with no service dependencies.

**May be depended on by:** `storage` (when Dexie implementation wraps loads through migration), app modules (via `PlatformRegistrationContext` to register their own migrations).  
**Must never depend on:** `worksheet-output`, `identity`, or any Layer 7+ service.

---

### `@teacher-toolbox/template-manager`

**Purpose:** Template CRUD, catalogue querying, and instantiation into live worksheet documents.

**Responsibilities:**
- Store and retrieve `WorksheetTemplate` records via `StorageService`
- Filter template catalogue by `appId`, `category`, `tags`, `source`, and `searchText`
- Instantiate a template into a live `WorksheetDocument` by merging student context and app data
- Deduplicate templates (duplicate command creates a new record with `source: 'custom'`)
- Load bundled templates from `packages/assets/templates/` at initialisation

**Public interface:**
```typescript
class TemplateManager extends PlatformService {
  getTemplate(id): Promise<WorksheetTemplate | null>
  saveTemplate(template): Promise<void>
  deleteTemplate(id): Promise<void>
  duplicateTemplate(id): Promise<WorksheetTemplate | null>
  listTemplates(filter?): Promise<TemplateMetadata[]>
  instantiateTemplate(templateId, context): Promise<WorksheetDocument | null>
}
```

**Current status:** ✅ Functional. Full CRUD and filtering works through the in-memory `StorageService`. No bundled templates yet (added in v1.0).

**Planned future (v1.0):** Load 10+ bundled iCanSpell templates from `packages/assets/templates/`. Add import/export of template files (`.ttx` format). Add community template download (post v1.0).

**May be depended on by:** App modules (via `PlatformRegistrationContext`).  
**Must never depend on:** `worksheet-output`, `identity`, or any Layer 7+ service.

---

## Layer 7 — Output Pipeline

### `@teacher-toolbox/worksheet-output`

**Purpose:** The authoritative visual output pipeline. One `WorksheetDocument` in → identical output in all three modes (SVG preview, PDF download, browser print).

This package contains three classes with distinct responsibilities, kept together because they are always versioned together and share the core invariant: the same document must produce the same visual output in all three modes.

#### WorksheetRenderer

**Responsibilities:**
- Convert `WorksheetDocument` to `SVGSVGElement` at any fidelity (preview / full)
- Maintain a registry of `ComponentRenderer` functions dispatched by `component.type`
- Call `ThemeEngine.getRenderContext()` for colour, font, and decoration tokens
- Call `FontManager.getGlyphPath()` for handwriting text rendering
- Support `platform.*` built-in component types
- Conditionally append `platform.watermark` when `entitlements.has('branding:remove-watermark')` is false
- App modules register their own component renderers in `register(ctx)`

**Public interface:**
```typescript
class WorksheetRenderer {
  registerComponentRenderer(type: string, renderer: ComponentRenderer): void
  renderPreview(doc: WorksheetDocument): SVGSVGElement
  renderFull(doc: WorksheetDocument): SVGSVGElement
}

type ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
  svg: SVGSVGElement
) => SVGGElement
```

**Current status:** ✅ Placeholder. Renders page background, content area group, and unknown-component placeholders. No platform component renderers implemented yet (v0.2).

#### WorksheetPDF

**Responsibilities:**
- Accept a `WorksheetDocument`, call `WorksheetRenderer.renderFull()`, convert SVG to PDF
- Trigger browser download via `<a download>`
- Support batch PDF (multiple documents → single multi-page file) for class-set printing
- Embed custom fonts in the PDF output

**Current status:** ✅ Placeholder. Downloads an SVG file as a stand-in. `generate()` and `generateBatch()` interfaces are stable.

**Planned future (v0.2):** Integrate `jsPDF` + `svg2pdf.js`. Switching libraries later only touches this class.

#### WorksheetPrint

**Responsibilities:**
- Inject a hidden iframe with `@media print` CSS
- Call `WorksheetRenderer.renderFull()` for each document
- Trigger `window.print()` and clean up the iframe
- Support batch printing (multiple documents → multiple pages)

**Current status:** ✅ Functional. Basic browser printing works. Page break handling needs cross-browser testing (v0.2 task).

**May be depended on by:** App modules (via `PlatformRegistrationContext` → renderer reference).  
**Must never depend on:** `identity`, `ad-service`, `analytics`, or any Layer 8 service. **The renderer must never receive `IAdService` as a dependency** — ads belong in the shell UI only. The watermark is handled through entitlements, not advertising.

---

## Layer 8 — Peripheral Services

These services have no output-pipeline dependencies and do not affect the rendering of worksheets.

### `@teacher-toolbox/analytics`

**Purpose:** Product instrumentation. Tracks user behaviour to inform feature development and commercial decisions.

**Responsibilities:**
- Accept structured `AnalyticsEvent` values with typed `props` per event name
- Associate events with an authenticated user via `identify()`
- Attach session properties (subscription tier, locale, app version) to all events
- In future: batch and send to a telemetry provider

**Privacy rule:** This service must never receive PII (student names, email addresses, worksheet content). It tracks behaviour only. The `userId` is an opaque platform ID.

**Public interface:**
```typescript
interface IAnalyticsService extends PlatformService {
  track(event: AnalyticsEvent): void
  identify(userId: string | null): void
  setSessionProperty(key, value): void
}
```

**Current status:** ✅ Stub. `StubAnalyticsService` accepts all calls and performs no work. All event types are fully defined and typed.

**Planned future:** Swap `StubAnalyticsService` for a `RemoteAnalyticsService` (Mixpanel, Amplitude, PostHog, or custom pipeline) when `config.analyticsEnabled` is true.

**May be depended on by:** App modules (via `PlatformRegistrationContext`), shell UI components.  
**Must never depend on:** `worksheet-output`, `storage`, or any service that processes worksheet content.

---

### `@teacher-toolbox/ad-service`

**Purpose:** Advertising delivery with consent and legal guardrails built into the interface.

**Responsibilities:**
- Return `AdUnit | null` for a given format and context — callers only check for null
- Enforce `AdEligibility` from `IdentityContext`: paid users always get null
- Distinguish `self-serve` ads (Teacher Toolbox own promotions — always legal) from `third-party` ads (external networks — requires explicit consent)
- Guard third-party consent: `hasThirdPartyConsent()` is always false by default; requires affirmative opt-in through `requestThirdPartyConsent()`
- Track impressions, clicks, and dismissals for conversion reporting
- Respect locale exclusions (COPPA, GDPR Article 8, POPIA)

**Architectural constraint:** `IAdService` must **never** be injected into `WorksheetRenderer`. Ads appear only in shell UI components. The only thing printed on free-tier worksheets is the `platform.watermark` component, which is handled by entitlements.

**Public interface:**
```typescript
interface IAdService extends PlatformService {
  getAd(format: AdFormat, context: AdContext): AdUnit | null
  hasThirdPartyConsent(): boolean
  requestThirdPartyConsent(): Promise<boolean>
  trackImpression(adId): void
  trackClick(adId, action): void
  trackDismissal(adId): void
}
```

**Current status:** ✅ Stub. `StubAdService` returns `null` for all `getAd()` calls. Consent is always `false`. No ads shown in Phase 1.

**Planned future:** Implement self-serve ads first (upgrade prompts, feature announcements). Add third-party ad network integration only after legal review of COPPA/GDPR compliance for the specific target locales.

**May be depended on by:** Shell UI components (`AdSlot.svelte`) only.  
**Must never depend on:** `worksheet-output`. Must not be passed to app modules via `PlatformRegistrationContext` — ads are a shell-level concern.

---

### `@teacher-toolbox/cloud-coordinator`

**Purpose:** Cloud service availability, sync queue management, and conflict resolution routing.

**Responsibilities:**
- Report `CloudServiceStatus` for each `CloudServiceId` (sync, backup, share, ai, assets, collaboration)
- Manage the sync queue — accept sync requests, process asynchronously, emit `sync:completed` event
- Detect sync conflicts by comparing `updatedAt` timestamps
- Write conflict snapshots to the `conflicts` store in `StorageService`
- Route conflict resolution to UI (which version to keep: local, cloud, or merge)
- Notify subscribers of status changes

**Current status:** ✅ Stub. `StubCloudCoordinator` reports all services as `not-enabled`. No network calls.

**Planned future:** When cloud sync is built, the `StorageService` grows a `CloudStorageAdapter` that routes writes through this coordinator. Conflict detection uses the `syncedAt` and `updatedAt` fields already present on all stored entities.

**Public interface:**
```typescript
interface ICloudCoordinator extends PlatformService {
  getStatus(service: CloudServiceId): CloudServiceStatus
  getState(): CloudServiceState
  requestSync(scope?): void
  onStatusChange(service, handler): Unsubscribe
  resolveConflict(conflictId, resolution): Promise<void>
  getPendingConflicts(): string[]
}
```

**May be depended on by:** Shell UI components (sync status indicator). App modules may call `requestSync()` after saving a document.  
**Must never depend on:** `worksheet-output`, `analytics`, `ad-service`.

---

### `@teacher-toolbox/ai-service`

**Purpose:** Provider-agnostic AI abstraction layer.

**Responsibilities:**
- Accept `AITextRequest` and `AIStructuredRequest` with typed `AICapability` declarations
- Return null when AI is unavailable (Phase 1 always; future: when provider not configured)
- Expose `isAvailable()` — callers must check before every AI call and provide manual fallbacks
- Abstract the provider: Anthropic, OpenAI, or a self-hosted model are implementation details

**Public interface:**
```typescript
class AIService extends PlatformService {
  isAvailable(): boolean
  generateText(request): Promise<AITextResponse | null>
  generateStructured<T>(request): Promise<T | null>
  generateArtwork(request): Promise<ArtworkItem | null>
  getActiveProvider(): AIProvider | null
  setProvider(providerId, config): Promise<void>
}
```

**Current status:** ✅ Stub. `isAvailable()` returns `false`. All generation methods return `null`.

**Planned future:** Wire a real provider when `config.aiEnabled` is true and `flags.isEnabled('ai:word-list-generation')` is true and `identity.can('ai:word-list')` is true. All three conditions are required — master switch, feature flag, and entitlement.

**May be depended on by:** App modules (via `PlatformRegistrationContext`).  
**Must never depend on:** Any other service. The AI service calls external APIs only.

---

## Appendix A — Dependency Graph

```
@teacher-toolbox/types          (no deps)
         │
@teacher-toolbox/core           (← types)
         │
@teacher-toolbox/storage        (← types)
         │
@teacher-toolbox/error-reporter (← types)
@teacher-toolbox/feature-flags  (← types)
         │
@teacher-toolbox/settings       (← storage)
         │
@teacher-toolbox/identity       (← types, core)
  ├── AuthService
  ├── SubscriptionService
  ├── EntitlementService
  └── IdentityService
         │
@teacher-toolbox/theme-engine   (← settings, font-manager)
@teacher-toolbox/font-manager   (← storage)
@teacher-toolbox/migration      (← types, error-reporter)
@teacher-toolbox/template-manager (← storage)
         │
@teacher-toolbox/worksheet-output (← theme-engine, font-manager)
  ├── WorksheetRenderer
  ├── WorksheetPDF
  └── WorksheetPrint
         │
@teacher-toolbox/analytics      (← types)
@teacher-toolbox/ad-service     (← identity)
@teacher-toolbox/cloud-coordinator (← types, core)
@teacher-toolbox/ai-service     (← types)
```

---

## Appendix B — Boot Initialisation Order

```
Level 1  EventBus, PluginManager, Router
Level 2  StorageService
Level 3  ConsoleErrorReporter, FeatureFlagsService
Level 4  SettingsService
Level 5  AnonymousAuthService → LocalSubscriptionService
         → EntitlementService → IdentityService
Level 6  ThemeEngine, FontManager, MigrationService, TemplateManager
Level 7  WorksheetRenderer → WorksheetPDF, WorksheetPrint
Level 8  StubAnalyticsService, StubAdService, StubCloudCoordinator, AIService
```

All services at a given level are safe to initialise in any order within that level. Services at Level N may only depend on services from Levels 1 through N-1.

---

## Appendix C — PlatformRegistrationContext

The `PlatformRegistrationContext` is passed to every `AppModule.register(ctx)` call. It contains every platform service an app module may legitimately use during registration.

**App modules receive this context. They never import service packages directly.**

```typescript
interface PlatformRegistrationContext {
  bus:        EventBus          // emit/subscribe to platform and app events
  renderer:   WorksheetRenderer // register custom component renderers
  settings:   SettingsService   // read app defaults at registration time
  identity:   IIdentityService  // check entitlements, auth state
  analytics:  IAnalyticsService // track registration-time events
  flags:      IFeatureFlags     // check feature availability
  errors:     IErrorReporter    // report registration errors
  migrations: IMigrationService // register document schema migrations
  ads:        IAdService        // (reserved — not typically used at registration)
}
```

Services intentionally **absent** from this context:

- `StorageService` — app modules never access storage directly; they use `TemplateManager`, `StudentManager` (v1.0), etc.
- `ThemeEngine` — app modules extend themes via `extendTheme()` called during `register()`, which is available indirectly through the renderer context
- `FontManager` — app modules register fonts via the renderer's font context, not directly
- `IAdService` — advertising is a shell-level concern; app modules never place ads

---

*Document maintained alongside the codebase. Update this file when any service interface changes.*

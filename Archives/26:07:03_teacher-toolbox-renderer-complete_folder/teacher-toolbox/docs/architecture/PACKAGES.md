# Teacher Toolbox — Architecture Guide
**Version 0.1.0 — Foundation Release**

---

## Package Directory

Every package in this monorepo has a single, well-defined responsibility.
This document explains each one and the reasoning behind the structure.

---

### `packages/types` — `@teacher-toolbox/types`

**The foundation of the entire platform. Imports from nothing; everything imports from it.**

Contains all shared TypeScript interfaces and types:
- `WorksheetDocument` — the universal worksheet format with `schemaVersion`
- `WorksheetComponent` — the atomic content unit (namespaced by app)
- `AppModule` / `AppManifest` — the plugin contract every app implements
- `PlatformEvent` — discriminated union for the EventBus
- `Theme`, `FontDefinition`, `Student`, `ArtworkItem`, `WorksheetTemplate`
- All AI service types (stubbed for future use)

**Rule:** This package contains zero runtime code. Types only. If you find yourself writing a function here, it belongs somewhere else.

---

### `packages/core` — `@teacher-toolbox/core`

**The load-bearing infrastructure. Three classes that make everything else possible.**

- **EventBus** — typed pub/sub. The enforcement mechanism for the open/closed principle. Modules communicate *only* through events, never by importing each other.
- **PluginManager** — manages app module registration and lifecycle (`register → activate → deactivate → dispose`). The shell reads manifests from here to build navigation.
- **Router** — hash-based client-side navigation (`/#/appId/path`). Works from a static file server or `file://`. Emits `navigation:changed` events that the shell and PluginManager respond to.

---

### `packages/services/storage` — `@teacher-toolbox/storage`

**All persistence flows through here. Nothing else touches IndexedDB or localStorage.**

Phase 1: in-memory Map (data doesn't survive page reload).
Phase 2: swap for Dexie.js (IndexedDB) implementation behind the same `IStorageService` interface.
Future: cloud-sync adapter — same interface, no app code changes.

The `STORES` constant defines all named document stores (`worksheets`, `templates`, `students`, etc.).

---

### `packages/services/settings` — `@teacher-toolbox/settings`

**Layered teacher preferences — platform global and per-app namespaced.**

Resolution order: `platform defaults → stored preferences → per-app settings → per-document overrides`.

App modules write to their own namespace: `settings.setAppSetting('icanspell', 'defaultFont', 'zaner-bloser-print')`.

Depends on StorageService. No other service should depend on this one except ThemeEngine and app modules.

---

### `packages/services/theme-engine` — `@teacher-toolbox/theme-engine`

**Loads themes, injects CSS custom properties, provides render context.**

The `DEFAULT_THEME` defines the complete baseline token set. All CSS custom properties (`--tt-accent`, `--tt-baseline-color`, etc.) are defined in `packages/ui/src/styles/tokens.css` with fallback values, then overwritten at runtime by `ThemeEngine.injectCSSVariables()`.

The `ThemeRenderContext` is a plain object passed to the `WorksheetRenderer` — no DOM dependency, fully testable.

App modules extend themes with their own namespace: `themeEngine.extendTheme('default', 'icanspell', { traceOpacity: 0.4 })`.

---

### `packages/services/font-manager` — `@teacher-toolbox/font-manager`

**Web font loading and SVG glyph path access for handwriting rendering.**

The critical architectural distinction: standard web fonts (TTF/OTF) are used for UI labels and document headers. SVG path fonts (custom JSON format) are used by the `WorksheetRenderer` for handwriting trace and model text.

The `SVGPathFont` / `SVGGlyph` types in `@teacher-toolbox/types` define the format. The `FontManager.getGlyphPath()` and `getWordPath()` methods are what the renderer calls to produce handwriting output.

The glyph format makes possible: dotted trace overlays, ghost letter guides, opacity control, future stroke animation.

Phase 1: no fonts loaded. Phase 0.3: first SVG path font (Zaner-Bloser Print).

---

### `packages/services/worksheet-output` — `@teacher-toolbox/worksheet-output`

**The output pipeline: SVG rendering, PDF generation, and browser printing. One package.**

Three classes with distinct responsibilities:

- **WorksheetRenderer** — converts `WorksheetDocument` → `SVGSVGElement`. Dispatches on `component.type` to registered `ComponentRenderer` functions. App modules register their own renderers. Platform provides built-in renderers for `platform.*` component types.
- **WorksheetPDF** — wraps the PDF library. Phase 1: downloads SVG as placeholder. Phase 2: jsPDF + svg2pdf.js for true PDF. The interface is stable — changing the library is an implementation detail.
- **WorksheetPrint** — injects a hidden iframe with `@media print` CSS and triggers `window.print()`. Supports single and batch printing.

**Key invariant:** The same `WorksheetDocument` produces identical visual output in all three modes. Never let preview and print diverge.

---

### `packages/services/template-manager` — `@teacher-toolbox/template-manager`

**Template CRUD, catalogue, and instantiation.**

A template is just a `WorksheetDocument` with placeholder content saved with extra metadata. `instantiateTemplate()` creates a live document copy, merging in student name and app-specific data.

The `TemplateFilter` supports filtering by `appId` — so iCanSpell only sees spelling templates, iCanMath only sees math templates.

---

### `packages/services/ai-service` — `@teacher-toolbox/ai-service`

**Provider-agnostic AI abstraction layer. Fully stubbed in Phase 1.**

`isAvailable()` returns `false`. All generation methods return `null`.

App modules must always check `ai.isAvailable()` before calling any generation method, and must provide manual fallbacks. This design means AI features fail gracefully and silently in Phase 1 without any conditional imports or feature flags.

The `AICapability` type is the documented contract of what the platform will eventually offer: word list generation, practice sentences, math problems, reading passages, and artwork generation.

---

### `packages/services/artwork` — `@teacher-toolbox/artwork`

**Artwork filtering utilities. Phase 1: simple filter function over a static catalogue.**

`filterArtwork(query)` filters the bundled `BUNDLED_ARTWORK` array. Currently empty — art assets added in v1.0.

This is intentionally *not* a service class in Phase 1. When the catalogue grows past ~200 items or teacher-upload support is needed, promote to a full `ArtworkLibrary` service implementing `IStorageService` blob storage. Call sites change from `filterArtwork(q)` to `await artworkLibrary.search(q)` — a mechanical, scoped change.

---

### `packages/ui` — `@teacher-toolbox/ui`

**Shared Svelte components, design tokens, and icons.**

Components are pure: they receive all data as props and communicate upward via Svelte events. No component imports platform services. All service calls stay in pages and layouts.

`src/styles/tokens.css` defines every CSS custom property the platform uses. Import this once in `shell/src/main.ts`. All other Svelte files use `var(--tt-*)` and `var(--space-*)` etc. with zero inline styles.

---

### `packages/assets` — `@teacher-toolbox/assets`

**Static asset files: fonts, artwork, themes, templates.**

Each category has an `index.json` manifest read by the relevant service at startup. The actual files (SVG artwork, font JSON, theme JSON) live alongside their manifests. This package has no TypeScript — it's pure static assets.

---

### `packages/testing` — `@teacher-toolbox/testing`

**Shared test utilities for all packages.**

- `MockStorageService` — the in-memory StorageService promoted to a mock for tests
- `makeEmptyWorksheet()` — fixture factory for `WorksheetDocument` instances

Test files in other packages import from here rather than duplicating setup code.

---

### `apps/shell` — `@teacher-toolbox/shell`

**The container application. Builds and serves the platform.**

Key files:
- `src/boot.ts` — constructs and initialises all services in dependency order. Returns the `Platform` object. This is the explicit dependency injection: constructor arguments, no IoC container.
- `src/main.ts` — entry point. Boots the platform, registers app modules, mounts `App.svelte`. **To add a new app: import it here and call `platform.plugins.registerApp()`.**
- `src/App.svelte` — root component. Reads manifests from PluginManager to build the sidebar. Subscribes to router changes to activate/deactivate apps.
- `vite.config.ts` — defines path aliases so every `@teacher-toolbox/*` import resolves to the correct source file without building packages first.

---

### `apps/icanspell` — `@teacher-toolbox/icanspell`

**iCanSpell application module. Phase 1: architecture demonstration only.**

`src/index.ts` exports the `AppModule` implementation. The shell imports this as a default export and registers it.

In Phase 1, activating iCanSpell mounts `ICanSpellHome.svelte` — a placeholder card that confirms the module system works and lists v1.0 roadmap items.

The module NEVER imports from other app modules. It communicates with the platform only through events and the service interfaces passed during `register()`.

---

## Adding a New App Module

```bash
# Generate the scaffolding
node tools/scaffold-app/index.js icanmath iCanMath

# Then in apps/shell/src/main.ts, add two lines:
import iCanMath from '@teacher-toolbox/icanmath';
platform.plugins.registerApp(iCanMath);

# And in apps/shell/vite.config.ts, add one alias:
'@teacher-toolbox/icanmath': resolve(__dirname, '../../apps/icanmath/src/index.ts'),
```

No other files need to change. The sidebar updates automatically from the manifest.

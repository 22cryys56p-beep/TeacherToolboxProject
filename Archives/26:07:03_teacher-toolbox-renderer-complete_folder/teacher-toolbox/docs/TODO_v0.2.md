# TODO — Before Version 0.2 (Rendering Foundation)

This is the complete work list to move from the v0.1 architecture foundation
to a working rendering pipeline capable of displaying a real worksheet page.

Items are ordered by dependency — earlier items must be done before later ones.

---

## P0 — Blocking (must complete before any rendering works)

### Install Dependencies
- [ ] Run `pnpm install` (requires pnpm ≥ 9 and network access)
- [ ] Verify Svelte 5, Vite 5, and TypeScript compile cleanly with `pnpm typecheck`
- [ ] Verify `pnpm dev` opens the shell at localhost:5173

### Svelte Component Typecheck
- [ ] Add `svelte-check` to each app that has `.svelte` files
- [ ] Run `svelte-check` on `apps/shell` — fix any Svelte-specific type errors
- [ ] Run `svelte-check` on `apps/icanspell` — fix any Svelte-specific type errors
- [ ] The `.svelte` files are valid Svelte 5 syntax but cannot be verified by plain `tsc`

### WorkspaceArea / App Mount Wiring
- [ ] Verify the `bind:this={mountPoint}` in `App.svelte` correctly exposes the DOM element
  to `PluginManager.activateApp()` — the slot/bind interaction needs live browser testing
- [ ] The current `App.svelte` passes the mount point via a slot which conflicts with
  the `PluginManager` needing a direct DOM ref. Refactor so `mountPoint` is a `<div>`
  outside the slot, bound directly and passed to `activateApp()`

---

## P1 — Core Rendering (the v0.2 milestone goal)

### Layout Engine in WorksheetRenderer
- [ ] Implement `PageLayout` — converts `PageSetup` (mm dimensions + margins)
  to SVG coordinate space using `UNITS_PER_MM = 3.7795`
- [ ] Implement `FlowLayout` — stacks components vertically within the content area
  with configurable gap
- [ ] Implement `AbsoluteLayout` — positions components by their `position` field
  for free-placement worksheets
- [ ] Expose layout mode as a `WorksheetDocument` field: `layout: 'flow' | 'absolute'`

### Platform Component Renderers
Register these in `WorksheetRenderer.registerPlatformRenderers()`:
- [ ] `platform.free-text` — renders a text block with theme typography
- [ ] `platform.student-name-field` — "Name: ___________" line
- [ ] `platform.date-field` — "Date: ___________" line
- [ ] `platform.page-header` — title + optional subtitle with theme heading styles
- [ ] `platform.page-footer` — page number and optional school name
- [ ] `platform.decorative-border` — SVG rect border around page with theme border style

### Live Preview Component (Svelte)
- [ ] Create `packages/ui/src/preview/WorksheetPreview.svelte`
  - Accepts a `WorksheetDocument` prop
  - Calls `renderer.renderPreview(doc)` and inserts the returned `SVGSVGElement`
  - Re-renders reactively when `doc` changes (Svelte `$effect` or reactive statement)
  - Scales SVG to fit the available container width while maintaining aspect ratio
  - Shows a loading state during render
- [ ] Wire `WorksheetPreview` into `WorkspaceArea.svelte` (centre pane)

### PDF Engine — jsPDF Integration
- [ ] `pnpm add jspdf svg2pdf.js` in `packages/services/worksheet-output`
- [ ] Implement `WorksheetPDF.generate()` using `jsPDF` + `svg2pdf`
- [ ] Test with a real page: Letter size, portrait, 300 DPI
- [ ] Verify custom fonts embed correctly (critical for handwriting fonts later)
- [ ] Implement `generateBatch()` — multiple pages in one PDF file

### Print Engine — Page Break Testing
- [ ] Test `WorksheetPrint` across Chrome, Safari, Firefox
- [ ] Fix any `@media print` rendering discrepancies
- [ ] Verify `page-break-after: always` works correctly for batch printing
- [ ] Test on Chromebook (primary school device target)

---

## P2 — Services (needed for real worksheets)

### StorageService — Dexie.js
- [ ] `pnpm add dexie` in `packages/services/storage`
- [ ] Implement `DexieStorageService` implementing `IStorageService`
- [ ] Define IndexedDB schema with versioned migrations
- [ ] Write migration from v0 (empty) to v1 (all stores created)
- [ ] Update `boot.ts` to use `DexieStorageService` instead of in-memory `StorageService`
- [ ] Verify data persists across page reloads

### Template Manager — Bundled Templates
- [ ] Create at least one bundled template JSON in `packages/assets/templates/`
- [ ] Update `TemplateManager.initialize()` to load from `packages/assets/templates/index.json`
- [ ] Define the template JSON schema and document it

### Theme Engine — Additional Themes
- [ ] Implement `classic-blue` theme (blue ruling lines, blue margin)
- [ ] Implement `high-contrast` theme (thick black rules, high contrast colours)
- [ ] Wire theme switcher to `SettingsService` so selected theme persists

---

## P3 — Shell Polish (before showing to anyone)

### Navigation Fixes
- [ ] Router sub-path handling — `/#/spell/templates` should activate iCanSpell
  at the templates sub-route, not just at root
- [ ] Add `RouteDefinition` patterns to `Router` (`:param` matching)
- [ ] Active sidebar item highlighting updates correctly on browser back/forward

### Shared UI Components (missing for real layouts)
- [ ] `Panel.svelte` — collapsible side panel with header
- [ ] `Toolbar.svelte` — horizontal action bar with icon buttons and separators
- [ ] `TextInput.svelte` — labelled text input with validation state
- [ ] `SelectInput.svelte` — styled `<select>` wrapper
- [ ] `Modal.svelte` — accessible dialog with focus trap and backdrop
- [ ] `Toast.svelte` + `ToastManager` — ephemeral notification system

### Accessibility
- [ ] Keyboard navigation through sidebar (arrow keys)
- [ ] Focus management when activating/deactivating app modules
- [ ] `aria-live` region for status messages (print progress, save confirmation)
- [ ] Test with VoiceOver (macOS) and NVDA (Windows)

### Responsive Layout
- [ ] Collapse sidebar to icon-only mode below 900px viewport width
- [ ] Hide right panel below 1200px viewport width
- [ ] Test on iPad (768px) — primary tablet target
- [ ] Test on Chromebook (1024px) — primary desktop target

---

## P4 — Developer Experience

### Testing Setup
- [ ] Install Vitest: `pnpm add -D vitest` at workspace root
- [ ] Write first unit test: `EventBus` emit → handler called
- [ ] Write first unit test: `PluginManager.registerApp()` → `listManifests()` returns it
- [ ] Write first unit test: `StorageService.set()` → `get()` returns value
- [ ] Write first snapshot test: `WorksheetRenderer.renderPreview(emptyDoc)` SVG output
- [ ] Add `pnpm test` to CI

### Documentation
- [ ] `docs/contributing/CONTRIBUTING.md` — how to set up the dev environment
- [ ] `docs/api/EVENTS.md` — all EventBus event types documented with examples
- [ ] `docs/api/APP_MODULE.md` — complete AppModule contract walkthrough
- [ ] `docs/api/WORKSHEET_DOCUMENT.md` — WorksheetDocument schema with examples
- [ ] Inline JSDoc on all public service methods (most already have it; complete gaps)

### scaffold-app Tool
- [ ] Test `node tools/scaffold-app/index.js icanmath iCanMath` end-to-end
- [ ] Verify generated app registers and appears in the shell sidebar
- [ ] Add `--dry-run` flag to preview output without writing files

---

## Known Architectural Compromises Made in v0.1

These are intentional decisions that should be revisited or completed in v0.2:

1. **`App.svelte` mount point wiring** — The current design passes the app mount
   div through a Svelte slot, which may conflict with `PluginManager.activateApp()`
   needing a direct DOM reference. This needs live browser testing to confirm it works
   or refactoring to a simpler `bind:this` on a top-level div.

2. **`WorkspaceArea` slot architecture** — The welcome screen and the app mount point
   are mixed in the same slot. In v0.2, these should be cleanly separated: the welcome
   screen is a dedicated route (`/#/`) and the mount point is always present but empty
   when no app is active.

3. **`.js` extensions in imports** — TypeScript files use `.js` extensions in imports
   (e.g. `from './EventBus.js'`) which is correct for ESM bundler resolution but looks
   odd. This is intentional and correct for Vite; leave it.

4. **`FontManager` constructor** — Takes no arguments in `boot.ts` but `StorageService`
   is needed for font blob storage. Add `storage` as a constructor argument in v0.3
   when font loading is implemented.

5. **AI service `_request` params** — The stub methods accept `_request: unknown`
   for the structured and artwork methods. These should be typed properly once the
   AI request types are finalised.

6. **`pnpm-workspace.yaml` vs npm workspaces** — The project was designed for pnpm
   workspaces (`workspace:*` protocol) but the validation environment uses npm.
   The `workspace:*` → `*` substitution in package.json files should be reverted
   once pnpm is available: `find . -name "package.json" -not -path "*/node_modules/*" | xargs sed -i 's/": "\*"/": "workspace:*"/g'`

# Teacher Toolbox Platform — Software Architecture
**Version:** 1.0 — Architecture Definition  
**Status:** Pre-Implementation  
**Author:** Senior Software Architect Review  
**Date:** June 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Folder Structure](#3-folder-structure)
4. [Module Hierarchy](#4-module-hierarchy)
5. [Core Services](#5-core-services)
6. [Shared Libraries](#6-shared-libraries)
7. [Plugin Architecture](#7-plugin-architecture)
8. [Rendering Pipeline](#8-rendering-pipeline)
9. [Data Model](#9-data-model)
10. [Theme Architecture](#10-theme-architecture)
11. [Artwork Architecture](#11-artwork-architecture)
12. [Font Architecture](#12-font-architecture)
13. [Navigation Architecture](#13-navigation-architecture)
14. [Settings Architecture](#14-settings-architecture)
15. [AI Integration Points](#15-ai-integration-points)
16. [Technology Stack](#16-technology-stack)
17. [Development Roadmap](#17-development-roadmap)
18. [Risk Register & Tradeoffs](#18-risk-register--tradeoffs)

---

## 1. Executive Summary

Teacher Toolbox is designed as a **modular educational productivity platform** — a shared runtime that hosts independent application modules, each targeting a specific classroom task. The first module, **iCanSpell**, delivers handwriting and spelling worksheet generation.

The core architectural principle is **open/closed**: the platform is open for extension (new apps can be added), closed for modification (adding iCanMath should never require touching iCanSpell or the core engine).

Every architectural decision below is evaluated through three lenses:
- **Today:** Does it support iCanSpell cleanly?
- **Next year:** Can iCanMath or iCanRead be added without rework?
- **Long term:** Can the platform support 20+ apps, cloud sync, AI generation, and a template marketplace?

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Browser Runtime                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                    Platform Shell                           │     │
│  │  Navigation · Routing · Auth Shell · Global Settings UI    │     │
│  └──────────┬──────────────────────────────────────────────────┘     │
│             │ mounts                                                  │
│  ┌──────────▼──────────────────────────────────────────────────┐     │
│  │                  Application Modules                        │     │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────┐  │     │
│  │  │ iCanSpell  │ │ iCanMath   │ │ iCanRead   │ │  ...    │  │     │
│  │  │ (Phase 1)  │ │ (future)   │ │ (future)   │ │         │  │     │
│  │  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └────┬────┘  │     │
│  └─────────┼──────────────┼──────────────┼────────────┼────────┘     │
│            │              │              │            │               │
│  ┌─────────▼──────────────▼──────────────▼────────────▼────────┐     │
│  │                   Core Service Bus                           │     │
│  │                                                              │     │
│  │  Rendering · PDF · Print · Theme · Artwork · Font           │     │
│  │  Template · Student · Settings · Localization               │     │
│  │  FileIO · AI Layer · Plugin Manager · Event Bus             │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │               Persistence Layer                              │     │
│  │   IndexedDB (local) · LocalStorage (prefs) · [Cloud later]  │     │
│  └──────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

### Architectural Pattern: Micro-Frontend Monorepo

The platform uses a **micro-frontend** model within a monorepo. Each app module is a self-contained unit that registers itself with the platform shell at startup. The shell never knows the internals of any app; apps never know about each other. They communicate exclusively through the Core Service Bus.

This is not a microservices architecture (we have no backend yet). The "micro" refers to the logical and code-level separation of application modules while they run together in the same browser context.

---

## 3. Folder Structure

```
teacher-toolbox/
│
├── package.json                    # Workspace root (npm/pnpm workspaces)
├── pnpm-workspace.yaml
├── tsconfig.base.json              # Shared TypeScript config
├── vite.config.base.ts             # Shared Vite config
├── .eslintrc.base.cjs
├── README.md
│
├── packages/                       # All publishable/reusable packages
│   │
│   ├── core/                       # Platform core — the engine
│   │   ├── event-bus/              # Typed publish/subscribe system
│   │   ├── service-registry/       # Locates and injects services
│   │   ├── plugin-manager/         # App module registration & lifecycle
│   │   ├── router/                 # Client-side navigation
│   │   └── types/                  # Shared TypeScript interfaces & enums
│   │
│   ├── services/                   # Core services (each is its own package)
│   │   ├── rendering-engine/       # SVG/Canvas worksheet renderer
│   │   ├── pdf-engine/             # PDF generation service
│   │   ├── print-engine/           # Print formatting service
│   │   ├── theme-engine/           # Theme loading, switching, variables
│   │   ├── artwork-library/        # Artwork query, storage, delivery
│   │   ├── font-manager/           # Font loading, preview, metadata
│   │   ├── template-manager/       # Template CRUD and catalog
│   │   ├── student-manager/        # Student roster and profiles
│   │   ├── settings-service/       # Teacher preferences, global config
│   │   ├── localization/           # i18n strings and locale config
│   │   ├── file-io/                # Import/export (JSON, CSV, ZIP)
│   │   ├── ai-service/             # AI provider abstraction layer
│   │   └── storage-service/        # IndexedDB abstraction layer
│   │
│   ├── ui/                         # Shared UI component library
│   │   ├── components/             # Buttons, inputs, modals, panels
│   │   ├── layout/                 # Shell layout, sidebar, toolbar
│   │   ├── preview/                # Live worksheet preview component
│   │   ├── icons/                  # SVG icon set
│   │   └── styles/                 # Design tokens, CSS variables, reset
│   │
│   ├── assets/                     # Static shared assets
│   │   ├── fonts/                  # Bundled handwriting font files
│   │   ├── artwork/                # Bundled SVG/PNG clip art
│   │   ├── themes/                 # Built-in theme definitions (JSON)
│   │   └── templates/              # Built-in template definitions (JSON)
│   │
│   └── testing/                    # Shared test utilities and mocks
│       ├── mocks/                  # Mock service implementations
│       └── fixtures/               # Sample data for tests
│
├── apps/                           # Application modules
│   │
│   ├── shell/                      # Platform shell (the container app)
│   │   ├── src/
│   │   │   ├── main.ts             # Entry point, bootstraps platform
│   │   │   ├── App.svelte          # Root component
│   │   │   ├── shell/              # Shell UI: nav, header, sidebar
│   │   │   └── boot/               # Service init order, DI container
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── icanspell/                  # iCanSpell application module
│       ├── src/
│       │   ├── index.ts            # Module entry — registers with platform
│       │   ├── manifest.ts         # App metadata, routes, capabilities
│       │   ├── components/         # iCanSpell-specific UI components
│       │   ├── pages/              # Route-level page components
│       │   │   ├── WorksheetEditor.svelte
│       │   │   ├── TemplateGallery.svelte
│       │   │   └── StudentSelect.svelte
│       │   ├── services/           # iCanSpell-specific business logic
│       │   │   ├── WordListService.ts
│       │   │   ├── SpellingWorksheetBuilder.ts
│       │   │   └── HandwritingLineRenderer.ts
│       │   ├── models/             # iCanSpell data types
│       │   │   ├── WordList.ts
│       │   │   └── SpellingWorksheet.ts
│       │   └── assets/             # iCanSpell-specific assets
│       └── vite.config.ts
│
├── tools/                          # Internal dev tools
│   ├── scaffold-app/               # CLI to scaffold a new app module
│   └── asset-pipeline/             # Font and artwork preprocessing
│
└── docs/                           # Architecture and developer docs
    ├── architecture/
    ├── contributing/
    └── api/
```

### Rationale: Monorepo with Workspaces

A monorepo ensures that shared packages (the rendering engine, theme system) are always in sync across all apps. The alternative — separate repositories per module — creates version drift that becomes painful when 10+ apps depend on the same core. Tools like **pnpm workspaces** make this efficient without the complexity of Nx or Turborepo at the start (though Turborepo can be added later for build caching at scale).

---

## 4. Module Hierarchy

```
Platform Level 0: Runtime Environment (Browser)
│
Platform Level 1: Core Infrastructure
│   ├── Event Bus
│   ├── Service Registry (Dependency Injection)
│   ├── Plugin Manager
│   └── Router
│
Platform Level 2: Core Services
│   ├── Storage Service          ← no dependencies
│   ├── Settings Service         ← depends on Storage
│   ├── Localization             ← depends on Settings
│   ├── Student Manager          ← depends on Storage
│   ├── Font Manager             ← depends on Storage
│   ├── Artwork Library          ← depends on Storage
│   ├── Theme Engine             ← depends on Settings, Font Manager
│   ├── Template Manager         ← depends on Storage, Theme Engine
│   ├── AI Service               ← depends on Settings
│   ├── Rendering Engine         ← depends on Font Manager, Theme Engine, Artwork Library
│   ├── PDF Engine               ← depends on Rendering Engine
│   ├── Print Engine             ← depends on Rendering Engine
│   └── File I/O                 ← depends on Storage, Template Manager
│
Platform Level 3: Shared UI Library
│   └── (depends on Theme Engine, Rendering Engine)
│
Application Level 4: App Modules
    ├── iCanSpell                ← depends on Level 2 services via Service Registry
    ├── iCanMath (future)
    └── iCanRead (future)
```

**Key principle:** Dependencies only flow downward. An app module never imports another app module. Core services never import app module code. This strict layering is what makes the platform extensible.

---

## 5. Core Services

Each service follows the same contract pattern:

```typescript
// Every service implements this interface
interface PlatformService {
  readonly serviceId: string;
  readonly version: string;
  initialize(registry: ServiceRegistry): Promise<void>;
  dispose(): Promise<void>;
}
```

Services are accessed through the **Service Registry**, never by direct import across module boundaries. This allows services to be swapped, mocked, or upgraded independently.

---

### 5.1 Storage Service

**Responsibility:** Abstracts all local persistence. No other service calls IndexedDB or localStorage directly.

```typescript
interface StorageService extends PlatformService {
  // Document store (worksheets, templates, student data)
  get<T>(store: string, id: string): Promise<T | null>;
  set<T>(store: string, id: string, value: T): Promise<void>;
  delete(store: string, id: string): Promise<void>;
  query<T>(store: string, filter: QueryFilter): Promise<T[]>;
  
  // Preferences (simple key-value, survives sessions)
  getPref<T>(key: string, defaultValue: T): Promise<T>;
  setPref<T>(key: string, value: T): Promise<void>;
  
  // Binary assets (fonts, artwork, teacher uploads)
  getBlob(key: string): Promise<Blob | null>;
  setBlob(key: string, blob: Blob): Promise<void>;
}
```

**Implementation detail:** Uses **Dexie.js** (a typed IndexedDB wrapper) internally. The abstraction means we can later replace this with a cloud-sync adapter that wraps the same interface — no app code changes.

**Stores defined at platform init:**
- `worksheets` — saved worksheet documents per app
- `templates` — custom and downloaded templates
- `students` — student roster
- `wordlists` — saved word lists (iCanSpell)
- `artwork` — teacher-uploaded artwork blobs
- `settings` — teacher preferences

---

### 5.2 Event Bus

**Responsibility:** Typed publish/subscribe system for loose coupling between services and modules.

```typescript
interface EventBus {
  on<T extends PlatformEvent>(
    eventType: T['type'], 
    handler: (event: T) => void,
    context?: string  // for scoped listeners
  ): Unsubscribe;
  
  emit<T extends PlatformEvent>(event: T): void;
  
  once<T extends PlatformEvent>(
    eventType: T['type'],
    handler: (event: T) => void
  ): Unsubscribe;
}

// Events are discriminated unions — fully typed
type PlatformEvent =
  | { type: 'student:selected'; payload: { studentId: string } }
  | { type: 'theme:changed'; payload: { themeId: string } }
  | { type: 'worksheet:saved'; payload: { worksheetId: string; appId: string } }
  | { type: 'settings:updated'; payload: { key: string; value: unknown } }
  | { type: 'ai:response:ready'; payload: { requestId: string } }
  // ... extensible via module augmentation
```

When iCanSpell's word list changes, it emits `wordlist:updated`. When a student is selected in the shell nav, it emits `student:selected`. The rendering engine listens and re-renders. No module imports any other module.

---

### 5.3 Rendering Engine

**Responsibility:** Converts a **WorksheetDocument** (data) into an SVG/HTML visual output. This is the most critical service in the platform.

```typescript
interface RenderingEngine extends PlatformService {
  // Synchronous preview render (fast, lower fidelity acceptable)
  renderPreview(doc: WorksheetDocument, options: PreviewOptions): SVGElement;
  
  // Full-fidelity render for print/PDF
  renderFull(doc: WorksheetDocument, options: RenderOptions): Promise<SVGElement>;
  
  // Render a single component (for thumbnails, template previews)
  renderComponent(component: WorksheetComponent, context: RenderContext): SVGElement;
  
  // Register a custom component renderer (used by app modules)
  registerComponentRenderer(
    componentType: string, 
    renderer: ComponentRenderer
  ): void;
}
```

**Rendering model:** The engine works on a **WorksheetDocument** — a structured, serializable description of the worksheet. It is completely decoupled from any UI framework. The document describes *what* to render; the engine decides *how*.

This separation means:
- The same document renders in Svelte preview, exports to PDF, and prints identically
- App modules contribute new component types without modifying the engine core
- Tests can render documents headlessly (no DOM required for SVG output)

**Component renderer extension:**
```typescript
// iCanSpell registers its custom component renderers at startup
renderingEngine.registerComponentRenderer(
  'handwriting-line',
  HandwritingLineRenderer
);
renderingEngine.registerComponentRenderer(
  'spelling-word-cell', 
  SpellingWordCellRenderer
);
```

---

### 5.4 PDF Engine

**Responsibility:** Converts rendered SVG output into a downloadable PDF. Wraps the chosen PDF library behind a stable interface.

```typescript
interface PDFEngine extends PlatformService {
  generatePDF(
    document: WorksheetDocument,
    options: PDFOptions
  ): Promise<Blob>;
  
  generateBatchPDF(
    documents: WorksheetDocument[],
    options: PDFOptions
  ): Promise<Blob>;
}

interface PDFOptions {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3';
  orientation: 'portrait' | 'landscape';
  margins: Margins;
  embedFonts: boolean;
  colorProfile: 'RGB' | 'CMYK';  // future: CMYK for print shops
  resolution: number;             // DPI for rasterized elements
  filename?: string;
}
```

**Technology choice:** **jsPDF** with the SVG plugin, or **PDFKit** via a Web Worker. The interface hides which library is used — if we switch from jsPDF to Puppeteer-based rendering later (for pixel-perfect output), no app code changes.

**Batch mode** is essential for teachers generating class sets — one PDF with 25 personalized worksheets.

---

### 5.5 Print Engine

**Responsibility:** Prepares the rendered output for browser printing with proper page breaks, margins, and scale.

```typescript
interface PrintEngine extends PlatformService {
  print(document: WorksheetDocument, options: PrintOptions): Promise<void>;
  printBatch(documents: WorksheetDocument[], options: PrintOptions): Promise<void>;
  
  // Returns a print-ready HTML frame for @media print
  preparePrintFrame(document: WorksheetDocument): HTMLElement;
}
```

**Implementation:** Injects a hidden `<iframe>` with print-optimized CSS, triggers `window.print()`, and cleans up. Uses `@media print` CSS carefully to avoid preview UI bleeding into print output.

---

### 5.6 Theme Engine

**Responsibility:** Manages themes — loads, validates, applies, and exposes theme variables to all rendering and UI systems.

```typescript
interface ThemeEngine extends PlatformService {
  // Theme management
  loadTheme(themeId: string): Promise<Theme>;
  applyTheme(themeId: string): Promise<void>;
  getActiveTheme(): Theme;
  listAvailableThemes(): ThemeMetadata[];
  
  // CSS variable injection (for UI)
  injectCSSVariables(theme: Theme, root?: HTMLElement): void;
  
  // Render context (for rendering engine)
  getRenderContext(): ThemeRenderContext;
  
  // Custom theme import
  importTheme(themeData: unknown): Promise<Theme>;
  exportTheme(themeId: string): Promise<ThemeExport>;
}
```

See [Section 10](#10-theme-architecture) for the full Theme data model.

---

### 5.7 Student Manager

**Responsibility:** All student roster operations. A student is a simple profile used for worksheet personalization.

```typescript
interface StudentManager extends PlatformService {
  getStudent(studentId: string): Promise<Student | null>;
  listStudents(classroomId?: string): Promise<Student[]>;
  createStudent(data: CreateStudentInput): Promise<Student>;
  updateStudent(studentId: string, data: Partial<Student>): Promise<Student>;
  deleteStudent(studentId: string): Promise<void>;
  
  // Classroom grouping
  listClassrooms(): Promise<Classroom[]>;
  createClassroom(data: CreateClassroomInput): Promise<Classroom>;
  
  // Bulk operations
  importStudents(csv: string): Promise<ImportResult>;
  exportStudents(classroomId?: string): Promise<string>; // CSV
  
  // Active selection (drives worksheet personalization)
  getActiveStudent(): Student | null;
  setActiveStudent(studentId: string | null): void;
}
```

---

### 5.8 Settings Service

**Responsibility:** Teacher preferences and platform configuration. Split into global platform settings and app-specific settings namespaced by app ID.

```typescript
interface SettingsService extends PlatformService {
  // Typed getter/setter with defaults
  get<T>(key: SettingKey, defaultValue: T): Promise<T>;
  set<T>(key: SettingKey, value: T): Promise<void>;
  
  // Namespaced app settings
  getAppSetting<T>(appId: string, key: string, defaultValue: T): Promise<T>;
  setAppSetting<T>(appId: string, key: string, value: T): Promise<void>;
  
  // Bulk export/import for backup or transfer
  exportSettings(): Promise<SettingsExport>;
  importSettings(data: SettingsExport): Promise<void>;
  
  // Reset
  resetToDefaults(scope?: 'global' | 'app', appId?: string): Promise<void>;
}
```

---

### 5.9 AI Service Layer

See [Section 15](#15-ai-integration-points) for the full design. The service is stubbed during Phase 1 but the interface is defined and wired up.

---

### 5.10 Font Manager

See [Section 12](#12-font-architecture).

---

### 5.11 Artwork Library

See [Section 11](#11-artwork-architecture).

---

### 5.12 Template Manager

**Responsibility:** CRUD for worksheet templates. Templates are pre-structured WorksheetDocuments with placeholder content.

```typescript
interface TemplateManager extends PlatformService {
  getTemplate(templateId: string): Promise<WorksheetTemplate>;
  listTemplates(filter: TemplateFilter): Promise<TemplateMetadata[]>;
  saveTemplate(template: WorksheetTemplate): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
  duplicateTemplate(templateId: string): Promise<WorksheetTemplate>;
  
  // Creates a live worksheet document from a template + context
  instantiateTemplate(
    templateId: string,
    context: TemplateContext
  ): Promise<WorksheetDocument>;
  
  // Import/export
  importTemplate(file: File): Promise<WorksheetTemplate>;
  exportTemplate(templateId: string): Promise<Blob>;
}

interface TemplateFilter {
  appId?: string;       // filter by app (iCanSpell, iCanMath, etc.)
  category?: string;    // filter by category
  tags?: string[];
  source?: 'builtin' | 'custom' | 'downloaded';
}
```

---

### 5.13 File I/O Service

**Responsibility:** All file import and export operations using the File System Access API where available, falling back to `<input type="file">` and `<a download>`.

```typescript
interface FileIOService extends PlatformService {
  // Open file picker and read contents
  openFile(options: OpenFileOptions): Promise<FileReadResult>;
  openFiles(options: OpenFileOptions): Promise<FileReadResult[]>;
  
  // Save/download
  saveFile(data: Blob, options: SaveFileOptions): Promise<void>;
  
  // Worksheet-specific convenience methods
  exportWorksheet(doc: WorksheetDocument, format: ExportFormat): Promise<void>;
  importWorksheet(file: File): Promise<WorksheetDocument>;
  
  // Backup/restore
  exportAll(): Promise<Blob>;         // ZIP of all data
  importAll(backup: File): Promise<void>;
}

type ExportFormat = 'pdf' | 'svg' | 'png' | 'json' | 'ttx'; // .ttx = Teacher Toolbox native
```

---

### 5.14 Localization Service

**Responsibility:** All user-facing strings. Designed for future multi-language support even if only English ships initially.

```typescript
interface LocalizationService extends PlatformService {
  t(key: string, params?: Record<string, string>): string;
  setLocale(locale: string): Promise<void>;
  getLocale(): string;
  getSupportedLocales(): LocaleMetadata[];
  
  // Apps register their own string namespaces
  registerNamespace(namespace: string, strings: LocaleStrings): void;
}
```

---

## 6. Shared Libraries

Shared libraries differ from services in that they are **pure utility functions** — no state, no initialization, no service registry dependency. They are imported directly.

```
packages/
├── core/types/           # All shared TypeScript types and interfaces
├── ui/styles/            # Design tokens, CSS custom properties, reset
├── ui/components/        # Svelte UI components
└── ui/icons/             # SVG icon components
```

### 6.1 Type System (`@teacher-toolbox/types`)

The types package is the foundation. Every other package imports from it; it imports from nothing.

Key types defined here:
- `WorksheetDocument` — the universal document format
- `WorksheetComponent` — a unit of content on a worksheet
- `Theme` and `ThemeToken`
- `Student`, `Classroom`
- `FontDefinition`, `ArtworkItem`
- `PlatformService`, `AppModule`, `AppManifest`
- All event types for the EventBus

---

### 6.2 Shared UI Components (`@teacher-toolbox/ui`)

Built in **Svelte** (see technology stack). Components are pure and receive all data as props — no direct service calls inside components. Components communicate with the outside world via events, not callbacks where possible.

Component categories:
- **Forms:** `TextInput`, `SelectInput`, `Slider`, `ColorPicker`, `Toggle`, `NumberInput`
- **Layout:** `Panel`, `Sidebar`, `Toolbar`, `SplitView`, `Modal`, `Drawer`
- **Display:** `PreviewPane`, `TemplateThumbnail`, `StudentBadge`, `ArtworkPicker`
- **Actions:** `Button`, `IconButton`, `DropdownMenu`, `ContextMenu`
- **Feedback:** `Toast`, `LoadingSpinner`, `ProgressBar`, `EmptyState`

---

## 7. Plugin Architecture

### 7.1 App Module Contract

Every app module (iCanSpell, iCanMath, etc.) is a self-contained unit that:
1. Has an `AppManifest` describing it
2. Registers itself with the Plugin Manager at startup
3. Declares which platform services it needs
4. Exposes named routes the shell can activate

```typescript
// Every app module exports this as its default export
interface AppModule {
  manifest: AppManifest;
  
  // Called once when the platform boots
  register(registry: ServiceRegistry, bus: EventBus): void;
  
  // Called when the user navigates to this app
  activate(container: HTMLElement, route: Route): Promise<void>;
  
  // Called when the user navigates away
  deactivate(): Promise<void>;
  
  // Called on platform shutdown
  dispose(): Promise<void>;
}

interface AppManifest {
  id: string;               // 'icanspell'
  name: string;             // 'iCanSpell'
  version: string;          // '1.0.0'
  icon: string;             // SVG icon path
  description: string;
  
  // Navigation
  routes: RouteDefinition[];
  defaultRoute: string;
  
  // Capabilities this app provides
  capabilities: AppCapability[];
  
  // Services this app needs (for dependency checking)
  requiredServices: string[];
  
  // Component renderers this app adds to the rendering engine
  componentRenderers?: ComponentRendererRegistration[];
  
  // Settings this app adds to global settings panel
  settingsContributions?: SettingsContribution[];
  
  // AI prompts/tools this app registers (future)
  aiContributions?: AIContribution[];
}
```

### 7.2 Plugin Manager

```typescript
interface PluginManager extends PlatformService {
  registerApp(module: AppModule): void;
  getApp(appId: string): AppModule | null;
  listApps(): AppManifest[];
  
  isAppEnabled(appId: string): boolean;
  enableApp(appId: string): Promise<void>;
  disableApp(appId: string): Promise<void>;
}
```

### 7.3 Registration Flow

```
Browser loads shell/main.ts
  │
  ├─ Platform core initializes (EventBus, ServiceRegistry)
  ├─ Core services initialize (in dependency order)
  ├─ App modules are imported (dynamic import for code splitting)
  │   └─ Each module calls pluginManager.registerApp(module)
  │
  ├─ Shell renders navigation from registered app manifests
  └─ Router activates the default app
```

### 7.4 Dynamic Loading (Future)

In Phase 1, all app modules are bundled together for simplicity. The architecture supports lazy loading later:

```typescript
// Future: load apps on demand
const module = await import(/* webpackChunkName: "icanmath" */ './apps/icanmath');
pluginManager.registerApp(module.default);
```

---

## 8. Rendering Pipeline

The rendering pipeline is the heart of Teacher Toolbox. It must produce identical output for screen preview, PDF export, and browser printing.

### 8.1 Pipeline Overview

```
User Edits Worksheet
        │
        ▼
WorksheetDocument (data model — serializable JSON)
        │
        ▼ RenderingEngine.renderPreview()
┌───────────────────────────────────────┐
│          Layout Engine                │
│  - Resolves page dimensions           │
│  - Applies grid/flow layout rules     │
│  - Positions components               │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│         Component Renderers           │
│  - One renderer per component type    │
│  - Registered by app modules          │
│  - Produces SVG subtrees             │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│          Theme Application            │
│  - Applies colors, fonts, borders     │
│  - Injects artwork, decorations       │
└───────────────┬───────────────────────┘
                │
                ▼
          SVGElement (complete, printable)
                │
          ┌─────┼─────┐
          ▼     ▼     ▼
       Preview  PDF  Print
```

### 8.2 WorksheetDocument Model

```typescript
interface WorksheetDocument {
  id: string;
  appId: string;           // 'icanspell'
  version: string;         // document schema version
  
  metadata: DocumentMetadata;
  pageSetup: PageSetup;
  theme: ThemeReference;
  student?: StudentReference;
  
  layout: LayoutDefinition;
  components: WorksheetComponent[];
}

interface PageSetup {
  size: PageSize;
  orientation: 'portrait' | 'landscape';
  margins: Margins;
  columns?: number;
}

// WorksheetComponent is extensible — the core defines base fields,
// each app adds its own component types via declaration merging
interface WorksheetComponent {
  id: string;
  type: string;           // 'handwriting-line', 'spelling-word-cell', etc.
  position: Position;
  size: Size;
  style?: ComponentStyle;
  data: Record<string, unknown>;   // Component-specific payload
  meta?: Record<string, unknown>;  // Render hints
}
```

### 8.3 iCanSpell Component Types

```typescript
// Registered by iCanSpell module
type SpellingComponentType =
  | 'handwriting-line'      // blank ruled line with Zaner-Bloser guides
  | 'handwriting-word'      // dotted trace word
  | 'spelling-word-cell'    // number + word + practice spaces
  | 'word-list-header'      // "My Spelling Words" styled header
  | 'student-name-field'    // "Name: ________"
  | 'date-field'            // "Date: ________"
  | 'decorative-border'     // wraps the page
  | 'artwork-placement'     // places artwork from the library
  | 'free-text'             // arbitrary text block
```

### 8.4 Handwriting Line Rendering

The handwriting line renderer is iCanSpell's most important component. It renders:

- Baseline, midline, and top line (configurable stroke weights)
- Optional descender line
- Optional ascender dotted guide
- Left margin (red or blue)
- Correct proportions for target grade level
- Optionally: ghost letter guides or dotted trace letters using the selected SVG handwriting font

The renderer takes the selected **HandwritingFont** (see Section 12) and uses its SVG glyph paths to generate properly proportioned, on-line practice text.

---

## 9. Data Model

### 9.1 Core Entities

```typescript
// Student
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;      // how name appears on worksheets
  classroomId: string;
  gradeLevel?: GradeLevel;
  avatarColor?: string;     // for UI display
  preferences?: StudentPreferences;
  createdAt: string;
  updatedAt: string;
}

// Classroom
interface Classroom {
  id: string;
  name: string;             // "Mrs. Johnson's Class"
  gradeLevel: GradeLevel;
  academicYear: string;     // '2025-2026'
  studentIds: string[];
  createdAt: string;
}

// Word List (iCanSpell specific, lives in iCanSpell package)
interface WordList {
  id: string;
  name: string;
  words: string[];
  gradeLevel?: GradeLevel;
  weekNumber?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Worksheet Document — described in Section 8.2

// Template
interface WorksheetTemplate {
  id: string;
  appId: string;
  name: string;
  description: string;
  thumbnail?: string;       // base64 SVG preview
  document: WorksheetDocument;   // the template IS a document with placeholder data
  category: string;
  tags: string[];
  source: 'builtin' | 'custom' | 'downloaded';
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 9.2 Serialization Strategy

All entities serialize to **JSON**. WorksheetDocuments use a versioned schema:

```typescript
interface VersionedDocument {
  schemaVersion: string;    // '1.0.0'
  appId: string;
  payload: WorksheetDocument;
}
```

A **MigrationService** handles older document versions transparently. When a document is loaded, its schema version is checked and any needed migrations are applied before rendering.

---

## 10. Theme Architecture

### 10.1 Theme Model

```typescript
interface Theme {
  id: string;
  name: string;
  description?: string;
  version: string;
  
  // Color tokens
  colors: ThemeColors;
  
  // Typography tokens
  typography: ThemeTypography;
  
  // Page decoration
  decoration: ThemeDecoration;
  
  // Layout defaults
  layout: ThemeLayout;
  
  // App-specific overrides (apps can extend themes)
  extensions?: Record<string, Record<string, unknown>>;
}

interface ThemeColors {
  // Worksheet surface
  pageBg: string;
  
  // Ruling lines
  baselineColor: string;
  midlineColor: string;
  toplineColor: string;
  marginLineColor: string;
  
  // Typography
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  
  // UI shell (for screen only, not print)
  shellBg: string;
  shellAccent: string;
  
  // Borders and decoration
  borderColor: string;
  accentColor: string;
  highlightColor: string;
}

interface ThemeTypography {
  // Worksheet content font (headings, labels)
  displayFont: FontReference;
  bodyFont: FontReference;
  
  // Handwriting font used for trace/model text
  handwritingFont: FontReference;
  
  // Type scale (in points for print, px for screen)
  scale: TypeScale;
}

interface ThemeDecoration {
  borderStyle?: BorderStyle;        // page border/frame
  headerDecoration?: Decoration;
  footerDecoration?: Decoration;
  watermark?: WatermarkDefinition;
  cornerArt?: ArtworkReference[];
}

interface ThemeLayout {
  defaultPageSize: PageSize;
  defaultMargins: Margins;
  defaultLineSpacing: LineSpacing;  // primary | intermediate | college
  defaultColumns: number;
}
```

### 10.2 Built-in Themes (Phase 1)

- `default` — clean, minimal, black rules on white
- `classic-blue` — blue margin line, blue mid/top rules
- `classroom-warm` — warm beige, playful header font
- `high-contrast` — for accessibility
- `seasonal-autumn` — decorative, harvest colors (demonstrates theme extension)

### 10.3 Theme Extension

Apps can extend themes without modifying them:

```typescript
// iCanSpell contributes its own theme tokens
themeEngine.extendTheme('default', 'icanspell', {
  wordCellBg: '#f8f9fa',
  wordCellBorder: '#dee2e6',
  traceOpacity: 0.4,
});
```

---

## 11. Artwork Architecture

### 11.1 Artwork Item Model

```typescript
interface ArtworkItem {
  id: string;
  name: string;
  description?: string;
  
  type: ArtworkType;
  format: ArtworkFormat;
  
  // Storage
  source: ArtworkSource;
  data?: string;              // inline SVG or base64 PNG
  url?: string;               // for URL-sourced items
  storageKey?: string;        // for IndexedDB-stored items
  
  // Classification
  category: string;           // 'animals', 'seasonal', 'borders', 'school'
  tags: string[];
  seasonality?: Season[];
  gradeLevel?: GradeLevel[];
  colorScheme?: string[];     // dominant colors for filtering
  
  // Dimensions
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: number;
  
  // Metadata
  license: ArtworkLicense;
  authorName?: string;
  createdAt: string;
}

type ArtworkType = 
  | 'clip-art'
  | 'border'
  | 'background'
  | 'icon'
  | 'mascot'
  | 'decoration'
  | 'photo'
  | 'ai-generated'
  | 'teacher-uploaded';

type ArtworkFormat = 'svg' | 'png' | 'jpg' | 'webp';
type ArtworkSource = 'bundled' | 'indexed-db' | 'url' | 'inline';
```

### 11.2 Artwork Library Service

```typescript
interface ArtworkLibrary extends PlatformService {
  // Query
  search(query: ArtworkQuery): Promise<ArtworkItem[]>;
  getById(id: string): Promise<ArtworkItem | null>;
  getByCategory(category: string): Promise<ArtworkItem[]>;
  listCategories(): Promise<ArtworkCategory[]>;
  
  // Delivery — resolves to a usable SVG string or image URL
  resolve(item: ArtworkItem): Promise<ArtworkResolved>;
  
  // Teacher uploads
  importArtwork(file: File, metadata: ArtworkMetadata): Promise<ArtworkItem>;
  deleteArtwork(id: string): Promise<void>;
  
  // Collections / packs
  listPacks(): Promise<ArtworkPack[]>;
  installPack(packId: string): Promise<void>;  // future: downloadable packs
}
```

### 11.3 Bundled Artwork Strategy

Phase 1 bundles a curated set of ~100 SVG artworks:
- 20 simple classroom/school icons
- 10 basic border frames
- 20 seasonal decorations (autumn, winter, spring, summer)
- 10 animal clip arts
- 10 educational icons (stars, checkmarks, pencils)
- Corner decorations for worksheets

SVGs are stored in `packages/assets/artwork/` with an `index.json` manifest. The artwork library reads this manifest and streams artwork on demand rather than loading all assets upfront.

### 11.4 AI-Generated Artwork (Future)

When the AI service layer is active, the artwork library can request AI-generated artwork via a standard interface. Generated artwork is stored in IndexedDB and listed alongside bundled artwork seamlessly.

---

## 12. Font Architecture

### 12.1 Font Model

```typescript
interface FontDefinition {
  id: string;
  name: string;
  familyName: string;
  
  style: FontStyle;
  role: FontRole;
  
  // Handwriting-specific properties
  handwriting?: HandwritingFontMeta;
  
  // Files
  variants: FontVariant[];
  
  // Metadata
  source: FontSource;
  license: FontLicense;
  previewText?: string;
}

type FontRole = 
  | 'display'       // headings, titles on worksheets
  | 'body'          // body text, instructions
  | 'handwriting'   // used by the rendering engine for trace text
  | 'monospace';    // future: coding worksheets

interface HandwritingFontMeta {
  script: HandwritingScript;   // 'print' | 'cursive' | 'dnealian'
  gradeRange: [number, number];
  lineHeightRatio: number;     // ascender height / x-height
  descenderRatio: number;
  guidelines: GuidelineSpec;   // how to draw the ruling lines for this font
}

type HandwritingScript = 
  | 'zaner-bloser-print'
  | 'zaner-bloser-cursive'
  | 'dnealian-print'
  | 'dnealian-cursive'
  | 'hts-print'               // HWT - Handwriting Without Tears
  | 'hts-cursive'
  | 'custom';
```

### 12.2 Font Manager Service

```typescript
interface FontManager extends PlatformService {
  // Loading
  loadFont(fontId: string): Promise<FontFace>;
  preloadFonts(fontIds: string[]): Promise<void>;
  
  // Query
  getFont(fontId: string): Promise<FontDefinition | null>;
  listFonts(filter?: FontFilter): Promise<FontDefinition[]>;
  listHandwritingFonts(): Promise<FontDefinition[]>;
  
  // SVG glyph access (for rendering engine)
  getGlyphPath(fontId: string, character: string, size: number): Promise<SVGPath>;
  getWordPath(fontId: string, word: string, size: number): Promise<SVGPath>;
  
  // Teacher uploads
  importFont(file: File, metadata: FontMetadata): Promise<FontDefinition>;
}
```

### 12.3 Handwriting Font Strategy

Handwriting fonts in Teacher Toolbox are **SVG path fonts**, not standard TTF/OTF files. This is the key insight:

- Standard web fonts render text as outlines in the browser's text engine — they cannot be decomposed into individual strokes or controlled paths
- SVG path fonts store each glyph as an SVG path element
- The rendering engine can: draw dotted trace overlays, animate writing strokes, control opacity for ghost guides, and render perfectly on print at any resolution

Phase 1 includes one complete SVG path font:
- `zaner-bloser-print` — standard print for K-2

The font file format is a custom JSON structure:
```json
{
  "id": "zaner-bloser-print",
  "version": "1.0.0",
  "glyphs": {
    "a": {
      "path": "M ...",           // SVG path data
      "width": 120,
      "height": 200,
      "baseline": 150,
      "midline": 100
    }
  }
}
```

This format is designed to be authored by a font tool and consumed by the rendering engine only.

---

## 13. Navigation Architecture

### 13.1 Navigation Model

The platform shell provides unified navigation. Each registered app contributes its routes to the shell's navigation tree.

```typescript
interface NavigationState {
  activeAppId: string | null;
  activeRoute: Route | null;
  breadcrumbs: Breadcrumb[];
  history: Route[];
}

interface RouteDefinition {
  path: string;              // '/spell/editor'
  component: string;         // component identifier within the app
  title: string;
  icon?: string;
  
  // Navigation visibility
  showInSidebar: boolean;
  showInAppHeader: boolean;
  
  // Optional params schema
  params?: Record<string, ParamDefinition>;
}
```

### 13.2 Router Design

Uses a **hash-based router** (`/#/spell/editor`) for Phase 1 — no server required, works from `file://` if needed.

Path structure: `/#/{appId}/{path...}`
- `/#/spell/editor` — iCanSpell editor
- `/#/spell/templates` — iCanSpell template gallery
- `/#/spell/words` — iCanSpell word list manager
- `/#/settings` — platform settings
- `/#/students` — student manager (platform-level)

The router is provided by the core platform and configured from app manifests — no app writes router config; they declare routes and the shell assembles them.

### 13.3 Shell Navigation Layout

```
┌────────────────────────────────────────────────────────┐
│  Teacher Toolbox          [Student: Sarah M.]    [⚙️]   │  ← Header Bar
├──────────┬─────────────────────────────────────────────┤
│          │                                             │
│  Nav     │           Active App Area                  │
│          │                                             │
│  📝 Spell │   ┌──────────────┬──────────────┐          │
│  ➕ Math  │   │   Settings   │  Preview     │          │
│  📖 Read  │   │   Panel      │  Panel       │          │
│  ✏️  Trace │   │              │              │          │
│          │   └──────────────┴──────────────┘          │
│  ──────  │                                             │
│  👥 Class │   ← App controls this region entirely      │
│  ⚙️ Prefs │                                             │
└──────────┴─────────────────────────────────────────────┘
```

---

## 14. Settings Architecture

Settings are layered, with each layer overriding the previous:

```
System Defaults (code)
       ↓ overridden by
Platform Defaults (settings.json bundled)
       ↓ overridden by
Teacher Preferences (IndexedDB)
       ↓ overridden by
Per-App Settings (IndexedDB, namespaced by appId)
       ↓ overridden by
Per-Document Settings (in WorksheetDocument)
```

### 14.1 Settings Categories

**Platform Settings** (shell manages these):
```typescript
interface PlatformSettings {
  locale: string;                    // 'en-US'
  colorMode: 'light' | 'dark' | 'system';
  defaultTheme: string;
  defaultPageSize: PageSize;
  teacherName: string;
  schoolName: string;
  schoolLogoId?: string;
}
```

**iCanSpell Settings** (namespaced 'icanspell'):
```typescript
interface ICanSpellSettings {
  defaultHandwritingFont: string;
  defaultLineSpacing: LineSpacing;
  defaultLineStyle: 'zaner-bloser' | 'dnealian' | 'hts' | 'plain';
  showBaseline: boolean;
  showMidline: boolean;
  showTopline: boolean;
  defaultPracticeCount: number;       // how many times to write each word
  defaultWordListId?: string;
  includeStudentNameField: boolean;
  includeDateField: boolean;
  defaultBorderStyle: string;
}
```

### 14.2 Settings UI Contribution

Apps contribute their own settings sections to the global settings panel via their manifest:

```typescript
// From iCanSpell's manifest
settingsContributions: [
  {
    sectionId: 'icanspell-handwriting',
    label: 'Handwriting',
    icon: 'pencil',
    component: 'HandwritingSettings',  // Svelte component name
  },
  {
    sectionId: 'icanspell-defaults',
    label: 'Worksheet Defaults',
    icon: 'document',
    component: 'SpellingDefaultsSettings',
  }
]
```

---

## 15. AI Integration Points

### 15.1 Design Principles

The AI service is a **provider-agnostic abstraction**. Apps never call an AI provider directly. They call `aiService.request()`, which:
1. Checks if AI is configured and enabled
2. Routes to the active provider
3. Handles errors and fallbacks
4. Returns a structured response

In Phase 1, the AI service is **fully stubbed** — it returns null/empty for all calls. This means all calling code must handle the "no AI" case gracefully with manual fallbacks.

### 15.2 AI Service Interface

```typescript
interface AIService extends PlatformService {
  isAvailable(): boolean;
  
  // Text generation (general purpose)
  generateText(request: AITextRequest): Promise<AITextResponse>;
  
  // Structured data generation
  generateStructured<T>(request: AIStructuredRequest<T>): Promise<T | null>;
  
  // Image/artwork generation (future)
  generateArtwork(request: AIArtworkRequest): Promise<ArtworkItem | null>;
  
  // Provider management (future: multiple providers)
  getActiveProvider(): AIProvider | null;
  setProvider(providerId: string, config: AIProviderConfig): Promise<void>;
}

interface AITextRequest {
  capability: AICapability;    // typed — what this request is for
  prompt: string;
  systemContext?: string;
  maxLength?: number;
  temperature?: number;
  appId: string;               // for logging and rate limiting
}

// Capabilities are a discriminated union — typed, discoverable
type AICapability =
  | 'spelling:generate-word-list'
  | 'spelling:generate-sentences'
  | 'spelling:generate-story'
  | 'math:generate-problems'         // future
  | 'read:generate-passage'          // future
  | 'create:generate-activity'       // future
  | 'artwork:generate-image'         // future
  | 'template:suggest';
```

### 15.3 AI Integration Points by Feature

| App | Feature | AI Capability | Phase |
|-----|---------|---------------|-------|
| iCanSpell | "Generate word list for grade 2" | `spelling:generate-word-list` | Future |
| iCanSpell | "Write a story using my spelling words" | `spelling:generate-story` | Future |
| iCanSpell | "Create practice sentences" | `spelling:generate-sentences` | Future |
| iCanMath | "Generate 20 addition problems" | `math:generate-problems` | Future |
| iCanRead | "Write a reading passage about frogs" | `read:generate-passage` | Future |
| Any | "Suggest a template for this content" | `template:suggest` | Future |
| Any | "Generate border artwork" | `artwork:generate-image` | Future |

### 15.4 Stubbed Phase 1 Implementation

```typescript
// Phase 1 AI service — returns null for everything
class StubAIService implements AIService {
  isAvailable() { return false; }
  async generateText() { return null; }
  async generateStructured() { return null; }
  async generateArtwork() { return null; }
  getActiveProvider() { return null; }
  async setProvider() { /* noop */ }
}
```

UI elements that would use AI are disabled with clear messaging: *"AI suggestions coming soon."* They are never hidden entirely so teachers see what's planned.

---

## 16. Technology Stack

### 16.1 Framework: Svelte + SvelteKit (Static)

**Chosen:** Svelte 5 with SvelteKit in **static adapter** mode (no Node.js server).

**Rationale:**
- Svelte compiles to minimal vanilla JS — no virtual DOM overhead during complex worksheet re-renders
- Excellent performance for live preview (re-render on every keystroke)
- Small bundle size matters — teachers on school Chromebooks may have limited bandwidth
- SvelteKit's static adapter produces pure HTML/CSS/JS — deployable to any CDN, GitHub Pages, or even opened from disk
- Svelte's reactivity model is well-suited to the live preview pattern (reactive statements trigger re-renders naturally)
- Simpler mental model than React + Redux for a team that may grow to include non-expert contributors

**Alternative considered:** React + Vite. React has a larger ecosystem but carries more bundle weight and React's rendering model makes complex SVG manipulation more complex. Svelte is the better fit for a rendering-heavy platform.

### 16.2 Build System: Vite + pnpm Workspaces

**Vite** for its fast dev server HMR and efficient production builds.  
**pnpm** for workspace management — faster than npm, better deduplication than Yarn.

### 16.3 Language: TypeScript (strict mode)

All source code is TypeScript with `strict: true`. The types package is the source of truth. This catches integration errors between modules at compile time — critical for a plugin architecture where modules interact through interfaces.

### 16.4 PDF Generation: jsPDF + svg2pdf.js

**Phase 1:** `jsPDF` with `svg2pdf.js` plugin.
- Runs entirely in the browser — no server
- Converts our SVG render output directly to PDF
- Supports custom fonts embedded in the PDF
- Acceptable quality for classroom printing

**Future consideration:** Puppeteer-based server-side rendering for pixel-perfect output if teachers demand it. The PDF Engine interface hides this transition.

### 16.5 Local Storage: Dexie.js (IndexedDB)

`Dexie.js` provides a clean, promise-based API over IndexedDB. Supports:
- Structured data storage (documents, templates, students)
- Binary blob storage (teacher-uploaded artwork)
- Versioned schema migrations

### 16.6 Testing: Vitest + Playwright

**Unit/Integration:** Vitest (same config as Vite, fast)  
**End-to-end:** Playwright (tests the full browser experience including print/PDF)  

Critical test targets:
- Rendering engine output (snapshot tests of SVG output)
- PDF generation (visual regression)
- Service interactions (unit tests with mocked service registry)

### 16.7 Localization: i18next

`i18next` with JSON message files. Each app contributes its own namespace. The localization service wraps i18next so apps don't import i18next directly.

### 16.8 State Management

**No global state library.** Svelte's built-in stores are sufficient and appropriate:
- `writable()` for mutable state
- `derived()` for computed state
- The Event Bus handles cross-module communication

Introducing Redux or Zustand would be premature and would couple the UI layer more tightly to a specific paradigm. Revisit if needed after three or more apps are implemented.

### 16.9 Technology Stack Summary

| Concern | Technology | Reason |
|--------|-----------|--------|
| UI Framework | Svelte 5 | Performance, bundle size, simplicity |
| Meta-framework | SvelteKit (static) | No server needed, great DX |
| Build | Vite | Fast HMR, modern bundling |
| Package manager | pnpm | Workspaces, speed, dedup |
| Language | TypeScript strict | Type safety across modules |
| PDF | jsPDF + svg2pdf | Browser-native, no server |
| Storage | Dexie.js (IndexedDB) | Typed, async, migration support |
| Testing | Vitest + Playwright | Vite-native, comprehensive |
| Localization | i18next | Mature, namespace support |
| Styling | CSS custom properties + PostCSS | Theme tokens without runtime overhead |

---

## 17. Development Roadmap

### Version 0.1 — Foundation (Months 1–2)

**Goal:** Working skeleton, no app features.

- Monorepo setup with pnpm workspaces
- Core infrastructure: EventBus, ServiceRegistry, PluginManager, Router
- Storage Service with Dexie.js
- Settings Service (basic)
- Shell: navigation layout, app slot, student selector in header
- Stub AI service
- CI pipeline with TypeScript and Vitest
- Developer documentation scaffold

**Deliverable:** An empty shell that can register and display app modules.

---

### Version 0.2 — Rendering Foundation (Months 2–3)

**Goal:** Working rendering pipeline.

- WorksheetDocument data model finalized
- Rendering Engine core (layout, component system)
- Theme Engine with `default` theme
- Font Manager with one bundled UI font
- Live SVG preview component
- PDF Engine (basic, text + shapes)
- Print Engine (basic browser print)

**Deliverable:** A rendering pipeline that can display a blank ruled page, export it to PDF, and print it.

---

### Version 0.3 — Handwriting Foundation (Month 3)

**Goal:** The core iCanSpell handwriting capability.

- SVG path font format defined and documented
- First handwriting font: Zaner-Bloser Print
- `handwriting-line` component renderer
- `handwriting-word` (dotted trace) component renderer
- Font Manager SVG glyph path API
- Ruling line variants (primary, intermediate, college ruled)

**Deliverable:** A rendered page of handwriting lines with dotted-trace words.

---

### Version 1.0 — iCanSpell Public Release (Months 4–6)

**Goal:** Complete, polished iCanSpell application.

- Word list manager (CRUD, import CSV)
- Spelling word cell component (number + word + practice lines)
- Student manager (add, edit, class grouping)
- Student name/date fields on worksheets
- Template gallery with 10 built-in templates
- Artwork library with bundled clip art (50 items)
- Theme engine with 4 built-in themes
- PDF export (full quality, batch for class sets)
- Print (batch by class)
- Teacher settings panel with iCanSpell section
- File I/O (save/open .ttx worksheet files)
- Localization infrastructure (English only)

**Deliverable:** Production-quality iCanSpell that teachers can use daily.

---

### Version 1.1 — Polish & Growth (Months 7–8)

- Additional handwriting fonts (D'Nealian print, HWT)
- More themes (5 seasonal themes, 2 high-contrast)
- Expanded artwork library (100+ items)
- More built-in templates (20 total)
- Keyboard accessibility audit
- Performance profiling and optimization of render loop
- Teacher feedback collection and priority fixes

---

### Version 1.2 — Export Expansion (Month 9)

- PNG export (for use in Google Classroom, etc.)
- ZIP export (all files for a class set)
- Google Classroom share link (future: via Google API)
- Print preview dialog with page count

---

### Version 2.0 — iCanMath (Months 10–14)

**Goal:** Second application module, validates the plugin architecture.

- iCanMath module registered with the platform
- Math problem component types: addition, subtraction, multiplication, division
- Number line component
- Grid/graph paper component
- Math-specific templates
- This release proves the architecture works — no changes to iCanSpell or core required

---

### Version 2.1 — iCanTrace (Months 14–16)

- Letter tracing worksheets
- Shape tracing
- Connect-the-dots (number sequence)

---

### Version 3.0 — Cloud & Community (Future)

- User accounts (auth provider TBD)
- Cloud sync for worksheets and settings
- Community template gallery (share/download templates)
- Rating and commenting on templates
- Teacher profile page

---

### Version 4.0 — AI Integration (Future)

- AI service provider integration (Anthropic API or OpenAI)
- Word list generation for iCanSpell
- Practice sentence generation
- Math problem generation for iCanMath
- Reading passage generation for iCanRead
- AI artwork generation for decorations

---

### Future Applications Priority (based on educator demand)

1. **iCanRead** — reading comprehension worksheets, cloze passages
2. **iCanCreate** — creative writing prompts, story starters
3. **iCanPlay** — educational games (word searches, crosswords)
4. **iCanMath** — (already listed above)

---

## 18. Risk Register & Tradeoffs

### Risk 1: SVG Path Font Creation Cost

**Risk:** Creating high-quality SVG path fonts for every handwriting style is significant work. Each glyph must be hand-authored or converted from licensed sources with permission.

**Mitigation:** 
- Start with one font (Zaner-Bloser print) done well
- Document the font format to allow community contribution
- Evaluate licensing a font tool (e.g. Glyphr Studio) for the team
- Consider licensing existing SVG handwriting fonts if available

**Tradeoff accepted:** One excellent font at launch beats five mediocre ones.

---

### Risk 2: PDF Fidelity

**Risk:** Browser-based SVG→PDF conversion (jsPDF) may not match the visual fidelity teachers expect, especially for custom fonts.

**Mitigation:**
- Test PDF output early (Version 0.2)
- Use `embedFonts: true` in PDF options
- Fall back to Puppeteer-based server rendering via cloud function if desktop quality is needed
- The PDF Engine interface isolates this change to one service

---

### Risk 3: Monorepo Complexity

**Risk:** Monorepo tooling (pnpm workspaces, shared configs) adds initial setup complexity that can frustrate early contributors.

**Mitigation:**
- Write excellent developer setup documentation
- Provide a `./tools/scaffold-app` CLI that generates a new app module correctly
- Start simple (no Turborepo, no Nx) and add build caching only if build times actually become painful

---

### Risk 4: IndexedDB Quotas

**Risk:** Schools' managed Chromebooks may have aggressive storage quotas that prevent storing large artwork libraries or batch worksheets.

**Mitigation:**
- Store bundled artwork as package assets (served from the app bundle, not IndexedDB)
- Only store teacher-uploaded artwork in IndexedDB
- Implement storage usage display in settings
- Design File I/O service for easy export so teachers can back up to Drive

---

### Risk 5: Print Inconsistency Across Browsers

**Risk:** `@media print` CSS behavior varies across Chrome, Safari, and Firefox. Page break handling is particularly inconsistent.

**Mitigation:**
- Target Chrome/Chromebook as the primary print environment (school standard)
- Use PDF export as the primary quality path — print the PDF from Acrobat or Chrome PDF viewer
- Test print in all major browsers in the CI pipeline

---

### Tradeoff: Svelte vs. React

**Tradeoff made:** Svelte was chosen over React.

**What we gain:** Smaller bundle, no virtual DOM overhead, simpler reactivity for SVG rendering, no React-specific patterns bleeding into the component model.

**What we give up:** Smaller ecosystem, fewer third-party Svelte component libraries, React developer familiarity. If the team grows and React expertise dominates, this could be revisited.

**Recommendation:** Proceed with Svelte. Re-evaluate at Version 2.0 if hiring or ecosystem becomes a constraint.

---

### Tradeoff: No Backend in Phase 1

**Tradeoff made:** Phase 1 is entirely browser-based, no server.

**What we gain:** Zero hosting cost, simple deployment (static CDN or even `file://`), no authentication complexity, fast iteration.

**What we give up:** Cross-device sync, large artwork libraries, teacher collaboration, usage analytics.

**Architecture impact:** The Storage Service interface is designed so the implementation can be swapped from IndexedDB to a remote API without touching calling code. The transition is an implementation detail, not an architecture change.

---

*End of Architecture Document — Teacher Toolbox Platform v1.0*

*This document should be reviewed and updated as each major version milestone is reached. Architecture decisions should be revisited in light of real-world usage patterns at Version 1.0 release.*

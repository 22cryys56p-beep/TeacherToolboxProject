# Teacher Toolbox

> A modular educational productivity platform for teachers.  
> Version 0.1.0 — Foundation Release

---

## What is This?

Teacher Toolbox is a browser-based platform that hosts independent educational
application modules — each targeting a specific classroom task — built on a
shared core engine. Teachers install one thing and get a growing suite of tools
that all share the same rendering pipeline, themes, fonts, artwork, and student
roster.

**Phase 1 ships:** iCanSpell — handwriting and spelling worksheet generator.  
**Platform is ready for:** iCanMath, iCanRead, iCanTrace, iCanCreate, and beyond.

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9  (`npm install -g pnpm`)

### Install & Run

```bash
git clone <repo>
cd teacher-toolbox
pnpm install
pnpm dev
```

Opens at `http://localhost:5173`

### Build for Production

```bash
pnpm build:packages   # build shared packages first
pnpm build            # build the shell app
```

Output goes to `apps/shell/dist/` — a static folder you can deploy anywhere.

---

## Monorepo Structure

```
teacher-toolbox/
├── packages/
│   ├── types/              # @teacher-toolbox/types        — shared TS types (no runtime)
│   ├── core/               # @teacher-toolbox/core         — EventBus, PluginManager, Router
│   ├── ui/                 # @teacher-toolbox/ui           — shared Svelte components
│   ├── assets/             # @teacher-toolbox/assets       — fonts, artwork, themes, templates
│   ├── testing/            # @teacher-toolbox/testing      — test utilities and fixtures
│   └── services/
│       ├── storage/        # @teacher-toolbox/storage      — persistence abstraction
│       ├── settings/       # @teacher-toolbox/settings     — teacher preferences
│       ├── theme-engine/   # @teacher-toolbox/theme-engine — theme loading & CSS variables
│       ├── font-manager/   # @teacher-toolbox/font-manager — web fonts & SVG path fonts
│       ├── worksheet-output/ # @teacher-toolbox/worksheet-output — render/PDF/print
│       ├── template-manager/ # @teacher-toolbox/template-manager — template CRUD
│       ├── ai-service/     # @teacher-toolbox/ai-service   — AI abstraction (stubbed)
│       └── artwork/        # @teacher-toolbox/artwork      — artwork filter utilities
├── apps/
│   ├── shell/              # @teacher-toolbox/shell        — platform shell (entry point)
│   └── icanspell/          # @teacher-toolbox/icanspell    — iCanSpell app module
├── tools/
│   └── scaffold-app/       # CLI to generate new app modules
└── docs/
    └── architecture/       # Architecture guides
```

---

## Adding a New App Module

```bash
node tools/scaffold-app/index.js icanmath iCanMath
```

Then register it in `apps/shell/src/main.ts`:
```typescript
import iCanMath from '@teacher-toolbox/icanmath';
platform.plugins.registerApp(iCanMath);
```

And add its path alias to `apps/shell/vite.config.ts`. That's all — the sidebar
updates automatically from the manifest.

See `docs/architecture/PACKAGES.md` for a full explanation of every package.

---

## Technology Stack

| Concern | Technology |
|---------|-----------|
| UI Framework | Svelte 5 |
| Build | Vite 5 |
| Language | TypeScript 5 (strict) |
| Package manager | pnpm workspaces |
| Storage | In-memory (Phase 1) → Dexie.js (Phase 2) |
| PDF | SVG placeholder (Phase 1) → jsPDF (Phase 2) |
| AI | Fully stubbed (Phase 1) |

---

## Architecture Principles

- **Open/Closed:** App modules extend the platform without modifying core code.
- **Single responsibility:** Every package has one job.
- **Explicit dependencies:** `boot.ts` wires everything with plain constructors — no IoC container.
- **EventBus only:** Modules never import each other. Communication is through typed events.
- **Interface-stable services:** Storage, PDF, and AI services hide their implementations. Swapping Dexie for IndexedDB or jsPDF for Puppeteer touches one class, no app code.
- **SVG-first output:** The same render pipeline drives preview, PDF, and print. They cannot diverge.

---

## Version History

| Version | Description |
|---------|-------------|
| **0.1.0** | Foundation — all packages, services, interfaces, and shell. iCanSpell placeholder. |
| **0.2.0** | Rendering Foundation — SVG layout engine, page components, live preview (planned) |
| **0.3.0** | Handwriting Foundation — first SVG path font, ruled lines (planned) |
| **1.0.0** | iCanSpell v1 — complete worksheet generator for public release (planned) |
| **2.0.0** | iCanMath — second app module, validates plugin architecture (planned) |

#!/usr/bin/env node
/**
 * @tool scaffold-app
 * @description CLI tool that generates a new Teacher Toolbox application module
 * with the correct folder structure, package.json, manifest, and AppModule
 * implementation stubbed out.
 *
 * Usage:
 *   node tools/scaffold-app/index.js <appId> <AppName>
 *
 * Example:
 *   node tools/scaffold-app/index.js icanmath iCanMath
 *
 * This generates:
 *   apps/icanmath/
 *     package.json
 *     tsconfig.json
 *     src/
 *       index.ts          ← AppModule implementation
 *       manifest.ts       ← AppManifest
 *       strings.ts        ← Localised strings
 *       pages/
 *         <AppName>Home.svelte
 *       models/           ← (empty, ready for v1.0)
 *       components/       ← (empty)
 *       services/         ← (empty)
 *       assets/           ← (empty)
 *
 * After generation, add the app to apps/shell/src/main.ts:
 *   import iCanMath from '@teacher-toolbox/icanmath';
 *   platform.plugins.registerApp(iCanMath);
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const [,, appId, appName] = process.argv;

if (!appId || !appName) {
  console.error('Usage: node tools/scaffold-app/index.js <appId> <AppName>');
  console.error('Example: node tools/scaffold-app/index.js icanmath iCanMath');
  process.exit(1);
}

const root = join(process.cwd(), 'apps', appId);

if (existsSync(root)) {
  console.error(`Error: apps/${appId} already exists`);
  process.exit(1);
}

// Create directories
const dirs = [
  root,
  join(root, 'src'),
  join(root, 'src', 'pages'),
  join(root, 'src', 'models'),
  join(root, 'src', 'components'),
  join(root, 'src', 'services'),
  join(root, 'src', 'assets'),
];
dirs.forEach((d) => mkdirSync(d, { recursive: true }));

// package.json
writeFileSync(join(root, 'package.json'), JSON.stringify({
  name: `@teacher-toolbox/${appId}`,
  version: '0.1.0',
  description: `${appName} — Teacher Toolbox application module`,
  type: 'module',
  main: './src/index.ts',
  exports: { '.': './src/index.ts' },
  scripts: { typecheck: 'tsc --noEmit' },
  dependencies: {
    '@teacher-toolbox/types': 'workspace:*',
    '@teacher-toolbox/core':  'workspace:*',
    '@teacher-toolbox/ui':    'workspace:*',
  },
  devDependencies: { svelte: '^5.0.0', typescript: '^5.4.0' },
  peerDependencies: { svelte: '^5.0.0' },
}, null, 2));

// tsconfig.json
writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
  extends: '../../tsconfig.base.json',
  compilerOptions: { noEmit: true },
  include: ['src'],
}, null, 2));

// manifest.ts
writeFileSync(join(root, 'src', 'manifest.ts'), `
import type { AppManifest } from '@teacher-toolbox/types';

export const ${appId.toUpperCase()}_MANIFEST: AppManifest = {
  id:          '${appId}' as AppManifest['id'],
  name:        '${appName}',
  description: '${appName} worksheet generator',
  version:     '0.1.0',
  icon:        '${appId}',
  defaultRoute: '/',
  routes: [
    { path: '/', title: 'Worksheet Editor', showInNav: true },
  ],
  capabilities: ['worksheet:create', 'worksheet:print', 'worksheet:pdf'],
  requiredServices: ['storage', 'settings', 'theme-engine', 'font-manager'],
};
`.trim());

// Home page
writeFileSync(join(root, 'src', 'pages', `${appName}Home.svelte`), `
<script lang="ts">
  // ${appName} Phase 1 placeholder
</script>

<div style="padding: 40px; text-align: center;">
  <h1>Welcome to ${appName}</h1>
  <p>Module registered successfully.</p>
</div>
`.trim());

// strings.ts
writeFileSync(join(root, 'src', 'strings.ts'), `
export const Strings = {
  appName: '${appName}',
} as const;
`.trim());

// index.ts
writeFileSync(join(root, 'src', 'index.ts'), `
import { mount, unmount } from 'svelte';
import type { AppModule } from '@teacher-toolbox/types';
import { ${appId.toUpperCase()}_MANIFEST } from './manifest.js';
import ${appName}Home from './pages/${appName}Home.svelte';

let mountedComponent: ReturnType<typeof mount> | null = null;

const ${appId}Module: AppModule = {
  manifest: ${appId.toUpperCase()}_MANIFEST,
  register() { console.info('[${appName}] Registered'); },
  async activate(container) {
    container.innerHTML = '';
    mountedComponent = mount(${appName}Home, { target: container, props: {} });
  },
  async deactivate() {
    if (mountedComponent) { unmount(mountedComponent); mountedComponent = null; }
  },
  async dispose() {
    if (mountedComponent) { unmount(mountedComponent); mountedComponent = null; }
  },
};

export default ${appId}Module;
`.trim());

console.log(`\n✅ Scaffolded ${appName} at apps/${appId}/`);
console.log(`\nNext steps:`);
console.log(`  1. cd apps/${appId} && pnpm install`);
console.log(`  2. Add to apps/shell/src/main.ts:`);
console.log(`       import ${appId} from '@teacher-toolbox/${appId}';`);
console.log(`       platform.plugins.registerApp(${appId});`);
console.log(`  3. Add alias to apps/shell/vite.config.ts`);

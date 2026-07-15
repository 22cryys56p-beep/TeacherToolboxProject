/**
 * @file main.ts
 * @description Shell entry point.
 *
 * To add a new app module:
 *  1. Import it here
 *  2. Call platform.plugins.registerApp(module, ctx)
 *  3. Add its path alias to vite.config.ts
 *  No other files require modification.
 */

import '../../../packages/ui/src/styles/tokens.css';

import { mount }                          from 'svelte';
import App                                from './App.svelte';
import { boot, shutdown, getRegistrationContext } from './boot.js';

import iCanSpell from '@teacher-toolbox/icanspell';

async function main() {
  const platform = await boot();
  const ctx      = getRegistrationContext(platform.plugins);

  // Register all app modules — order determines sidebar display order
  platform.plugins.registerApp(iCanSpell, ctx);

  const rootEl = document.getElementById('app');
  if (!rootEl) throw new Error('[main] #app root element not found');

  mount(App, { target: rootEl, props: { platform } });

  window.addEventListener('beforeunload', () => { void shutdown(platform); });

  console.info('[main] Teacher Toolbox shell mounted');
}

main().catch((err: unknown) => {
  console.error('[main] Fatal boot error:', err);
  document.body.innerHTML = `
    <div style="font-family:system-ui;padding:40px;color:#c00;max-width:500px;margin:40px auto;">
      <h2>Teacher Toolbox failed to start</h2>
      <p style="margin-top:12px;color:#555;">${String(err)}</p>
    </div>`;
});

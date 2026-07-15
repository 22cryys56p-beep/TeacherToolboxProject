/**
 * @module icanspell
 * @description iCanSpell application module entry point.
 *
 * Exports the AppModule implementation as its default export.
 * The shell imports this and calls platform.plugins.registerApp(iCanSpell, ctx).
 *
 * This module NEVER imports from other app modules.
 * Communication with the platform is exclusively via EventBus events
 * and the services provided through PlatformRegistrationContext.
 */

import { mount, unmount }                    from 'svelte';
import type { AppModule, PlatformRegistrationContext } from '@teacher-toolbox/types';
import { ICANSPELL_MANIFEST }                from './manifest.js';
import ICanSpellHome                         from './pages/ICanSpellHome.svelte';

let mountedComponent: ReturnType<typeof mount> | null = null;

const iCanSpellModule: AppModule = {
  manifest: ICANSPELL_MANIFEST,

  register(ctx: PlatformRegistrationContext): void {
    console.info('[iCanSpell] Registering…');

    // v1.0: Register SVG component renderers with the WorksheetRenderer
    // const renderer = ctx.renderer as WorksheetRenderer;
    // renderer.registerComponentRenderer('icanspell.handwriting-line', HandwritingLineRenderer);

    // v1.0: Register document migrations
    // const migrations = ctx.migrations as IMigrationService;
    // migrations.registerMigration(iCanSpellMigration_1_0_to_1_1);

    // v1.0: Register EventBus listeners
    // const bus = ctx.bus;
    // bus.on('student:selected', handleStudentSelected);

    // Suppress unused variable warnings in stub
    void ctx;

    console.info('[iCanSpell] Registered ✓');
  },

  async activate(container: HTMLElement, _path: string): Promise<void> {
    container.innerHTML = '';
    mountedComponent = mount(ICanSpellHome, { target: container, props: {} });
  },

  async deactivate(): Promise<void> {
    if (mountedComponent) { unmount(mountedComponent); mountedComponent = null; }
  },

  async dispose(): Promise<void> {
    if (mountedComponent) { unmount(mountedComponent); mountedComponent = null; }
  },
};

export default iCanSpellModule;

<script lang="ts">
  /**
   * @component App (Shell Root)
   * @description Root Svelte component for the Teacher Toolbox shell.
   * Receives the initialised Platform object from main.ts and coordinates
   * the layout, navigation, and app module activation.
   *
   * The shell's job:
   *  1. Read registered app manifests from PluginManager
   *  2. Render the sidebar with those manifests
   *  3. On navigation: call PluginManager.activateApp() with the mount point
   *  4. Update active state and app name for the header
   */

  import { onMount, onDestroy } from 'svelte';

  import AppSidebar     from './components/navigation/AppSidebar.svelte';
  import AppHeader      from './components/layout/AppHeader.svelte';
  import WorkspaceArea  from './components/layout/WorkspaceArea.svelte';

  import type { Platform } from './boot.js';
  import type { AppManifest, AppId } from '@teacher-toolbox/types';

  export let platform: Platform;

  // ---------------------------------------------------------------------------
  // Reactive state
  // ---------------------------------------------------------------------------

  let manifests:    AppManifest[] = [];
  let activeAppId:  AppId | null  = null;
  let activeAppName: string | null = null;
  let mountPoint:   HTMLElement;
  let isBooting = true;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  let unsubRouter: (() => void) | null = null;

  onMount(async () => {
    // Read manifests from the plugin manager
    manifests = platform.plugins.listManifests();

    // Subscribe to navigation changes from the router
    unsubRouter = platform.router.onChange(async (route) => {
      if (route.appId && mountPoint) {
        try {
          await platform.plugins.activateApp(route.appId, mountPoint, route.path);
          activeAppId   = route.appId;
          const manifest = platform.plugins.getManifest(route.appId);
          activeAppName = manifest?.name ?? null;
        } catch (err) {
          console.error('[App] Failed to activate app:', err);
        }
      }
    });

    // Listen for newly registered apps (registered after shell mounts)
    const unsubBus = platform.bus.on('app:registered', () => {
      manifests = platform.plugins.listManifests();
    });

    // Start the router (processes the current URL hash)
    platform.router.start();

    // If no hash route, navigate to the first registered app
    const currentRoute = platform.router.getCurrentRoute();
    if (!currentRoute?.appId && manifests.length > 0 && manifests[0]) {
      platform.router.navigateToApp(manifests[0].id);
    }

    isBooting = false;

    return () => {
      unsubBus();
    };
  });

  onDestroy(() => {
    unsubRouter?.();
  });

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handleSidebarNavigate(e: CustomEvent<{ appId: AppId }>) {
    platform.router.navigateToApp(e.detail.appId);
  }
</script>

<div class="shell" class:shell--booting={isBooting}>
  <!-- Sidebar -->
  <AppSidebar
    {manifests}
    {activeAppId}
    on:navigate={handleSidebarNavigate}
  />

  <!-- Main column: header + workspace -->
  <div class="shell__main">
    <AppHeader
      appName={activeAppName ?? 'Teacher Toolbox'}
      version="0.1.0"
    />

    <WorkspaceArea activeAppName={activeAppName}>
      <!-- App module mounts into this div via PluginManager.activateApp() -->
      <div bind:this={mountPoint} id="app-mount-point" class="shell__mount" slot="app-cards">
        {#if !activeAppId}
          <!-- Welcome cards — one per registered app -->
          {#each manifests as m (m.id)}
            <button
              class="welcome-card"
              on:click={() => platform.router.navigateToApp(m.id)}
              title={m.description}
            >
              <span class="welcome-card__icon">
                {#if m.icon === 'spell'}✏️
                {:else if m.icon === 'math'}🔢
                {:else if m.icon === 'read'}📖
                {:else}📄{/if}
              </span>
              <span class="welcome-card__name">{m.name}</span>
              <span class="welcome-card__desc">{m.description}</span>
            </button>
          {/each}
        {/if}
      </div>
    </WorkspaceArea>
  </div>
</div>

<style>
  .shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--shell-bg);
    transition: opacity var(--transition-slow);
  }

  .shell--booting { opacity: 0; }

  .shell__main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .shell__mount {
    width: 100%;
    height: 100%;
  }

  /* Welcome app cards */
  .welcome-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-5) var(--space-6);
    background: var(--shell-panel-bg);
    border: 1px solid var(--shell-panel-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    min-width: 120px;
    transition: box-shadow var(--transition-fast), border-color var(--transition-fast),
                transform var(--transition-fast);
    text-align: center;
  }

  .welcome-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--tt-accent);
    transform: translateY(-2px);
  }

  .welcome-card__icon { font-size: 32px; line-height: 1; }
  .welcome-card__name { font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--tt-text-primary); }
  .welcome-card__desc { font-size: var(--text-xs); color: var(--tt-text-secondary); }
</style>

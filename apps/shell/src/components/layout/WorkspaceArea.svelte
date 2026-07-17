<script lang="ts">
  /**
   * @component WorkspaceArea
   * @description The main workspace: a settings/properties panel on the left,
   * a live preview pane in the centre, and a placeholder for future right panel.
   * The app module mounts its content into the #app-mount-point div.
   */

  import { EmptyState } from '@teacher-toolbox/ui';

  export let activeAppName: string | null = null;

  // The actual app content is mounted here by PluginManager.activateApp()
  // via the DOM ref exposed by the shell App.svelte
</script>

<div class="workspace">
  <!-- Left: Properties / settings panel -->
  <aside class="workspace__panel workspace__panel--left" aria-label="Properties">
    <div class="panel-header">
      <span class="panel-header__title">Properties</span>
    </div>
    <div class="panel-body">
      {#if activeAppName}
        <p class="panel-placeholder">
          {activeAppName} properties will appear here.
        </p>
      {:else}
        <EmptyState
          icon="🎛️"
          title="No app active"
          body="Select an application from the sidebar to get started."
        />
      {/if}
    </div>
  </aside>

  <!-- Centre: App mount point + preview -->
  <main class="workspace__main" id="app-workspace">
    <!-- App modules mount their Svelte content here -->
    <div id="app-mount-point" class="workspace__mount">
      {#if !activeAppName}
        <div class="workspace__welcome">
          <div class="workspace__welcome-inner">
            <div class="workspace__welcome-logo" aria-hidden="true">🎓</div>
            <h2 class="workspace__welcome-title">Welcome to Teacher Toolbox</h2>
            <p class="workspace__welcome-sub">
              Select an application from the sidebar to begin.
            </p>
            <div class="workspace__welcome-apps">
              <slot name="app-cards" />
            </div>
          </div>
        </div>
      {/if}
    </div>
  </main>

  <!-- Right: Placeholder for future toolbar/inspector panel -->
  <aside class="workspace__panel workspace__panel--right" aria-label="Tools">
    <div class="panel-header">
      <span class="panel-header__title">Tools</span>
    </div>
    <div class="panel-body">
      <EmptyState
        icon="🔧"
        title="Tools"
        body="App-specific tools will appear here."
      />
    </div>
  </aside>
</div>

<style>
  .workspace {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Panels */
  .workspace__panel {
    display: flex;
    flex-direction: column;
    width: var(--panel-width);
    flex-shrink: 0;
    background: var(--shell-panel-bg);
    overflow: hidden;
  }

  .workspace__panel--left  { border-right:  1px solid var(--shell-panel-border); }
  .workspace__panel--right { border-left:   1px solid var(--shell-panel-border); }

  .panel-header {
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--shell-panel-border);
    min-height: 40px;
  }

  .panel-header__title {
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--tt-text-secondary);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3);
  }

  .panel-placeholder {
    font-size: var(--text-sm);
    color: var(--tt-text-secondary);
    line-height: var(--leading-normal);
  }

  /* Main content area */
  .workspace__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--shell-bg);
    overflow: hidden;
    position: relative;
  }

  .workspace__mount {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  /* Welcome screen */
  .workspace__welcome {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--space-8);
  }

  .workspace__welcome-inner {
    text-align: center;
    max-width: 480px;
  }

  .workspace__welcome-logo {
    font-size: 56px;
    margin-bottom: var(--space-5);
    line-height: 1;
  }

  .workspace__welcome-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--tt-text-primary);
    margin-bottom: var(--space-3);
  }

  .workspace__welcome-sub {
    font-size: var(--text-base);
    color: var(--tt-text-secondary);
    line-height: var(--leading-normal);
    margin-bottom: var(--space-8);
  }

  .workspace__welcome-apps {
    display: flex;
    gap: var(--space-4);
    justify-content: center;
    flex-wrap: wrap;
  }
</style>

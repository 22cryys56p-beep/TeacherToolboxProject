<script lang="ts">
  /**
   * @component AppSidebar
   * @description Left navigation sidebar. Reads registered app manifests
   * from the PluginManager and renders a navigation item for each.
   * The shell never hardcodes app names — it always reads from manifests.
   */

  import type { AppManifest } from '@teacher-toolbox/types';
  import type { AppId } from '@teacher-toolbox/types';

  export let manifests:    AppManifest[] = [];
  export let activeAppId:  AppId | null  = null;

  function handleAppClick(appId: AppId) {
    dispatch('navigate', { appId });
  }

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ navigate: { appId: AppId } }>();
</script>

<nav class="sidebar" aria-label="Applications">
  <!-- Platform logo / wordmark -->
  <div class="sidebar__brand">
    <span class="sidebar__brand-icon">🎓</span>
    <span class="sidebar__brand-name">Teacher<br>Toolbox</span>
  </div>

  <div class="sidebar__divider" role="separator"></div>

  <!-- App navigation -->
  <ul class="sidebar__nav" role="list">
    {#each manifests as manifest (manifest.id)}
      <li>
        <button
          class="sidebar__item"
          class:sidebar__item--active={activeAppId === manifest.id}
          on:click={() => handleAppClick(manifest.id)}
          title={manifest.description}
          aria-current={activeAppId === manifest.id ? 'page' : undefined}
        >
          <span class="sidebar__item-icon" aria-hidden="true">
            {#if manifest.icon === 'spell'}✏️
            {:else if manifest.icon === 'math'}🔢
            {:else if manifest.icon === 'read'}📖
            {:else}📄{/if}
          </span>
          <span class="sidebar__item-label">{manifest.name}</span>
        </button>
      </li>
    {/each}

    {#if manifests.length === 0}
      <li class="sidebar__empty">No apps installed</li>
    {/if}
  </ul>

  <!-- Bottom actions -->
  <div class="sidebar__footer">
    <div class="sidebar__divider" role="separator"></div>
    <button class="sidebar__item sidebar__item--footer" title="Student roster">
      <span class="sidebar__item-icon" aria-hidden="true">👥</span>
      <span class="sidebar__item-label">Students</span>
    </button>
    <button class="sidebar__item sidebar__item--footer" title="Platform settings">
      <span class="sidebar__item-icon" aria-hidden="true">⚙️</span>
      <span class="sidebar__item-label">Settings</span>
    </button>
  </div>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    height: 100%;
    background: var(--shell-sidebar-bg);
    color: var(--shell-sidebar-text);
    flex-shrink: 0;
    overflow: hidden;
  }

  .sidebar__brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-4);
    min-height: var(--header-height);
  }

  .sidebar__brand-icon {
    font-size: 22px;
    line-height: 1;
    flex-shrink: 0;
  }

  .sidebar__brand-name {
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #ffffff;
    line-height: var(--leading-tight);
  }

  .sidebar__divider {
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 0 var(--space-3);
  }

  .sidebar__nav {
    list-style: none;
    padding: var(--space-2) 0;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sidebar__item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-2) var(--space-4);
    background: none;
    border: none;
    color: var(--shell-sidebar-text);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    border-radius: var(--radius-md);
    margin: 1px var(--space-2);
    width: calc(100% - var(--space-4));
    transition: background var(--transition-fast), color var(--transition-fast);
    text-align: left;
    cursor: pointer;
  }

  .sidebar__item:hover {
    background: var(--shell-sidebar-hover);
    color: #ffffff;
  }

  .sidebar__item--active {
    background: rgba(255,255,255,0.12);
    color: var(--shell-sidebar-active);
  }

  .sidebar__item-icon {
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
    width: 20px;
    text-align: center;
  }

  .sidebar__item-label { flex: 1; }

  .sidebar__empty {
    padding: var(--space-4);
    font-size: var(--text-xs);
    opacity: 0.5;
    text-align: center;
  }

  .sidebar__footer {
    padding-bottom: var(--space-3);
  }

  .sidebar__item--footer {
    opacity: 0.75;
  }
  .sidebar__item--footer:hover { opacity: 1; }
</style>

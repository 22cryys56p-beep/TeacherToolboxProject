<script lang="ts">
  /**
   * @component AppHeader
   * @description Top header bar. Shows the active app name, student selector
   * placeholder, and global action buttons (settings, help).
   */

  export let appName = 'Teacher Toolbox';
  export let version = '0.1.0';
</script>

<header class="header">
  <div class="header__left">
    <h1 class="header__app-name">{appName}</h1>
    <span class="header__version">v{version}</span>
  </div>

  <div class="header__center">
    <!-- Student selector — wired up in v1.0 -->
    <button class="header__student-btn" title="Select student (coming in v1.0)" disabled>
      <span class="header__student-icon" aria-hidden="true">👤</span>
      <span class="header__student-label">No student selected</span>
      <span class="header__student-caret" aria-hidden="true">▾</span>
    </button>
  </div>

  <div class="header__right">
    <button class="header__icon-btn" title="Help" aria-label="Help">
      <span aria-hidden="true">❓</span>
    </button>
    <button class="header__icon-btn" title="Settings" aria-label="Settings">
      <span aria-hidden="true">⚙️</span>
    </button>
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    padding: 0 var(--space-4);
    background: var(--shell-header-bg);
    border-bottom: 1px solid var(--shell-header-border);
    gap: var(--space-4);
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }

  .header__left {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    min-width: 160px;
  }

  .header__app-name {
    font-size: var(--text-md);
    font-weight: var(--font-semibold);
    color: var(--tt-text-primary);
    white-space: nowrap;
  }

  .header__version {
    font-size: var(--text-xs);
    color: var(--tt-text-secondary);
    font-family: var(--font-mono);
  }

  .header__center { flex: 1; display: flex; justify-content: center; }

  .header__student-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--shell-bg);
    border: 1px solid var(--shell-panel-border);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    color: var(--tt-text-secondary);
    cursor: not-allowed;
    transition: border-color var(--transition-fast);
  }

  .header__student-icon { font-size: 14px; }
  .header__student-caret { font-size: 10px; opacity: 0.6; }

  .header__right {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 80px;
    justify-content: flex-end;
  }

  .header__icon-btn {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    border-radius: var(--radius-md);
    font-size: 16px;
    color: var(--tt-text-secondary);
    transition: background var(--transition-fast);
  }

  .header__icon-btn:hover {
    background: var(--shell-bg);
    color: var(--tt-text-primary);
  }
</style>

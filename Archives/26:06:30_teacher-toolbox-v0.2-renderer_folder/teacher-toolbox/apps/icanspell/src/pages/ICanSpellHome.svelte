<script lang="ts">
  /**
   * @component ICanSpellHome
   * @description Phase 1 placeholder page for iCanSpell.
   * Demonstrates that the module system works — this component is mounted
   * by ICanSpellModule.activate() into the shell's mount point.
   *
   * v1.0: Replace with the full worksheet editor.
   */

  import { ICANSPELL_MANIFEST } from '../manifest.js';

  const { version, capabilities } = ICANSPELL_MANIFEST;
</script>

<div class="ics-home">
  <div class="ics-home__card">
    <div class="ics-home__icon" aria-hidden="true">✏️</div>
    <h1 class="ics-home__title">Welcome to iCanSpell</h1>
    <p class="ics-home__subtitle">
      Handwriting &amp; spelling worksheet generator
    </p>

    <div class="ics-home__meta">
      <span class="ics-home__badge">v{version}</span>
      <span class="ics-home__badge ics-home__badge--status">Phase 1 — Architecture Demo</span>
    </div>

    <div class="ics-home__divider"></div>

    <p class="ics-home__body">
      The iCanSpell module has successfully registered with the Teacher Toolbox
      platform. The module system, event bus, router, and service layer are
      all wired up and operational.
    </p>

    <div class="ics-home__checklist">
      <p class="ics-home__checklist-title">Module capabilities registered:</p>
      <ul>
        {#each capabilities as cap}
          <li class="ics-home__check">
            <span class="ics-home__check-icon" aria-hidden="true">✅</span>
            <code>{cap}</code>
          </li>
        {/each}
      </ul>
    </div>

    <div class="ics-home__divider"></div>

    <p class="ics-home__roadmap-label">Coming in v1.0:</p>
    <ul class="ics-home__roadmap">
      <li>Word list manager</li>
      <li>Handwriting line worksheet builder</li>
      <li>Spelling practice worksheet builder</li>
      <li>SVG handwriting fonts (Zaner-Bloser Print)</li>
      <li>Template gallery</li>
      <li>PDF export &amp; batch class printing</li>
      <li>Student personalisation</li>
    </ul>
  </div>
</div>

<style>
  .ics-home {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    padding: var(--space-8);
    background: var(--shell-bg);
  }

  .ics-home__card {
    background: var(--shell-panel-bg);
    border: 1px solid var(--shell-panel-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: var(--space-10) var(--space-12);
    max-width: 520px;
    width: 100%;
  }

  .ics-home__icon {
    font-size: 48px;
    line-height: 1;
    margin-bottom: var(--space-4);
  }

  .ics-home__title {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--tt-text-primary);
    margin-bottom: var(--space-2);
  }

  .ics-home__subtitle {
    font-size: var(--text-base);
    color: var(--tt-text-secondary);
    margin-bottom: var(--space-4);
  }

  .ics-home__meta {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    margin-bottom: var(--space-5);
  }

  .ics-home__badge {
    display: inline-block;
    padding: 2px var(--space-2);
    background: var(--shell-bg);
    border: 1px solid var(--shell-panel-border);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--tt-text-secondary);
  }

  .ics-home__badge--status {
    background: rgba(29,111,184,0.08);
    border-color: rgba(29,111,184,0.25);
    color: var(--tt-text-accent);
  }

  .ics-home__divider {
    height: 1px;
    background: var(--shell-panel-border);
    margin: var(--space-5) 0;
  }

  .ics-home__body {
    font-size: var(--text-sm);
    color: var(--tt-text-secondary);
    line-height: var(--leading-normal);
    margin-bottom: var(--space-5);
  }

  .ics-home__checklist { margin-bottom: var(--space-4); }

  .ics-home__checklist-title {
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--tt-text-secondary);
    margin-bottom: var(--space-3);
  }

  .ics-home__checklist ul { list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }

  .ics-home__check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  .ics-home__check-icon { font-size: 13px; }

  .ics-home__check code {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    background: var(--shell-bg);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    color: var(--tt-text-accent);
  }

  .ics-home__roadmap-label {
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--tt-text-secondary);
    margin-bottom: var(--space-3);
  }

  .ics-home__roadmap {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .ics-home__roadmap li {
    font-size: var(--text-sm);
    color: var(--tt-text-secondary);
    padding-left: var(--space-4);
    position: relative;
  }

  .ics-home__roadmap li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: var(--tt-accent);
    font-weight: var(--font-bold);
  }
</style>

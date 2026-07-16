<script lang="ts">
  /**
   * @component EmptyState
   * @description Shown when a list, panel, or workspace area has no content.
   * Provides a consistent, friendly placeholder across the platform.
   */
  export let icon  = '📄';
  export let title = 'Nothing here yet';
  export let body  = '';
</script>

<div class="empty-state">
  <div class="empty-state__icon" aria-hidden="true">{icon}</div>
  <p class="empty-state__title">{title}</p>
  {#if body}
    <p class="empty-state__body">{body}</p>
  {/if}
  {#if $$slots.action}
    <div class="empty-state__action">
      <slot name="action" />
    </div>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-12) var(--space-8);
    text-align: center;
    color: var(--tt-text-secondary);
  }
  .empty-state__icon { font-size: 40px; line-height: 1; }
  .empty-state__title { font-size: var(--text-md); font-weight: var(--font-semibold); color: var(--tt-text-primary); }
  .empty-state__body  { font-size: var(--text-sm); max-width: 320px; line-height: var(--leading-normal); }
  .empty-state__action { margin-top: var(--space-2); }
</style>

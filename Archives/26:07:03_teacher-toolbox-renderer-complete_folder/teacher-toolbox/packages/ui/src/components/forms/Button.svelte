<script lang="ts">
  /**
   * @component Button
   * @description Primary action button for the Teacher Toolbox platform.
   * Variants: primary (accent-filled), secondary (outlined), ghost (text-only).
   */

  export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let loading  = false;
  export let type: 'button' | 'submit' = 'button';
  export let title = '';
</script>

<button
  {type}
  {disabled}
  {title}
  class="btn btn--{variant} btn--{size}"
  class:btn--loading={loading}
  on:click
  on:focus
  on:blur
>
  {#if loading}
    <span class="btn__spinner" aria-hidden="true"></span>
  {/if}
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-weight: var(--font-medium);
    line-height: 1;
    transition: background var(--transition-fast), color var(--transition-fast),
                box-shadow var(--transition-fast), opacity var(--transition-fast);
    white-space: nowrap;
    user-select: none;
  }

  /* Sizes */
  .btn--sm  { font-size: var(--text-xs);  padding: var(--space-1) var(--space-3); height: 28px; }
  .btn--md  { font-size: var(--text-sm);  padding: var(--space-2) var(--space-4); height: 36px; }
  .btn--lg  { font-size: var(--text-base); padding: var(--space-3) var(--space-6); height: 44px; }

  /* Variants */
  .btn--primary {
    background: var(--tt-accent);
    color: #ffffff;
  }
  .btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
  .btn--primary:active:not(:disabled) { filter: brightness(0.95); }

  .btn--secondary {
    background: transparent;
    color: var(--tt-accent);
    border: 1.5px solid var(--tt-accent);
  }
  .btn--secondary:hover:not(:disabled) { background: rgba(29,111,184,0.06); }

  .btn--ghost {
    background: transparent;
    color: var(--tt-text-secondary);
  }
  .btn--ghost:hover:not(:disabled) { background: var(--shell-sidebar-hover); color: var(--tt-text-primary); }

  /* States */
  .btn:disabled,
  .btn--loading { opacity: 0.55; cursor: not-allowed; }

  .btn__spinner {
    width: 14px; height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>

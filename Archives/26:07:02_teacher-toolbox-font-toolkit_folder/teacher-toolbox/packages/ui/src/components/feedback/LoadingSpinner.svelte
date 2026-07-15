<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let label = 'Loading…';
</script>

<div class="spinner spinner--{size}" role="status" aria-label={label}>
  <div class="spinner__ring" aria-hidden="true"></div>
  <span class="sr-only">{label}</span>
</div>

<style>
  .spinner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .spinner--sm .spinner__ring { width: 16px; height: 16px; border-width: 2px; }
  .spinner--md .spinner__ring { width: 24px; height: 24px; border-width: 2px; }
  .spinner--lg .spinner__ring { width: 40px; height: 40px; border-width: 3px; }

  .spinner__ring {
    border-style: solid;
    border-color: var(--tt-border-color);
    border-top-color: var(--tt-accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .sr-only {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>

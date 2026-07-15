/**
 * @module FeatureFlagsService
 * @description Static feature flag service.
 *
 * Feature flags control which capabilities are visible in the UI, independent
 * of subscription entitlements. Where entitlements answer "is this user allowed
 * to use this feature?", feature flags answer "does this feature exist yet?".
 *
 * Use cases:
 *  - Ship a partially-built feature to beta users without a code deployment
 *  - Disable a broken feature without a hotfix release
 *  - Run A/B tests on UI copy and layouts
 *  - Enable AI features only for users who have opted in
 *  - Allow promotional access grants outside the normal subscription tiers
 *
 * Phase 1 implementation: reads from a static bundled flags object.
 * Future implementation: merges bundled defaults with overrides fetched from
 * a remote config endpoint (LaunchDarkly, Unleash, or a custom endpoint).
 * The interface is identical in both cases — no call site changes needed.
 *
 * @status PLACEHOLDER — all flags default to safe off values
 */

import type { PlatformService } from '@teacher-toolbox/types';

// ---------------------------------------------------------------------------
// Flag definitions
// ---------------------------------------------------------------------------

/**
 * All feature flags in the platform. Adding a new flag = adding one entry here.
 * All flags default to false (off) unless explicitly enabled in BUNDLED_FLAGS.
 */
export type FeatureFlag =
  // AI features — off until AI service is wired
  | 'ai:word-list-generation'
  | 'ai:sentence-generation'
  | 'ai:artwork-generation'
  | 'ai:math-problems'
  // Cloud features — off until cloud services are built
  | 'cloud:sync'
  | 'cloud:backup'
  | 'cloud:share'
  // Advertising — off until consent and legal review are complete
  | 'ads:self-serve'
  | 'ads:third-party'
  // Community features — off until marketplace is built
  | 'community:template-gallery'
  | 'community:share-template'
  // Beta features — toggled per-user via remote config
  | 'beta:new-renderer'
  | 'beta:batch-pdf'
  // Experimental features under development
  | 'dev:show-render-debug';

/** Flags that have string variants (for A/B testing copy, layout, etc.) */
export type VariantFlag = never; // extend when first A/B test is needed

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IFeatureFlags extends PlatformService {
  /** Returns true if the flag is enabled for the current session */
  isEnabled(flag: FeatureFlag): boolean;

  /**
   * Returns the variant string for a flag used in A/B tests.
   * Returns null if the flag is not enabled or has no variant.
   */
  getVariant(flag: VariantFlag): string | null;

  /**
   * Override a flag for the current session (does not persist).
   * Used by dev tools and test utilities.
   */
  override(flag: FeatureFlag, value: boolean): void;

  /** Clear all session overrides */
  clearOverrides(): void;
}

// ---------------------------------------------------------------------------
// Bundled default flag values
// ---------------------------------------------------------------------------

/**
 * Safe defaults — all commercial and AI flags are off.
 * Override specific flags here as features are built and stabilised.
 */
const BUNDLED_FLAGS: Partial<Record<FeatureFlag, boolean>> = {
  // No flags enabled in v0.1 — all features gated until explicitly turned on
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class FeatureFlagsService implements IFeatureFlags {
  readonly serviceId = 'feature-flags';

  private readonly flags:     Map<FeatureFlag, boolean> = new Map();
  private readonly overrides: Map<FeatureFlag, boolean> = new Map();

  async initialize(): Promise<void> {
    // Load bundled defaults
    for (const [flag, value] of Object.entries(BUNDLED_FLAGS)) {
      this.flags.set(flag as FeatureFlag, value);
    }
    // TODO: merge with remote config overrides when cloud services are enabled
    // const remote = await fetchRemoteFlags(userId);
    // for (const [flag, value] of Object.entries(remote)) { this.flags.set(flag, value); }
    console.info(`[FeatureFlags] Initialised — ${this.flags.size} flags loaded`);
  }

  async dispose(): Promise<void> {
    this.flags.clear();
    this.overrides.clear();
  }

  isEnabled(flag: FeatureFlag): boolean {
    // Session overrides take precedence (for dev tools and testing)
    if (this.overrides.has(flag)) return this.overrides.get(flag)!;
    return this.flags.get(flag) ?? false;
  }

  getVariant(_flag: VariantFlag): string | null {
    return null; // no variants defined yet
  }

  override(flag: FeatureFlag, value: boolean): void {
    this.overrides.set(flag, value);
    console.info(`[FeatureFlags] Override: ${flag} = ${String(value)}`);
  }

  clearOverrides(): void {
    this.overrides.clear();
  }
}

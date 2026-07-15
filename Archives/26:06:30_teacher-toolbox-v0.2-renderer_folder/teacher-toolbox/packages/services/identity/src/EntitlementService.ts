/**
 * @module EntitlementService
 * @description Resolves the user's commercial grants into yes/no capability checks.
 *
 * The distinction between subscription and entitlement is intentional and important:
 *  - Subscription: "this user has the Educator plan" (commercial fact)
 *  - Entitlement:  "this user can export PDFs" (resolved capability)
 *
 * A user may have an entitlement through multiple paths:
 *  - Their subscription tier
 *  - An active trial
 *  - A promotional grant
 *  - An admin override (school IT department)
 *
 * This service resolves all paths into a single boolean per entitlement.
 * App modules never inspect subscription tier directly — they check entitlements.
 * This means the commercial model can change (new tiers, promotions, bundles)
 * without touching any app module code.
 *
 * @status PLACEHOLDER — resolves correctly against free tier; all paid features denied
 */

import type { Entitlement, EntitlementReason, PlatformService, SubscriptionState, SubscriptionTier } from '@teacher-toolbox/types';

export interface IEntitlementService extends PlatformService {
  /** Check whether the current user has a specific entitlement */
  has(entitlement: Entitlement): boolean;

  /**
   * Returns the numeric limit for a capped entitlement.
   * Returns Infinity for 'unlimited'.
   */
  getLimit(entitlement: 'students:unlimited' | 'classrooms:multiple'): number;

  /**
   * Returns the reason an entitlement is granted or denied.
   * Used by UI components to show contextual upgrade prompts.
   */
  getReason(entitlement: Entitlement): EntitlementReason;

  /**
   * Gate a code path on an entitlement.
   * Returns onGranted() if entitled, onDenied(reason) if not.
   *
   * @example
   * const blob = entitlements.gate(
   *   'export:pdf',
   *   () => renderer.renderFull(doc),
   *   (reason) => { throw new EntitlementError(reason); }
   * );
   */
  gate<T>(
    entitlement: Entitlement,
    onGranted: () => T,
    onDenied:  (reason: EntitlementReason) => T,
  ): T;

  /** Recalculate entitlements from an updated subscription state */
  updateSubscription(state: SubscriptionState): void;
}

// ---------------------------------------------------------------------------
// Entitlement matrix — which tiers grant which entitlements
// ---------------------------------------------------------------------------

type EntitlementMatrix = Partial<Record<Entitlement, SubscriptionTier[]>>;

/**
 * The authoritative map from entitlement → minimum tier required.
 * 'free' entries mean the entitlement is available on all tiers.
 * Omitting an entitlement means it defaults to ['educator','school','district','trial'].
 */
const ENTITLEMENT_MATRIX: EntitlementMatrix = {
  // Free tier gets these
  'export:pdf':                ['free', 'educator', 'school', 'district', 'trial'],
  // Batch export is paid
  'export:batch':              ['educator', 'school', 'district', 'trial'],
  'export:png':                ['educator', 'school', 'district', 'trial'],
  // Premium content
  'templates:premium':         ['educator', 'school', 'district', 'trial'],
  'artwork:premium':           ['educator', 'school', 'district', 'trial'],
  'fonts:premium':             ['educator', 'school', 'district', 'trial'],
  // Roster — free tier capped
  'students:unlimited':        ['educator', 'school', 'district', 'trial'],
  'classrooms:multiple':       ['educator', 'school', 'district', 'trial'],
  // Cloud
  'cloud:sync':                ['educator', 'school', 'district'],
  'cloud:backup':              ['educator', 'school', 'district'],
  'cloud:share':               ['school', 'district'],
  // Branding
  'branding:remove-watermark': ['educator', 'school', 'district', 'trial'],
  'branding:custom-logo':      ['school', 'district'],
  // Ad-free (paid users see no ads)
  'ads:free':                  ['educator', 'school', 'district', 'trial'],
  // AI (all gated — requires AI service to be active too)
  'ai:word-list':              ['educator', 'school', 'district', 'trial'],
  'ai:sentence-generation':    ['educator', 'school', 'district', 'trial'],
  'ai:artwork':                ['educator', 'school', 'district'],
  'ai:math-problems':          ['educator', 'school', 'district', 'trial'],
  'ai:reading-passages':       ['educator', 'school', 'district', 'trial'],
  // App module unlocks (future paid add-ons)
  'app:icanmath':              ['free', 'educator', 'school', 'district', 'trial'],
  'app:icanread':              ['free', 'educator', 'school', 'district', 'trial'],
  'app:icantrace':             ['free', 'educator', 'school', 'district', 'trial'],
  'app:icancreate':            ['free', 'educator', 'school', 'district', 'trial'],
  'app:icanplay':              ['free', 'educator', 'school', 'district', 'trial'],
};

const FREE_TIER_LIMITS: Partial<Record<string, number>> = {
  'students:unlimited':  30,   // free tier: up to 30 students
  'classrooms:multiple': 1,    // free tier: 1 classroom
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class EntitlementService implements IEntitlementService {
  readonly serviceId = 'entitlements';

  private subscription: SubscriptionState;

  constructor(initialSubscription: SubscriptionState) {
    this.subscription = initialSubscription;
  }

  async initialize(): Promise<void> {
    console.info(`[EntitlementService] Initialised — tier: ${this.subscription.tier}`);
  }

  async dispose(): Promise<void> { /* stateless */ }

  updateSubscription(state: SubscriptionState): void {
    this.subscription = state;
  }

  has(entitlement: Entitlement): boolean {
    const allowedTiers = ENTITLEMENT_MATRIX[entitlement];
    if (!allowedTiers) {
      // Not in matrix = paid-only by default
      return this.subscription.tier !== 'free';
    }
    return (allowedTiers as SubscriptionTier[]).includes(this.subscription.tier);
  }

  getLimit(entitlement: 'students:unlimited' | 'classrooms:multiple'): number {
    if (this.has(entitlement)) return Infinity;
    return FREE_TIER_LIMITS[entitlement] ?? 0;
  }

  getReason(entitlement: Entitlement): EntitlementReason {
    if (this.has(entitlement)) {
      return { granted: true, source: 'subscription' };
    }
    return {
      granted:        false,
      upgradeTarget:  'educator',
      upgradeTrigger: `feature-gate:${entitlement}` as import('@teacher-toolbox/types').UpgradeTrigger,
    };
  }

  gate<T>(
    entitlement: Entitlement,
    onGranted:   () => T,
    onDenied:    (reason: EntitlementReason) => T,
  ): T {
    return this.has(entitlement)
      ? onGranted()
      : onDenied(this.getReason(entitlement));
  }
}

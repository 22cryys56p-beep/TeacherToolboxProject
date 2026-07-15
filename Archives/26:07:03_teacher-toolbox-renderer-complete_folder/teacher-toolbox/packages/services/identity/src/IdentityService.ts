/**
 * @module IdentityService
 * @description The single source of truth for all commercial identity questions.
 *
 * Composes AuthService + SubscriptionService + EntitlementService into a single
 * coherent IdentityContext that every app module and service can query.
 *
 * App modules import IIdentityService and call:
 *   identity.can('export:pdf')          → boolean
 *   identity.isPaid()                   → boolean
 *   identity.isAnonymous()              → boolean
 *   identity.getContext()               → full IdentityContext
 *
 * They never import IAuthService, ISubscriptionService, or IEntitlementService directly.
 * The IdentityService is the only commercial interface app modules need.
 *
 * When auth or subscription state changes, IdentityService re-composes the context
 * and notifies all registered handlers. This ensures the entire platform reacts
 * consistently to commercial state changes.
 *
 * @status PLACEHOLDER — anonymous identity, free tier, all commercial features off
 */

import type {
  AdEligibility,
  AuthState,
  CloudServiceState,
  Entitlement,
  IdentityContext,
  PlatformService,
  SubscriptionState,
} from '@teacher-toolbox/types';
import type { Unsubscribe } from '@teacher-toolbox/core';
import type { IAuthService } from './AuthService.js';
import type { ISubscriptionService } from './SubscriptionService.js';
import type { IEntitlementService } from './EntitlementService.js';

export interface IIdentityService extends PlatformService {
  /** Full commercial context for the current session */
  getContext(): IdentityContext;

  /** Shorthand — checks a single entitlement */
  can(entitlement: Entitlement): boolean;

  /** True if the user has any paid subscription (educator, school, district, or active trial) */
  isPaid(): boolean;

  /** True if the user has no account (anonymous) */
  isAnonymous(): boolean;

  /** Register a handler called whenever auth or subscription state changes */
  onContextChange(handler: (ctx: IdentityContext) => void): Unsubscribe;
}

const DEFAULT_CLOUD_STATE: CloudServiceState = {
  services:     {},
  lastSyncAt:   null,
  pendingCount: 0,
};

export class IdentityService implements IIdentityService {
  readonly serviceId = 'identity';

  private context: IdentityContext;
  private readonly handlers: Array<(ctx: IdentityContext) => void> = [];
  private readonly unsubAuth: Unsubscribe;
  private readonly unsubSub:  Unsubscribe;

  constructor(
    private readonly auth:         IAuthService,
    private readonly subscription: ISubscriptionService,
    private readonly entitlements: IEntitlementService,
  ) {
    this.context = this.buildContext(auth.getState(), subscription.getState());

    // Re-compose context whenever either auth or subscription changes
    this.unsubAuth = auth.onStateChange((authState) => {
      this.context = this.buildContext(authState, this.subscription.getState());
      this.notifyHandlers();
    });

    this.unsubSub = subscription.onStateChange((subState) => {
      this.entitlements.updateSubscription(subState);
      this.context = this.buildContext(this.auth.getState(), subState);
      this.notifyHandlers();
    });
  }

  async initialize(): Promise<void> {
    console.info(
      `[IdentityService] Initialised — status: ${this.context.auth.status}, tier: ${this.context.subscription.tier}`,
    );
  }

  async dispose(): Promise<void> {
    this.unsubAuth();
    this.unsubSub();
    this.handlers.length = 0;
  }

  getContext(): IdentityContext { return this.context; }

  can(entitlement: Entitlement): boolean {
    return this.entitlements.has(entitlement);
  }

  isPaid(): boolean {
    const tier = this.context.subscription.tier;
    return tier === 'educator' || tier === 'school' || tier === 'district' || tier === 'trial';
  }

  isAnonymous(): boolean {
    return this.context.auth.status === 'anonymous';
  }

  onContextChange(handler: (ctx: IdentityContext) => void): Unsubscribe {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx !== -1) this.handlers.splice(idx, 1);
    };
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private buildContext(auth: AuthState, sub: SubscriptionState): IdentityContext {
    const isPaid = sub.tier !== 'free';
    const adEligibility: AdEligibility = {
      selfServeAds:  !isPaid,
      thirdPartyAds: false,    // requires affirmative consent — never true by default
      showWatermark: !this.entitlements.has('branding:remove-watermark'),
    };

    return {
      auth,
      subscription:  sub,
      adEligibility,
      cloud:         DEFAULT_CLOUD_STATE,
    };
  }

  private notifyHandlers(): void {
    for (const h of this.handlers) {
      try { h(this.context); }
      catch { /* handler errors must not disrupt identity updates */ }
    }
  }
}

/**
 * @module SubscriptionService
 * @description Subscription tier and status management.
 *
 * Tracks the user's commercial relationship with the platform.
 * Never reads entitlements directly — that is the EntitlementService's job.
 * This service only knows "what plan does this user have and is it active?"
 *
 * Phase 1 implementation: always returns free tier / no subscription.
 * Future implementation: verifies subscription status against the billing backend
 * (Stripe, Paddle, or a custom licensing service) on app load and after payment events.
 *
 * @status STUB — always returns free tier
 */

import type { PlatformService, SubscriptionState } from '@teacher-toolbox/types';
import type { Unsubscribe } from '@teacher-toolbox/core';

export interface ISubscriptionService extends PlatformService {
  getState(): SubscriptionState;

  /** Open the upgrade flow in the browser. */
  openUpgradeFlow(trigger?: string): Promise<void>;

  /**
   * Refresh subscription status from the billing backend.
   * Called on app load and after payment webhook receipt.
   */
  refresh(): Promise<void>;

  onStateChange(handler: (state: SubscriptionState) => void): Unsubscribe;
}

const FREE_STATE: SubscriptionState = {
  tier:             'free',
  status:           'none',
  expiresAt:        null,
  trialEndsAt:      null,
  organisationId:   null,
  organisationName: null,
  seatsTotal:       null,
  seatsUsed:        null,
};

export class LocalSubscriptionService implements ISubscriptionService {
  readonly serviceId = 'subscription';

  private readonly handlers: Array<(state: SubscriptionState) => void> = [];

  async initialize(): Promise<void> {
    console.info('[SubscriptionService] Initialised (free tier stub — no billing backend connected)');
  }

  async dispose(): Promise<void> {
    this.handlers.length = 0;
  }

  getState(): SubscriptionState {
    return FREE_STATE;
  }

  async openUpgradeFlow(trigger?: string): Promise<void> {
    console.info(`[SubscriptionService] openUpgradeFlow(${trigger ?? 'unknown'}) — no billing URL configured`);
    // TODO: open Stripe/Paddle checkout or redirect to pricing page
  }

  async refresh(): Promise<void> {
    console.info('[SubscriptionService] refresh() — no billing backend connected');
    // TODO: verify subscription status against billing backend
  }

  onStateChange(handler: (state: SubscriptionState) => void): Unsubscribe {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx !== -1) this.handlers.splice(idx, 1);
    };
  }
}

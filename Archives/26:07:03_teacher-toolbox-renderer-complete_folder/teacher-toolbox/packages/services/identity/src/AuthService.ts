/**
 * @module AuthService
 * @description Authentication state management.
 *
 * Manages the user's authentication lifecycle: anonymous → authenticated → expired.
 * Sign-in methods open a browser redirect or popup; the result is communicated
 * back via onStateChange handlers and the auth:state-changed EventBus event.
 *
 * The session token is managed internally and never exposed to app modules.
 * App modules read auth state through IIdentityService.getContext().auth —
 * they never import IAuthService directly.
 *
 * Phase 1 implementation: always returns anonymous state.
 * Future implementation: integrates with a backend auth service
 * (Firebase Auth, Supabase, Auth0, or a custom JWT endpoint).
 *
 * @status STUB — always anonymous; no network calls made
 */

import type { AuthProvider, AuthState, PlatformService } from '@teacher-toolbox/types';
import type { Unsubscribe } from '@teacher-toolbox/core';

export interface IAuthService extends PlatformService {
  getState(): AuthState;

  /** Open the provider's sign-in flow. Returns after the flow is initiated — not completed. */
  signIn(provider: AuthProvider): Promise<void>;

  /** Sign out and clear the session. */
  signOut(): Promise<void>;

  /**
   * Attempt to refresh the session token silently.
   * Returns true if the session is now valid, false if the user must re-authenticate.
   */
  refreshSession(): Promise<boolean>;

  /** Register a handler called whenever auth state changes. */
  onStateChange(handler: (state: AuthState) => void): Unsubscribe;
}

const ANONYMOUS_STATE: AuthState = {
  status:       'anonymous',
  userId:       null,
  email:        null,
  displayName:  null,
  avatarUrl:    null,
  provider:     null,
  sessionToken: null,
};

export class AnonymousAuthService implements IAuthService {
  readonly serviceId = 'auth';

  private readonly handlers: Array<(state: AuthState) => void> = [];

  async initialize(): Promise<void> {
    console.info('[AuthService] Initialised (anonymous stub — no auth provider connected)');
  }

  async dispose(): Promise<void> {
    this.handlers.length = 0;
  }

  getState(): AuthState {
    return ANONYMOUS_STATE;
  }

  async signIn(_provider: AuthProvider): Promise<void> {
    console.warn('[AuthService] signIn() called but no auth provider is connected.');
    // TODO: integrate auth provider (Firebase Auth, Supabase, Auth0, custom JWT)
  }

  async signOut(): Promise<void> {
    console.warn('[AuthService] signOut() — already anonymous.');
  }

  async refreshSession(): Promise<boolean> {
    return false; // no session to refresh
  }

  onStateChange(handler: (state: AuthState) => void): Unsubscribe {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx !== -1) this.handlers.splice(idx, 1);
    };
  }

  protected notifyHandlers(state: AuthState): void {
    for (const h of this.handlers) {
      try { h(state); } catch { /* handler errors must not break auth flow */ }
    }
  }
}

/**
 * @module AnalyticsService
 * @description Product analytics and conversion tracking.
 *
 * Every meaningful user action is tracked through this service so the
 * product team can answer: which features drive upgrades, where teachers
 * abandon workflows, which templates are most used, which feature gates
 * convert to paid subscriptions.
 *
 * All analytics events carry an UpgradeTrigger when relevant — this is
 * how conversion attribution works without a dedicated attribution service.
 *
 * Phase 1 implementation: no-op. Events are typed and structured but not sent.
 * Future implementation: batches and sends to a telemetry endpoint (Mixpanel,
 * Amplitude, PostHog, or a custom pipeline) — one implementation swap,
 * no call site changes.
 *
 * PRIVACY NOTE: This service must never log PII (student names, email addresses,
 * worksheet content). It tracks behaviour, not identity. The userId field is
 * an opaque platform ID, never an email or name.
 *
 * @status STUB — accepts all events; performs no work
 */

import type { PlatformService, UpgradeTrigger } from '@teacher-toolbox/types';

// ---------------------------------------------------------------------------
// Event catalogue
// ---------------------------------------------------------------------------

/**
 * Every analytics event in the platform lives in this discriminated union.
 * Adding a new tracked action = adding one member here.
 */
export type AnalyticsEvent =
  // Platform lifecycle
  | { name: 'platform:booted';           props: { durationMs: number } }
  | { name: 'app:opened';                props: { appId: string } }
  // Worksheet
  | { name: 'worksheet:created';         props: { appId: string; templateId?: string } }
  | { name: 'worksheet:saved';           props: { appId: string; componentCount: number } }
  | { name: 'worksheet:exported';        props: { appId: string; format: 'pdf' | 'svg' | 'png' } }
  | { name: 'worksheet:printed';         props: { appId: string; studentCount: number } }
  // Templates
  | { name: 'template:selected';         props: { templateId: string; appId: string; source: string } }
  | { name: 'template:saved';            props: { appId: string } }
  // Feature gates & upgrades
  | { name: 'feature-gate:hit';          props: { entitlement: string; trigger: UpgradeTrigger } }
  | { name: 'upgrade:flow-opened';       props: { trigger: UpgradeTrigger } }
  | { name: 'upgrade:completed';         props: { trigger: UpgradeTrigger; tier: string } }
  | { name: 'upgrade:abandoned';         props: { trigger: UpgradeTrigger } }
  // Advertising
  | { name: 'ad:impression';             props: { adId: string; format: string; type: string } }
  | { name: 'ad:clicked';               props: { adId: string; action: string } }
  | { name: 'ad:dismissed';             props: { adId: string } }
  // Auth
  | { name: 'auth:sign-in';             props: { provider: string } }
  | { name: 'auth:sign-out';            props: Record<string, never> }
  | { name: 'auth:sign-in-failed';      props: { provider: string; reason: string } }
  // Cloud
  | { name: 'sync:completed';           props: { itemCount: number; durationMs: number } }
  | { name: 'sync:failed';              props: { reason: string } };

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IAnalyticsService extends PlatformService {
  /**
   * Track a structured analytics event.
   * Every event is typed — TypeScript enforces the props shape per event name.
   */
  track(event: AnalyticsEvent): void;

  /**
   * Associate the current session with an authenticated user.
   * Call after successful sign-in; call with null after sign-out.
   * The userId is an opaque platform ID — never an email address.
   */
  identify(userId: string | null): void;

  /**
   * Set a persistent property sent with every subsequent event.
   * Used for subscription tier, locale, app version, etc.
   */
  setSessionProperty(key: string, value: string | number | boolean): void;
}

// ---------------------------------------------------------------------------
// Stub implementation
// ---------------------------------------------------------------------------

export class StubAnalyticsService implements IAnalyticsService {
  readonly serviceId = 'analytics';

  async initialize(): Promise<void> {
    console.info('[Analytics] Initialised (stub — no events will be sent)');
  }

  async dispose(): Promise<void> { /* nothing to flush */ }

  track(_event: AnalyticsEvent): void {
    // Intentionally silent in stub — uncomment for local debugging:
    // console.debug('[Analytics] track:', _event.name, _event.props);
  }

  identify(_userId: string | null): void { /* stub */ }

  setSessionProperty(_key: string, _value: string | number | boolean): void { /* stub */ }
}

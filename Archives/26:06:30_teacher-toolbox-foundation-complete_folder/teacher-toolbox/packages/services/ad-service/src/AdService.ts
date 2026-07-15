/**
 * @module AdService
 * @description Advertising service with consent and legal guardrails.
 *
 * Distinguishes between two ad types with different legal requirements:
 *  - self-serve: Teacher Toolbox own promotions (upgrade prompts, feature announcements)
 *                Always safe, no consent required, no third-party data collection.
 *  - third-party: External ad networks (requires explicit consent, locale checking)
 *                 COPPA/GDPR compliance: never enabled by default in educational software.
 *
 * The getAd() method returns null when ads are not appropriate for the current
 * context — callers need only check for null, no eligibility logic in the UI.
 *
 * ARCHITECTURAL RULE: The WorksheetRenderer MUST NOT depend on this service.
 * Ads appear only in the shell UI. The watermark on printed worksheets is
 * handled by the platform.watermark component type + EntitlementService.
 *
 * @status STUB — getAd() always returns null; no ads shown in Phase 1
 */

import type { AdContext, AdUnit, PlatformService } from '@teacher-toolbox/types';
import type { IIdentityService } from '@teacher-toolbox/identity';

export interface IAdService extends PlatformService {
  /**
   * Get an ad appropriate for the given format and context.
   * Returns null when: user is entitled to ad-free experience,
   * third-party consent is absent, locale is excluded, or no ad is available.
   *
   * Always check for null before rendering — never assume an ad is available.
   */
  getAd(format: import('@teacher-toolbox/types').AdFormat, context: AdContext): AdUnit | null;

  /** True only when the user has given explicit, recorded consent to third-party ads */
  hasThirdPartyConsent(): boolean;

  /**
   * Present the consent dialog and record the decision.
   * Must be called before any third-party ad can be shown.
   * COPPA/GDPR: never call this automatically — only on explicit user action.
   */
  requestThirdPartyConsent(): Promise<boolean>;

  trackImpression(adId: string): void;
  trackClick(adId: string, action: string): void;
  trackDismissal(adId: string): void;
}

export class StubAdService implements IAdService {
  readonly serviceId = 'ad-service';

  constructor(private readonly identity: IIdentityService) {}

  async initialize(): Promise<void> {
    console.info('[AdService] Initialised (stub — no ads will be served)');
  }

  async dispose(): Promise<void> { /* nothing to clean up */ }

  getAd(_format: import('@teacher-toolbox/types').AdFormat, _context: AdContext): AdUnit | null {
    // Phase 1: always return null — no ads
    // Phase 2 logic will be:
    //   if (this.identity.can('ads:free')) return null;         // paid user
    //   if (adType === 'third-party' && !this.hasThirdPartyConsent()) return null;
    //   if (EXCLUDED_LOCALES.includes(context.locale)) return null;
    //   return this.selectAd(format, context);
    return null;
  }

  hasThirdPartyConsent(): boolean {
    // Third-party consent is never true by default — requires affirmative opt-in
    return false;
  }

  async requestThirdPartyConsent(): Promise<boolean> {
    console.warn('[AdService] requestThirdPartyConsent() — consent UI not implemented');
    // TODO: present GDPR/COPPA compliant consent dialog
    return false;
  }

  trackImpression(_adId: string): void { /* stub */ }
  trackClick(_adId: string, _action: string): void { /* stub */ }
  trackDismissal(_adId: string): void { /* stub */ }
}

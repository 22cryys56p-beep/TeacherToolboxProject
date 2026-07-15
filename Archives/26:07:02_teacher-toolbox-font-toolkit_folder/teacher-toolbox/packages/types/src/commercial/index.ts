/**
 * @package @teacher-toolbox/types/commercial
 * @description All types related to the commercial SaaS layer:
 * authentication, subscription tiers, entitlements, advertising, and cloud services.
 *
 * These types are defined here — not in individual service packages — so that
 * every service can reference them without creating circular dependencies.
 * No service package imports from another service package; all share this type layer.
 */

import type { ISODateTime, OrgId, UserId } from '../common/index.js';

// ============================================================================
// AUTHENTICATION
// ============================================================================

export type AuthStatus =
  | 'anonymous'         // no account; all data is local-only
  | 'authenticating'    // sign-in in progress
  | 'authenticated'     // valid session
  | 'token-expired'     // session exists but needs refresh
  | 'offline-verified'; // authenticated previously; operating offline with cached credentials

export type AuthProvider = 'google' | 'microsoft' | 'email-password' | 'sso-saml';

export interface AuthState {
  status:       AuthStatus;
  userId:       UserId | null;
  email:        string | null;
  displayName:  string | null;
  avatarUrl:    string | null;
  /** Which provider authenticated this session */
  provider:     AuthProvider | null;
  /**
   * Opaque session token. Never inspected by app code — passed to cloud
   * service calls only. Stored securely (never in localStorage).
   */
  sessionToken: string | null;
}

// ============================================================================
// SUBSCRIPTION
// ============================================================================

export type SubscriptionTier =
  | 'free'       // permanent free tier with feature limitations
  | 'educator'   // individual paid subscription
  | 'school'     // site license managed by a school administrator
  | 'district'   // multi-school license
  | 'trial';     // paid-tier features, time-limited

export type SubscriptionStatus =
  | 'active'     // current and paid
  | 'expired'    // period ended; downgraded to free
  | 'cancelled'  // user cancelled; access until period end
  | 'past-due'   // payment failed; grace period active
  | 'none';      // free tier — not an error state

export interface SubscriptionState {
  tier:               SubscriptionTier;
  status:             SubscriptionStatus;
  expiresAt:          ISODateTime | null;
  trialEndsAt:        ISODateTime | null;
  /** For school/district tiers */
  organisationId:     OrgId | null;
  organisationName:   string | null;
  /** For site licenses */
  seatsTotal:         number | null;
  seatsUsed:          number | null;
}

// ============================================================================
// ENTITLEMENTS
// ============================================================================

/**
 * Every feature that can be gated sits in this union.
 * App modules check entitlements via IIdentityService.can(entitlement).
 * Adding a new gatable feature = adding one string literal here.
 */
export type Entitlement =
  // Export
  | 'export:pdf'
  | 'export:png'
  | 'export:batch'
  // Content
  | 'templates:premium'
  | 'artwork:premium'
  | 'fonts:premium'
  // Roster
  | 'students:unlimited'
  | 'classrooms:multiple'
  // App modules (future apps may be paid add-ons)
  | 'app:icanmath'
  | 'app:icanread'
  | 'app:icantrace'
  | 'app:icancreate'
  | 'app:icanplay'
  // AI features
  | 'ai:word-list'
  | 'ai:sentence-generation'
  | 'ai:artwork'
  | 'ai:math-problems'
  | 'ai:reading-passages'
  // Cloud features
  | 'cloud:sync'
  | 'cloud:backup'
  | 'cloud:share'
  // Branding
  | 'branding:remove-watermark'
  | 'branding:custom-logo'
  // Advertising — having this entitlement means NO ads are shown
  | 'ads:free';

/** Entitlements that have a numeric cap on the free tier */
export type LimitedEntitlement = 'students:unlimited' | 'classrooms:multiple';

export interface EntitlementReason {
  granted: boolean;
  /** How the entitlement was granted (only present when granted = true) */
  source?: 'subscription' | 'trial' | 'promotion' | 'admin-override';
  /** Which tier would grant this (only present when granted = false) */
  upgradeTarget?: SubscriptionTier;
  /** Used to track which feature gate triggered an upgrade flow */
  upgradeTrigger?: UpgradeTrigger;
}

/**
 * Tracks why an upgrade flow was opened.
 * Passed to IAnalyticsService so conversion rates can be attributed
 * to specific feature gates.
 */
export type UpgradeTrigger =
  | 'feature-gate:export-pdf'
  | 'feature-gate:export-batch'
  | 'feature-gate:students-unlimited'
  | 'feature-gate:templates-premium'
  | 'feature-gate:artwork-premium'
  | 'feature-gate:ai'
  | 'feature-gate:cloud-sync'
  | 'feature-gate:remove-watermark'
  | 'ad-click'
  | 'settings-upgrade-button'
  | 'trial-expired-prompt';

// ============================================================================
// ADVERTISING
// ============================================================================

export type AdFormat =
  | 'banner-bottom'    // non-intrusive strip below the workspace
  | 'sidebar-card'     // card in the properties/tools panel
  | 'export-pre-roll'; // dismissible overlay before a PDF downloads

export type AdType =
  | 'self-serve'     // Teacher Toolbox own promotions — always legally safe
  | 'third-party';   // external ad network — requires explicit consent + locale check

export interface SelfServeAdContent {
  headline:   string;
  body:       string;
  ctaLabel:   string;
  /** Either an UpgradeTrigger (opens upgrade flow) or an absolute URL */
  ctaAction:  UpgradeTrigger | string;
  imageUrl?:  string;
}

export interface ThirdPartyAdSlot {
  networkId:  string;
  slotId:     string;
  /** Deferred — never loaded until hasConsent() is true */
}

export interface AdUnit {
  id:        string;
  type:      AdType;
  format:    AdFormat;
  content:   SelfServeAdContent | ThirdPartyAdSlot;
  targeting: AdTargeting;
}

export interface AdTargeting {
  /** Which subscription tiers see this ad */
  showToTiers:     SubscriptionTier[];
  /** Which app IDs this ad is relevant in; 'all' = shown everywhere */
  showInApps:      string[] | 'all';
  /**
   * Locales where this ad must NOT appear.
   * Used for legal compliance (COPPA, GDPR Article 8, POPIA, etc.)
   * Default: show everywhere. Always list exclusions explicitly.
   */
  excludeLocales:  string[];
}

export interface AdContext {
  appId:        string;
  locale:       string;
  currentTier:  SubscriptionTier;
}

// ============================================================================
// CLOUD SERVICES
// ============================================================================

export type CloudServiceId =
  | 'sync'
  | 'backup'
  | 'share'
  | 'ai'
  | 'assets'
  | 'collaboration';

export type CloudServiceStatus =
  | 'available'
  | 'unavailable'
  | 'not-entitled'
  | 'not-enabled'
  | 'syncing'
  | 'conflict';

export interface CloudServiceState {
  services:     Partial<Record<CloudServiceId, CloudServiceStatus>>;
  lastSyncAt:   ISODateTime | null;
  pendingCount: number;
}

// ============================================================================
// IDENTITY CONTEXT — the single object that answers all commercial questions
// ============================================================================

export interface AdEligibility {
  /** Always true for free-tier users regardless of consent */
  selfServeAds:   boolean;
  /**
   * True only when: user is on free tier AND has given explicit consent
   * AND is not in a legally restricted locale (COPPA/GDPR protected).
   * Never true by default — requires affirmative opt-in.
   */
  thirdPartyAds:  boolean;
  /** True for free-tier users who have not earned the branding:remove-watermark entitlement */
  showWatermark:  boolean;
}

/**
 * IdentityContext is the single source of truth for all commercial decisions.
 * It is composed from AuthState + SubscriptionState by the IIdentityService
 * and re-emitted whenever any component changes.
 *
 * Every service that needs to behave differently based on who the user is
 * reads from this one object — never from auth, subscription, or entitlements separately.
 */
export interface IdentityContext {
  auth:           AuthState;
  subscription:   SubscriptionState;
  adEligibility:  AdEligibility;
  cloud:          CloudServiceState;
}

/**
 * @module config
 * @description Platform configuration — all deployment-sensitive values live here.
 *
 * Values are read from Vite's import.meta.env at build time, falling back to
 * safe defaults for local development. Production deployments override via .env files.
 *
 * NEVER scatter magic numbers or deployment-specific values across services.
 * If a value might differ between local, staging, and production — it lives here.
 */

export interface PlatformConfig {
  // Identity
  appName:              string;
  appVersion:           string;

  // Localisation
  defaultLocale:        string;

  // Theme
  defaultThemeId:       string;

  // Output quality
  pdfDpi:               number;

  // Roster limits (free tier caps — enforced by EntitlementService)
  freeStudentLimit:     number;
  freeClassroomLimit:   number;

  // Feature availability
  aiEnabled:            boolean;   // master switch — also gated by feature flags + entitlements
  cloudSyncEnabled:     boolean;   // master switch — also gated by entitlements
  analyticsEnabled:     boolean;   // false in dev; true in production
  adsEnabled:           boolean;   // false until ad review is complete

  // External service URLs (empty string = not configured)
  billingPortalUrl:     string;
  supportUrl:           string;
  privacyPolicyUrl:     string;
  termsOfServiceUrl:    string;
}

/**
 * Resolved platform configuration for the current environment.
 * Import this object wherever a configuration value is needed.
 */
export const config: PlatformConfig = {
  appName:            'Teacher Toolbox',
  appVersion:         '0.1.0',

  defaultLocale:      'en-US',
  defaultThemeId:     'default',

  pdfDpi:             300,

  freeStudentLimit:   30,
  freeClassroomLimit: 1,

  aiEnabled:          false,
  cloudSyncEnabled:   false,
  analyticsEnabled:   false,  // TODO: set true in production via VITE_ANALYTICS_ENABLED=true
  adsEnabled:         false,

  billingPortalUrl:   '',
  supportUrl:         '',
  privacyPolicyUrl:   '',
  termsOfServiceUrl:  '',
};

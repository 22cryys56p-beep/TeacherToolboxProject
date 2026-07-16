/**
 * @module ErrorReporter
 * @description Centralised error and warning reporting service.
 *
 * All platform services and app modules report errors through this interface
 * rather than calling console.error() directly. This provides:
 *  - A single swap point to route errors to Sentry, Datadog, or any future
 *    telemetry service without touching any call site
 *  - Structured error context (which app, which document, which service failed)
 *  - A clear distinction between user-recoverable warnings and developer bugs
 *
 * Phase 1 implementation: wraps console.error/warn with structured context logging.
 * Future implementation: sends to a remote error tracking service.
 *
 * @status PLACEHOLDER — logs to console; remote reporting wired in when cloud services are added
 */

import type { PlatformService } from '@teacher-toolbox/types';

// ---------------------------------------------------------------------------
// Context and interface
// ---------------------------------------------------------------------------

/**
 * Structured context attached to every reported error.
 * Enables filtering and attribution in a future error tracking service.
 */
export interface ErrorContext {
  /** Which app module was active when the error occurred */
  appId?:       string;
  /** The document being worked on, if applicable */
  documentId?:  string;
  /** Which platform service threw */
  serviceId?:   string;
  /** The authenticated user, if known — for cloud error tracking */
  userId?:      string;
  /** Arbitrary additional data relevant to this specific error */
  extra?:       Record<string, unknown>;
}

export interface IErrorReporter extends PlatformService {
  /**
   * Report an unexpected error. Use for conditions that should never occur
   * in correct operation — rendering failures, corrupt data, service crashes.
   */
  report(error: Error | string, context?: ErrorContext): void;

  /**
   * Report a recoverable warning. Use for degraded-but-functional conditions —
   * a missing optional font, an unknown component type, a failed analytics ping.
   */
  warn(message: string, context?: ErrorContext): void;

  /**
   * Report a caught error that was handled gracefully.
   * Lower severity than report() — useful for tracking frequency of
   * expected-but-notable conditions.
   */
  capture(error: Error | string, context?: ErrorContext): void;
}

// ---------------------------------------------------------------------------
// Phase 1 implementation
// ---------------------------------------------------------------------------

export class ConsoleErrorReporter implements IErrorReporter {
  readonly serviceId = 'error-reporter';

  async initialize(): Promise<void> {
    console.info('[ErrorReporter] Initialised (console implementation)');
  }

  async dispose(): Promise<void> { /* nothing to clean up */ }

  report(error: Error | string, context?: ErrorContext): void {
    const msg = error instanceof Error ? error.message : error;
    console.error('[ErrorReporter] ERROR:', msg, context ?? '');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    // TODO: forward to remote error tracking (Sentry, Datadog) when cloud services are enabled
  }

  warn(message: string, context?: ErrorContext): void {
    console.warn('[ErrorReporter] WARN:', message, context ?? '');
    // TODO: forward to remote warning tracking
  }

  capture(error: Error | string, context?: ErrorContext): void {
    const msg = error instanceof Error ? error.message : error;
    console.info('[ErrorReporter] CAPTURED:', msg, context ?? '');
    // TODO: forward to remote event tracking
  }
}

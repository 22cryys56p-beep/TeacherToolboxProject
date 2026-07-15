/**
 * @module AIService
 * @description Provider-agnostic AI abstraction layer.
 *
 * Phase 1: Fully stubbed — isAvailable() returns false, all generation
 * methods return null. The interface is complete and typed so app modules
 * can write AI-aware code today that activates when AI is enabled later.
 *
 * App modules MUST check isAvailable() before calling any generation method
 * and provide graceful manual fallbacks for the false case.
 *
 * @status STUB — no AI provider connected
 */
import type { PlatformService, AITextRequest, AITextResponse, AIProvider, AIProviderConfig } from '@teacher-toolbox/types';

export class AIService implements PlatformService {
  readonly serviceId = 'ai-service';

  private provider: AIProvider | null = null;

  async initialize(): Promise<void> {
    console.info('[AIService] Initialised — no provider connected (Phase 1 stub)');
  }

  async dispose(): Promise<void> { this.provider = null; }

  /** Returns false in Phase 1. Check this before every AI call. */
  isAvailable(): boolean { return false; }

  getActiveProvider(): AIProvider | null { return this.provider; }

  async setProvider(_providerId: string, _config: AIProviderConfig): Promise<void> {
    console.warn('[AIService] setProvider() — AI integration deferred to a future phase');
  }

  async generateText(_request: AITextRequest): Promise<AITextResponse | null> {
    console.info('[AIService] generateText() called but AI is not available');
    return null;
  }

  async generateStructured<T>(_request: unknown): Promise<T | null> {
    console.info('[AIService] generateStructured() called but AI is not available');
    return null;
  }

  async generateArtwork(_request: unknown): Promise<null> {
    console.info('[AIService] generateArtwork() called but AI is not available');
    return null;
  }
}

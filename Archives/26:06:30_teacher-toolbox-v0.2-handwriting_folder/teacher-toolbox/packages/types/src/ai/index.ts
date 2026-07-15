/**
 * @package @teacher-toolbox/types/ai
 * @description AI service types. The AI service is fully stubbed in Phase 1
 * — these types define the complete interface that future implementation
 * must satisfy. App modules call the service through this interface; they
 * never know whether AI is powered by Anthropic, OpenAI, or another provider.
 */

import type { AppId } from '../common/index.js';

// ---------------------------------------------------------------------------
// Capabilities — typed, discoverable, extensible
// ---------------------------------------------------------------------------

/**
 * Every AI request must declare its capability. This:
 * - Lets the UI show which features are AI-powered
 * - Allows the service to route to the right prompt template
 * - Provides a clear audit trail for AI-generated content
 */
export type AICapability =
  // iCanSpell
  | 'spelling:generate-word-list'
  | 'spelling:generate-sentences'
  | 'spelling:generate-story'
  // iCanMath (future)
  | 'math:generate-problems'
  // iCanRead (future)
  | 'read:generate-passage'
  // Platform-level
  | 'template:suggest'
  | 'artwork:generate-image';

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export interface AITextRequest {
  capability: AICapability;
  prompt: string;
  systemContext?: string;
  maxTokens?: number;
  temperature?: number;
  /** Identifying which app made the request — for logging and rate limiting */
  appId: AppId;
}

export interface AITextResponse {
  text: string;
  capability: AICapability;
  modelId: string;
  /** Tokens used — for future cost tracking */
  tokensUsed?: number;
}

export interface AIStructuredRequest<T> {
  capability: AICapability;
  prompt: string;
  systemContext?: string;
  /** JSON schema that the response must conform to */
  responseSchema: Record<string, unknown>;
  appId: AppId;
}

export interface AIProviderConfig {
  providerId: string;
  apiKey?: string;        // stored securely, not in plain storage
  model?: string;
  baseUrl?: string;       // for self-hosted providers
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  capabilities: AICapability[];
  requiresApiKey: boolean;
}

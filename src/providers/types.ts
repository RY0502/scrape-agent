/**
 * Immutable payload handed to every VLM provider. The same instance is passed to
 * each provider the orchestrator tries, so the extraction context is preserved
 * across any provider switch.
 */
export interface VlmInput {
  system: string;
  prompt: string;
  imageBase64: string;
}

export type VlmOutput = string;

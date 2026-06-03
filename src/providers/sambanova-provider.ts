import { OpenAICompatibleProvider } from "./openai-compatible.js";

export class SambaNovaProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string, maxTokens: number, baseUrl?: string) {
    super(
      "SambaNova",
      apiKey,
      model,
      maxTokens,
      baseUrl || "https://api.sambanova.ai/v1/chat/completions"
    );
  }
}

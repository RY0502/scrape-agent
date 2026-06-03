import { OpenAICompatibleProvider } from "./openai-compatible.js";

export class NvidiaProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string, maxTokens: number, baseUrl?: string) {
    super(
      "NVIDIA",
      apiKey,
      model,
      maxTokens,
      baseUrl || "https://integrate.api.nvidia.com/v1/chat/completions"
    );
  }
}

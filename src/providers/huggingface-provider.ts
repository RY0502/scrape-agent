import { OpenAICompatibleProvider } from "./openai-compatible.js";

export class HuggingFaceProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string, maxTokens: number) {
    super(
      "HuggingFace",
      apiKey,
      model,
      maxTokens,
      `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`
    );
  }
}

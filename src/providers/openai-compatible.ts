import type { Provider } from "@freetier/orchestrator";
import type { VlmInput } from "./types.js";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string } | string;
}

/**
 * Generic provider for any OpenAI-compatible `/chat/completions` vision endpoint.
 * HuggingFace, NVIDIA NIM and SambaNova all speak this format, so they only need
 * to supply a name and base URL.
 */
export class OpenAICompatibleProvider implements Provider<VlmInput, string> {
  constructor(
    readonly name: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly maxTokens: number,
    private readonly apiUrl: string
  ) {}

  async invoke(input: VlmInput): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        max_tokens: this.maxTokens,
        stream: false,
        messages: [
          { role: "system", content: input.system },
          {
            role: "user",
            content: [
              { type: "text", text: input.prompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${this.name} API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;

    if (data.error) {
      const message = typeof data.error === "string" ? data.error : data.error.message ?? "Unknown error";
      throw new Error(`${this.name} API error: ${message}`);
    }

    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

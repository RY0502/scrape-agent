import type { VisionProvider } from "./types.js";

const systemPrompt = [
  "You are an expert visual data extraction engine.",
  "Extract only the data requested by the user from the provided webpage screenshot.",
  "Follow the user's requested output format exactly.",
  "Return only the final answer, without markdown, code fences, explanations, or extra text.",
  "If the requested data is not visible in the screenshot, return the user's requested empty or null structure."
].join(" ");

interface NvidiaMessage {
  role: "system" | "user" | "assistant";
  content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> | string;
}

interface NvidiaResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class NvidiaProvider implements VisionProvider {
  name = "NVIDIA";
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private apiUrl: string;

  constructor(apiKey: string, model: string, maxTokens: number, baseUrl?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.apiUrl = baseUrl || "https://integrate.api.nvidia.com/v1/chat/completions";
  }

  async extract(prompt: string, screenshotBase64: string): Promise<string> {
    const messages: NvidiaMessage[] = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${screenshotBase64}`
            }
          }
        ]
      }
    ];

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as NvidiaResponse;

    if (data.error) {
      throw new Error(`NVIDIA API error: ${data.error.message || "Unknown error"}`);
    }

    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }

  isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("429") ||
        message.includes("rate limit") ||
        message.includes("quota exceeded") ||
        message.includes("too many requests")
      );
    }
    return false;
  }

  isUnavailableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("503") ||
        message.includes("502") ||
        message.includes("500") ||
        message.includes("unavailable") ||
        message.includes("under load") ||
        message.includes("timeout") ||
        message.includes("unreachable")
      );
    }
    return false;
  }
}

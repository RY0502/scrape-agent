import Groq from "groq-sdk";
import type { VisionProvider } from "./types.js";

const systemPrompt = [
  "You are an expert visual data extraction engine.",
  "Extract only the data requested by the user from the provided webpage screenshot.",
  "Follow the user's requested output format exactly.",
  "Return only the final answer, without markdown, code fences, explanations, or extra text.",
  "If the requested data is not visible in the screenshot, return the user's requested empty or null structure."
].join(" ");

export class GroqProvider implements VisionProvider {
  name = "Groq";
  private client: Groq;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model: string, maxTokens: number) {
    this.client = new Groq({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async extract(prompt: string, screenshotBase64: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: this.maxTokens,
        messages: [
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
        ]
      });

      return completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (error) {
      if (error instanceof Groq.APIError) {
        throw new Error(`Groq API error (${error.status}): ${error.message}`);
      }
      throw error;
    }
  }

  isRateLimitError(error: unknown): boolean {
    if (error instanceof Groq.APIError) {
      return error.status === 429 || error.message.toLowerCase().includes("rate limit");
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes("rate limit") || message.includes("quota exceeded") || message.includes("too many requests");
    }

    return false;
  }

  isUnavailableError(error: unknown): boolean {
    if (error instanceof Groq.APIError) {
      return error.status === 503 || error.status === 502 || error.status === 500;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes("unavailable") || message.includes("under load") || message.includes("timeout") || message.includes("unreachable");
    }

    return false;
  }
}

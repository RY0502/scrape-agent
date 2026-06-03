import Groq from "groq-sdk";
import type { Provider } from "@freetier/orchestrator";
import type { VlmInput } from "./types.js";

export class GroqProvider implements Provider<VlmInput, string> {
  readonly name = "Groq";
  private client: Groq;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model: string, maxTokens: number) {
    this.client = new Groq({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async invoke(input: VlmInput): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: "system",
            content: input.system
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: input.prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${input.imageBase64}`
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
}

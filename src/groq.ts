import Groq from "groq-sdk";
import { config } from "./config.js";

const groq = new Groq({
  apiKey: config.GROQ_API_KEY
});

const systemPrompt = [
  "You are an expert visual data extraction engine.",
  "Extract only the data requested by the user from the provided webpage screenshot.",
  "Follow the user's requested output format exactly.",
  "Return only the final answer, without markdown, code fences, explanations, or extra text.",
  "If the requested data is not visible in the screenshot, return the user's requested empty or null structure."
].join(" ");

export async function extractFromScreenshot(prompt: string, screenshotBase64: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: config.GROQ_VISION_MODEL,
    temperature: 0,
    max_tokens: config.MAX_OUTPUT_TOKENS,
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
}

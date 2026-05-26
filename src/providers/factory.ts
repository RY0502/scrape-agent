import { config } from "../config.js";
import { GroqProvider } from "./groq-provider.js";
import { HuggingFaceProvider } from "./huggingface-provider.js";
import { NvidiaProvider } from "./nvidia-provider.js";
import { SambaNovaProvider } from "./sambanova-provider.js";
import type { VisionProvider } from "./types.js";

export function createProviders(): VisionProvider[] {
  const providers: VisionProvider[] = [];

  if (config.GROQ_API_KEY) {
    providers.push(
      new GroqProvider(
        config.GROQ_API_KEY,
        config.GROQ_VISION_MODEL,
        config.MAX_OUTPUT_TOKENS
      )
    );
    console.log(`[Factory] Registered Groq provider with model: ${config.GROQ_VISION_MODEL}`);
  }

  if (config.HUGGINGFACE_API_KEY) {
    providers.push(
      new HuggingFaceProvider(
        config.HUGGINGFACE_API_KEY,
        config.HUGGINGFACE_VISION_MODEL,
        config.MAX_OUTPUT_TOKENS
      )
    );
    console.log(`[Factory] Registered HuggingFace provider with model: ${config.HUGGINGFACE_VISION_MODEL}`);
  }

  if (config.NVIDIA_API_KEY) {
    providers.push(
      new NvidiaProvider(
        config.NVIDIA_API_KEY,
        config.NVIDIA_VISION_MODEL,
        config.MAX_OUTPUT_TOKENS,
        config.NVIDIA_API_URL
      )
    );
    console.log(`[Factory] Registered NVIDIA provider with model: ${config.NVIDIA_VISION_MODEL}`);
  }

  if (config.SAMBANOVA_API_KEY) {
    providers.push(
      new SambaNovaProvider(
        config.SAMBANOVA_API_KEY,
        config.SAMBANOVA_VISION_MODEL,
        config.MAX_OUTPUT_TOKENS,
        config.SAMBANOVA_API_URL
      )
    );
    console.log(`[Factory] Registered SambaNova provider with model: ${config.SAMBANOVA_VISION_MODEL}`);
  }

  if (providers.length === 0) {
    throw new Error(
      "No vision providers configured. Set at least one of: GROQ_API_KEY, HUGGINGFACE_API_KEY, NVIDIA_API_KEY, SAMBANOVA_API_KEY"
    );
  }

  return providers;
}

import { z } from "zod";

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_VISION_MODEL: z.string().min(1).default("meta-llama/llama-4-scout-17b-16e-instruct"),
  HUGGINGFACE_API_KEY: z.string().min(1).optional(),
  HUGGINGFACE_VISION_MODEL: z.string().min(1).default("meta-llama/Llama-3.2-11B-Vision-Instruct"),
  NVIDIA_API_KEY: z.string().min(1).optional(),
  NVIDIA_VISION_MODEL: z.string().min(1).default("mistralai/mistral-large-3-675b-instruct-2512"),
  NVIDIA_API_URL: z.string().url().optional(),
  SAMBANOVA_API_KEY: z.string().min(1).optional(),
  SAMBANOVA_VISION_MODEL: z.string().min(1).default("Llama-4-Maverick-17B-128E-Instruct"),
  SAMBANOVA_API_URL: z.string().url().optional(),
  CHROME_EXECUTABLE_PATH: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().int().positive().default(1),
  PAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
  PAGE_SETTLE_MS: z.coerce.number().int().nonnegative().default(2_000),
  SCREENSHOT_WIDTH: z.coerce.number().int().positive().default(1280),
  SCREENSHOT_HEIGHT: z.coerce.number().int().positive().default(900),
  SCREENSHOT_QUALITY: z.coerce.number().int().min(1).max(100).default(70),
  MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(2_048)
});

export const config = envSchema.parse(process.env);

import { z } from "zod";

const envSchema = z.object({
  CHROME_EXECUTABLE_PATH: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().int().positive().default(1),
  PAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
  PAGE_SETTLE_MS: z.coerce.number().int().nonnegative().default(4_000),
  SCREENSHOT_WIDTH: z.coerce.number().int().positive().default(1280),
  SCREENSHOT_HEIGHT: z.coerce.number().int().positive().default(900),
  SCREENSHOT_QUALITY: z.coerce.number().int().min(1).max(100).default(70)
});

export const config = envSchema.parse(process.env);

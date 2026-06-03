import "dotenv/config";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { existsSync } from "fs";
import { install, resolveBuildId, Browser, detectBrowserPlatform } from "@puppeteer/browsers";
import { join } from "path";
import { homedir } from "os";
import { runExtractionAgent, getOrchestratorStatus } from "./agent.js";
import { config } from "./config.js";

const requestSchema = z.object({
  url: z.string().url(),
  prompt: z.string().min(1)
});

let activeRequests = 0;

const app = express();

app.use(express.json({ limit: "256kb" }));

app.get("/health", (_request: Request, response: Response) => {
  response.status(200).json({ status: "ok" });
});

app.get("/status", (_request: Request, response: Response) => {
  response.status(200).json(getOrchestratorStatus());
});

app.post("/extract", async (request: Request, response: Response) => {
  if (activeRequests >= config.MAX_CONCURRENT_REQUESTS) {
    response.status(429).json({ error: "Server is busy. Retry after the current extraction finishes." });
    return;
  }

  const parsedRequest = requestSchema.safeParse(request.body);

  if (!parsedRequest.success) {
    response.status(400).json({ error: "Invalid request body.", details: parsedRequest.error.flatten() });
    return;
  }

  activeRequests += 1;

  try {
    const data = await runExtractionAgent(parsedRequest.data);
    response.status(200).type("application/json").send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown extraction error.";
    response.status(500).json({ error: message });
  } finally {
    activeRequests -= 1;
  }
});

let chromeReady: Promise<void> = Promise.resolve();

async function installChrome(): Promise<void> {
  if (config.CHROME_EXECUTABLE_PATH && existsSync(config.CHROME_EXECUTABLE_PATH)) {
    console.log(`[chrome] Using configured path: ${config.CHROME_EXECUTABLE_PATH}`);
    return;
  }
  const cacheDir = join(homedir(), ".cache", "puppeteer");
  const chromeCacheDir = join(cacheDir, "chrome");
  if (existsSync(chromeCacheDir)) {
    console.log("[chrome] Chrome cache already exists, skipping download.");
    return;
  }
  const platform = detectBrowserPlatform();
  console.log(`[chrome] Downloading Chrome (stable) for ${platform}...`);
  const buildId = await resolveBuildId(Browser.CHROME, platform!, "stable");
  console.log(`[chrome] Resolved buildId: ${buildId}`);
  const result = await install({ browser: Browser.CHROME, buildId, cacheDir });
  console.log(`[chrome] Chrome ready at: ${result.executablePath}`);
}

app.use(async (_req, _res, next) => {
  try {
    await chromeReady;
    next();
  } catch (err) {
    next(err);
  }
});

app.listen(config.PORT, () => {
  console.log(`Scrape agent listening on port ${config.PORT}`);
  chromeReady = installChrome().catch((err) => {
    console.error("[chrome] Fatal: Chrome install failed:", err);
    throw err;
  });
});

import "dotenv/config";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { runExtractionAgent, getOrchestratorStatus } from "./agent.js";
import { config } from "./config.js";

const requestSchema = z.object({
  url: z.string().url(),
  prompt: z.string().min(1),
  fullPage: z.boolean().optional().default(false)
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

app.listen(config.PORT, () => {
  console.log(`Scrape agent listening on port ${config.PORT}`);
});

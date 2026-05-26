# Scrape Agent

A stateless TypeScript LangGraph agent that accepts a URL and extraction prompt, opens the page in headless Chromium, captures a JPEG screenshot, sends it to a vision language model via an intelligent provider orchestrator, and returns the extracted data to the caller.

## Provider Orchestration

The service includes an intelligent multi-provider orchestration layer with automatic failover:

- **Supported providers:** Groq, HuggingFace, NVIDIA NIM, SambaNova
- **Priority order:** Groq (primary) → HuggingFace → NVIDIA → SambaNova
- **Automatic failover:** On rate limits or unavailability, switches to next provider
- **Sticky default:** Successful provider becomes default for subsequent requests
- **Cooldown period:** Failed providers are skipped for 2 minutes
- **No permanent disabling:** All providers remain available after cooldown
- **Logging:** All provider selection decisions are logged

## Deployment choice

Use Render's native Node.js runtime instead of Docker for the 512 MB target.

- **Selected deployment:** Node.js runtime
- **Browser stack:** `puppeteer-core` with system `chromium` from `Aptfile`
- **Why not Docker:** Docker images usually carry more filesystem and runtime overhead, and bundling Chromium in the image increases size. Render native Node plus `Aptfile` installs only the required OS browser package.
- **Why `puppeteer-core`:** It does not download its own Chromium, keeping install size lower than full `puppeteer`.

## Memory optimizations

- **Single concurrent extraction:** `MAX_CONCURRENT_REQUESTS=1` prevents multiple Chromium instances from running at once.
- **No checkpointing:** The LangGraph is compiled without a checkpointer, so each request starts fresh.
- **Short state lifetime:** The screenshot is removed from graph state immediately after the VLM call returns.
- **Viewport screenshot only:** The service captures the visible viewport instead of a full-page screenshot to reduce image size and VLM payload memory.
- **JPEG compression:** Screenshot quality defaults to `70`.
- **Blocked heavy resources:** Fonts, media, and manifests are aborted.
- **Browser cleanup:** The page and browser are closed in all success and error paths.

## API

### `GET /health`

Returns service health.

```bash
curl https://YOUR_RENDER_SERVICE.onrender.com/health
```

### `GET /status`

Returns provider orchestrator status including current active provider and failure counts.

```bash
curl https://YOUR_RENDER_SERVICE.onrender.com/status
```

Response:

```json
{
  "currentProvider": "Groq",
  "providers": [
    {"provider": "Groq", "failureCount": 0, "inCooldown": false},
    {"provider": "HuggingFace", "failureCount": 2, "inCooldown": true},
    {"provider": "NVIDIA", "failureCount": 0, "inCooldown": false}
  ]
}
```

### `POST /extract`

Request body:

```json
{
  "url": "https://example.com",
  "prompt": "Extract data from the screenshot and return only JSON."
}
```

Response:

The response body is the exact text returned by the active VLM provider. If your prompt asks for minified JSON, the service returns that JSON directly with `application/json` content type.

## Example requests

### Use case 1: Top losers

```bash
curl -X POST https://YOUR_RENDER_SERVICE.onrender.com/extract \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.hdfcsec.com/market/equity/top-loser-nse?indicesCode=76394","prompt":"Find the top 10 losers for today by visiting this page. For each stock provide- '\''name'\'', '\''price'\'', '\''change'\'', and '\''changePercent'\'' and sort them descending based on change. Return ONLY a single, valid, minified JSON object with a '\''topLosers'\'' key. Do not include any text, explanations, or markdown formatting"}'
```

Expected response shape:

```json
{"topLosers":[{"name":"...","price":"...","change":"...","changePercent":"..."}]}
```

### Use case 2: Delhi AQI

```bash
curl -X POST https://YOUR_RENDER_SERVICE.onrender.com/extract \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.aqi.in/in/dashboard/india/delhi","prompt":"Visit the link and extract the CURRENT AQI value for Delhi. EXTRACTION RULE: Locate the text string '\''Live AQI'\''. Locate the text string '\''AQI (US)'\''. Extract only the digits appearing between both text strings. Example Template: '\''Live AQI XXX AQI (US)'\'' -> You extract XXX. CONSTRAINTS: Do not use any numbers found in the instructions or examples. Scan the provided input text only. If no such value is found, return {\"aqi\": null}. OUTPUT FORMAT: Return ONLY a minified JSON object: {\"aqi\": number}. No extra text or explanation."}'
```

Expected response shape:

```json
{"aqi":123}
```

## Environment variables

### Provider Configuration

At least one provider API key is required. Configure multiple providers for automatic failover.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | Optional* | none | Groq API key. Primary provider. |
| `GROQ_VISION_MODEL` | No | `meta-llama/llama-4-scout-17b-16e-instruct` | Groq vision model. |
| `HUGGINGFACE_API_KEY` | Optional* | none | HuggingFace API key. Secondary provider. |
| `HUGGINGFACE_VISION_MODEL` | No | `meta-llama/Llama-3.2-11B-Vision-Instruct` | HuggingFace vision model. |
| `NVIDIA_API_KEY` | Optional* | none | NVIDIA NIM API key. Tertiary provider. |
| `NVIDIA_VISION_MODEL` | No | `mistralai/mistral-large-3-675b-instruct-2512` | NVIDIA vision model. |
| `NVIDIA_API_URL` | No | `https://integrate.api.nvidia.com/v1/chat/completions` | NVIDIA API endpoint. |
| `SAMBANOVA_API_KEY` | Optional* | none | SambaNova API key. Quaternary provider. |
| `SAMBANOVA_VISION_MODEL` | No | `Llama-4-Maverick-17B-128E-Instruct` | SambaNova vision model. |
| `SAMBANOVA_API_URL` | No | `https://api.sambanova.ai/v1/chat/completions` | SambaNova API endpoint. |

*At least one provider API key must be set.

### Service Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `CHROME_EXECUTABLE_PATH` | No on Render | `/usr/bin/chromium` in `render.yaml` | Chromium executable path. |
| `PORT` | No | `3000` | HTTP port. Render sets this automatically. |
| `MAX_CONCURRENT_REQUESTS` | No | `1` | Keep at `1` for 512 MB memory. |
| `PAGE_TIMEOUT_MS` | No | `25000` | Page navigation timeout. |
| `PAGE_SETTLE_MS` | No | `2000` | Wait after DOM load before screenshot. |
| `SCREENSHOT_WIDTH` | No | `1280` | Browser viewport width. |
| `SCREENSHOT_HEIGHT` | No | `900` | Browser viewport height. |
| `SCREENSHOT_QUALITY` | No | `70` | JPEG quality from 1 to 100. |
| `MAX_OUTPUT_TOKENS` | No | `2048` | VLM response token limit. |

## Local development

Install dependencies:

```bash
npm install
```

Set environment variables (copy `.env.example` to `.env` and update):

```bash
cp .env.example .env
# Edit .env with your API keys
```

Or export manually:

```bash
export GROQ_API_KEY=your_groq_key
export HUGGINGFACE_API_KEY=your_hf_key  # optional
export NVIDIA_API_KEY=your_nvidia_key  # optional
export SAMBANOVA_API_KEY=your_sambanova_key  # optional
export CHROME_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Render.com Deployment

**📖 See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for complete step-by-step deployment guide.**

### Quick Start

1. Push code to GitHub
2. Create Render web service (use Blueprint or manual)
3. Add at least one provider API key as environment variable
4. Deploy and test

### Provider Priority

The orchestrator tries providers in this order:
1. **Groq** (if `GROQ_API_KEY` is set) - Primary
2. **HuggingFace** (if `HUGGINGFACE_API_KEY` is set) - Secondary
3. **NVIDIA** (if `NVIDIA_API_KEY` is set) - Tertiary
4. **SambaNova** (if `SAMBANOVA_API_KEY` is set) - Quaternary

**Recommendation:** Configure all four providers for maximum resilience on free tiers.

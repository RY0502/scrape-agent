import puppeteer, { type Browser } from "puppeteer";
import { config } from "./config.js";
import { platform } from "os";
import { existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");

function scanCacheDir(cacheDir: string, isDarwin: boolean): string | null {
  const chromeDir = join(cacheDir, "chrome");
  if (!existsSync(chromeDir)) return null;
  try {
    const versions = readdirSync(chromeDir);
    for (const version of versions) {
      const exeName = isDarwin
        ? "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
        : "chrome-linux64/chrome";
      const candidate = join(chromeDir, version, exeName);
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    // ignore unreadable dirs
  }
  return null;
}

function getExecutablePath(): string {
  if (config.CHROME_EXECUTABLE_PATH) {
    return config.CHROME_EXECUTABLE_PATH;
  }

  const isDarwin = platform() === "darwin";

  // 1. Project-local cache (where .puppeteerrc.cjs downloads to)
  const projectCache = join(PROJECT_ROOT, ".cache", "puppeteer");
  const found = scanCacheDir(projectCache, isDarwin);
  if (found) return found;

  // 2. Home-based cache (fallback for local dev)
  const homeCache = join(process.env.HOME ?? "", ".cache", "puppeteer");
  if (homeCache !== projectCache) {
    const homeFound = scanCacheDir(homeCache, isDarwin);
    if (homeFound) return homeFound;
  }

  // 3. System-installed fallbacks
  const systemPaths = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const p of systemPaths) {
    if (existsSync(p)) return p;
  }

  throw new Error(
    `Chrome not found. Searched: ${projectCache}, ${homeCache}, system paths.`
  );
}

export async function capturePageScreenshot(url: string): Promise<string> {
  let browser: Browser | undefined;

  try {
    const executablePath = getExecutablePath();
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      ...(executablePath && { executablePath }),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--js-flags=--max-old-space-size=128"
      ]
    };

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({
      width: config.SCREENSHOT_WIDTH,
      height: config.SCREENSHOT_HEIGHT,
      deviceScaleFactor: 1
    });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const resourceType = request.resourceType();

      if (["font", "media", "manifest"].includes(resourceType)) {
        void request.abort();
        return;
      }

      void request.continue();
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: config.PAGE_TIMEOUT_MS
    });

    await new Promise((resolve) => setTimeout(resolve, config.PAGE_SETTLE_MS));

    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: config.SCREENSHOT_QUALITY,
      fullPage: false,
      encoding: "base64"
    });

    await page.close();

    return screenshot;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

import puppeteer, { type Browser } from "puppeteer";
import { config } from "./config.js";
import { platform } from "os";
import { existsSync, readdirSync } from "fs";

function getExecutablePath(): string {
  // If CHROME_EXECUTABLE_PATH is set, use it
  if (config.CHROME_EXECUTABLE_PATH) {
    return config.CHROME_EXECUTABLE_PATH;
  }

  const cacheDir = "/opt/render/.cache/puppeteer";
  const homeCacheDir = process.env.HOME ? `${process.env.HOME}/.cache/puppeteer` : null;
  const platformName = platform();
  const isDarwin = platformName === "darwin";

  // Dynamically scan for any installed chrome version in the cache
  for (const dir of [cacheDir, homeCacheDir]) {
    if (!dir || !existsSync(`${dir}/chrome`)) continue;
    try {
      const versions = readdirSync(`${dir}/chrome`);
      for (const version of versions) {
        const exeName = isDarwin ? "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" : "chrome-linux64/chrome";
        const candidate = `${dir}/chrome/${version}/${exeName}`;
        if (existsSync(candidate)) {
          return candidate;
        }
      }
    } catch {
      // ignore unreadable dirs
    }
  }

  // System-installed fallbacks
  const systemPaths = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const path of systemPaths) {
    if (existsSync(path)) return path;
  }

  throw new Error(`Chrome executable not found in cache (${cacheDir}) or system paths.`);
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

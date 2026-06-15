import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import sharp from "sharp";
import { config } from "./config.js";

// Keep graphics disabled on serverless - more stable
chromium.setGraphicsMode = false;

export async function capturePageScreenshot(url: string, fullPage = false): Promise<string> {
  let browser: Browser | undefined;

  try {
    const executablePath = config.CHROME_EXECUTABLE_PATH || await chromium.executablePath();

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-blink-features=AutomationControlled',
      ],
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set extra HTTP headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Override navigator properties to hide automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      (window as any).chrome = { runtime: {} };
    });

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
      waitUntil: "networkidle2",
      timeout: config.PAGE_TIMEOUT_MS
    });

    // Smart wait: try to detect dynamically-loaded content (tables, grids, lists)
    // before falling back to a blind settle timer.
    try {
      await page.waitForFunction(
        () => {
          const selectors = ['table tbody tr', '[role="grid"] [role="row"]', '.data-table tr', '.stock-table tr'];
          return selectors.some(s => document.querySelectorAll(s).length > 0);
        },
        { timeout: config.PAGE_SETTLE_MS }
      );
    } catch {
      // No known data selectors found within the timeout – fall through to blind settle
    }

    await new Promise((resolve) => setTimeout(resolve, config.PAGE_SETTLE_MS));

    // Capture: either full page (capped at 10000px) or an efficient top-clip (default).
    let screenshotBuffer: Buffer;
    if (fullPage) {
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const cappedHeight = Math.min(pageHeight, 10000);
      await page.setViewport({
        width: config.SCREENSHOT_WIDTH,
        height: cappedHeight,
        deviceScaleFactor: 1
      });
      screenshotBuffer = await page.screenshot({
        type: "jpeg",
        quality: config.SCREENSHOT_QUALITY,
        fullPage: true,
        encoding: "binary"
      }) as Buffer;
    } else {
      // Clip screenshot to only the top SCREENSHOT_MAX_HEIGHT pixels so the VLM
      // only sees the first ~10 stock cards and not the full page of historic data.
      screenshotBuffer = await page.screenshot({
        type: "jpeg",
        quality: config.SCREENSHOT_QUALITY,
        encoding: "binary",
        clip: {
          x: 0,
          y: 0,
          width: config.SCREENSHOT_WIDTH,
          height: config.SCREENSHOT_MAX_HEIGHT
        }
      }) as Buffer;
    }

    await page.close();

    // OCR preprocessing: grayscale + sharpen + normalize for better VLM text extraction
    const processed = await sharp(screenshotBuffer)
      .grayscale()
      .sharpen({ sigma: 1.5 })
      .normalize()
      .toFormat("jpeg", { quality: config.SCREENSHOT_QUALITY })
      .toBuffer();

    // Save to file for debugging
    try {
      const fs = await import("fs/promises");
      await fs.writeFile("debug_screenshot.jpg", processed);
      console.log("Debug: Saved screenshot to debug_screenshot.jpg");
    } catch (err) {
      console.error("Failed to save debug screenshot:", err);
    }

    return processed.toString("base64");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { config } from "./config.js";

// Keep graphics disabled on serverless - more stable
chromium.setGraphicsMode = false;

export async function capturePageScreenshot(url: string): Promise<string> {
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
      waitUntil: "domcontentloaded",
      timeout: config.PAGE_TIMEOUT_MS
    });

    await new Promise((resolve) => setTimeout(resolve, config.PAGE_SETTLE_MS));

    // Get page height and cap at 10000px for reasonable VLM token usage
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const cappedHeight = Math.min(pageHeight, 10000);
    
    if (pageHeight > cappedHeight) {
      await page.setViewport({
        width: config.SCREENSHOT_WIDTH,
        height: cappedHeight,
        deviceScaleFactor: 1
      });
    }

    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: config.SCREENSHOT_QUALITY,
      fullPage: true,
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

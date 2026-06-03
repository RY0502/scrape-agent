import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { config } from "./config.js";

chromium.setGraphicsMode = false;

export async function capturePageScreenshot(url: string): Promise<string> {
  let browser: Browser | undefined;

  try {
    const executablePath = config.CHROME_EXECUTABLE_PATH || await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: "shell",
    });

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

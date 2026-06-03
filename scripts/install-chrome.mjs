import { install, resolveBuildId, Browser, detectBrowserPlatform } from "@puppeteer/browsers";
import { join } from "path";
import { homedir } from "os";

const cacheDir = process.env.PUPPETEER_CACHE_DIR
  ?? join(homedir(), ".cache", "puppeteer");

const platform = detectBrowserPlatform();

console.log(`[install-chrome] Resolving stable Chrome for ${platform}...`);
const buildId = await resolveBuildId(Browser.CHROME, platform, "stable");
console.log(`[install-chrome] Installing Chrome ${buildId} into ${cacheDir}`);

const result = await install({
  browser: Browser.CHROME,
  buildId,
  cacheDir,
  downloadProgressCallback: (downloaded, total) => {
    if (total > 0) process.stdout.write(`\r[install-chrome] ${Math.round((downloaded / total) * 100)}%`);
  }
});

console.log(`\n[install-chrome] Chrome installed at: ${result.executablePath}`);

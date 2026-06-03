import { install, resolveBuildId, Browser, detectBrowserPlatform } from "@puppeteer/browsers";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, "..", ".cache", "puppeteer");

const platform = detectBrowserPlatform();
console.log(`[install-chrome] Platform: ${platform}`);
console.log(`[install-chrome] Cache dir: ${cacheDir}`);

console.log(`[install-chrome] Resolving stable Chrome build ID...`);
const buildId = await resolveBuildId(Browser.CHROME, platform, "stable");
console.log(`[install-chrome] Build ID: ${buildId}`);

const expectedPath = join(cacheDir, "chrome", `${platform}-${buildId}`, "chrome-linux64", "chrome");
if (existsSync(expectedPath)) {
  console.log(`[install-chrome] Chrome already exists at: ${expectedPath}`);
  process.exit(0);
}

console.log(`[install-chrome] Downloading Chrome ${buildId}...`);
const result = await install({
  browser: Browser.CHROME,
  buildId,
  cacheDir,
});

console.log(`[install-chrome] Chrome installed at: ${result.executablePath}`);
if (existsSync(result.executablePath)) {
  console.log(`[install-chrome] Verified: executable exists.`);
} else {
  console.error(`[install-chrome] ERROR: executable missing after install!`);
  process.exit(1);
}

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: "/opt/render/.cache/puppeteer",
  "chrome-headless-shell": { skipDownload: true },
  firefox: { skipDownload: true },
};

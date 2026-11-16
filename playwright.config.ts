import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";
const cache = process.env.TPM_BROWSER_CACHE || "/workspace/browser-cache";
const chrome =
  process.env.CHROME_PATH ||
  join(cache, "chrome/runtime/opt/google/chrome/chrome");
const edge =
  process.env.EDGE_PATH ||
  join(cache, "edge/runtime/opt/microsoft/msedge/msedge");
if (process.env.CHROME_PATH && !existsSync(chrome))
  throw new Error("CHROME_PATH does not point to an available browser.");
if (process.env.EDGE_PATH && !existsSync(edge))
  throw new Error("EDGE_PATH does not point to an available browser.");
const fallback = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const executable = existsSync(chrome)
  ? chrome
  : existsSync(fallback)
    ? fallback
    : undefined;
const desktop = (width: number) => ({
  ...devices["Desktop Chrome"],
  viewport: { width, height: 1000 },
});
export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/pages/**"],
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: { executablePath: executable, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: desktop(1440) },
    { name: "desktop-1366", use: desktop(1366) },
    { name: "desktop-1920", use: desktop(1920) },
    ...(existsSync(edge)
      ? [
          {
            name: "edge",
            use: {
              ...desktop(1440),
              launchOptions: { executablePath: edge, args: ["--no-sandbox"] },
            },
          },
        ]
      : []),
    // Preserve prior mobile checks as an explicit opt-in; desktop is the default QA target.
    ...(process.env.LEGACY_MOBILE_TESTS === "1"
      ? [
          {
            name: "mobile",
            use: {
              ...devices["iPhone 13"],
              defaultBrowserType: "chromium" as const,
            },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: "npm run dev -- --port 5173 --strictPort",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});

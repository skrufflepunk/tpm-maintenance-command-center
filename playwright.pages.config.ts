import { defineConfig } from "@playwright/test";
import desktop from "./playwright.config";
export default defineConfig({
  testDir: "./tests/pages",
  outputDir: "test-results-pages",
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: {
    ...desktop.use,
    baseURL: "http://127.0.0.1:4173/tpm-maintenance-command-center/",
  },
  projects: (desktop.projects ?? []).filter((p) =>
    ["desktop", "edge"].includes(p.name ?? ""),
  ),
  webServer: {
    command: "node scripts/serve-static-test.mjs",
    url: "http://127.0.0.1:4173/tpm-maintenance-command-center/",
    reuseExistingServer: false,
  },
});

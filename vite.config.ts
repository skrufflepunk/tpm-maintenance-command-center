import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/auth": "http://127.0.0.1:8787",
    },
  },
  plugins: [react(), tailwindcss()],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "server/**/*.test.ts"],
    environment: "node",
    globals: true,
    restoreMocks: true,
  },
});

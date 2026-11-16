import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ command }) => ({
  base: "./",
  build: { modulePreload: { polyfill: false } },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "static-pages-policy",
      transformIndexHtml() {
        if (command !== "build") return;
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content:
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'",
            },
            injectTo: "head-prepend",
          },
        ];
      },
    },
  ],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    globals: true,
    restoreMocks: true,
  },
}));

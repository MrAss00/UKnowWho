import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    // Per-file override via `// @vitest-environment jsdom`; node is the default.
    environment: "node",
  },
});

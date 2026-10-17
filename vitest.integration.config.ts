import path from "node:path";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});

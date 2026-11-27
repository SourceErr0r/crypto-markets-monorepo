import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the `@/` imports from tsconfig.json, as Next does.
  resolve: { tsconfigPaths: true },
  test: {
    // Components need a DOM. jsdom keeps Node's fetch, which MSW intercepts.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});

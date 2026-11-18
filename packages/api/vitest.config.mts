import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Hook tests render React, so they need a DOM. jsdom keeps Node's fetch,
    // which MSW intercepts.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});

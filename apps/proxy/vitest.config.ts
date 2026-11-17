// Runs the tests inside the Workers runtime (workerd), with local KV and
// rate-limit bindings built from wrangler.jsonc.
// https://developers.cloudflare.com/workers/testing/vitest-integration/
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // Tests never see a real key. Outbound calls are stubbed in each test.
      miniflare: { bindings: { COINGECKO_API_KEY: "test-key" } },
    }),
  ],
});

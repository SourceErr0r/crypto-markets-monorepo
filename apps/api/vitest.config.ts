// Runs the tests inside the Workers runtime (workerd) with a local D1 database
// built from wrangler.jsonc. The real migration files are read here (in
// Node.js) and applied in src/test-setup.ts, so tests use the deployed schema.
// https://developers.cloudflare.com/workers/testing/vitest-integration/
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const migrations = await readD1Migrations("./migrations");

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
    }),
  ],
  test: { setupFiles: ["./src/test-setup.ts"] },
});

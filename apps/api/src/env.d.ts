// Test-only binding (see vitest.config.ts), not in wrangler.jsonc, so
// `wrangler types` can't see it. Declared here so the tests type-check.
declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}

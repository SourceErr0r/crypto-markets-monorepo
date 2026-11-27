// Applies the migrations before the tests. Already-applied migrations are
// skipped, so running this before every test file is cheap.
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

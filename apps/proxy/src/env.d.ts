// Secrets aren't in wrangler.jsonc, so `wrangler types` can't see them.
// Declared here (merged into the generated Env) so the code type-checks in CI,
// where there is no .dev.vars.
interface Env {
  COINGECKO_API_KEY: string;
}

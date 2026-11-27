import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 removed `next lint`; ESLint runs directly with Next's flat config.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Coin icons are tiny and already served from CoinGecko's CDN. next/image
    // would route them through our own server to resize them, for no gain.
    rules: { "@next/next/no-img-element": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

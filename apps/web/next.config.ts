import type { NextConfig } from "next";

// Empty on purpose. Turbopack (the default bundler in Next 16) compiles pnpm
// workspace packages itself, so @crypto-markets/api needs no transpilePackages.
const nextConfig: NextConfig = {};

export default nextConfig;

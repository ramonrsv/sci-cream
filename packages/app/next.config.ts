import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [{ source: "/", destination: "/calculator", permanent: true }];
  },
};

// Treemap of bundle contents via `pnpm build:analyze` (webpack-only, hence `--webpack`). Chunk
// sizes may drift from `pnpm bench:bundle` (Turbopack); use for composition, not as size of record.
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);

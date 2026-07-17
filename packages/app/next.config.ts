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
  // Framing: 'self' everywhere except /share/embed, which is designed for third-party iframes and
  // renders no session-scoped controls. Last same-key match wins, so the embed rule must stay last.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'self'" }],
      },
      {
        source: "/share/embed",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
};

// Treemap of bundle contents via `pnpm build:analyze` (webpack-only, hence `--webpack`). Chunk
// sizes may drift from `pnpm bench:bundle` (Turbopack); use for composition, not as size of record.
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);

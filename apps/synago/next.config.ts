import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@qcc/db", "@qcc/core", "@qcc/ui"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
    // Reuse rendered pages on client-side navigation instead of refetching
    // every time - big perceived-speed win for a nav-heavy app.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;

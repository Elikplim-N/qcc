import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@qcc/db", "@qcc/core", "@qcc/ui"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;

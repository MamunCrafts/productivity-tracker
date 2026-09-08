import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the authenticated proxy to buffer a 100 MB PDF plus form metadata.
  experimental: { proxyClientMaxBodySize: "101mb" },
};

export default nextConfig;

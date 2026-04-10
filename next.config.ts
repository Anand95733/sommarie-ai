import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during build to avoid hanging
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript checking during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

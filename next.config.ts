/**
 * Next.js Configuration
 *
 * LEARNING: Next.js config controls build and runtime behavior
 *
 * COMMENT: Removed invalid turbopack experimental option
 * Turbopack is enabled by default in Next.js 15, no config needed
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: [__dirname],
  },
};

export default nextConfig;

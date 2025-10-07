import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility
  output: "export",
  distDir: ".next",
  images: {
    unoptimized: true, // Cloudflare Pages doesn't support Next.js Image Optimization
  },
};

export default nextConfig;

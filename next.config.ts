import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages
  output: "export",

  // Disable image optimization (not supported on Pages)
  images: {
    unoptimized: true,
  },

  // Disable trailing slashes for cleaner URLs
  trailingSlash: false,
};

export default nextConfig;

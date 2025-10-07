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

  // Exclude workers from TypeScript checks
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
    dirs: ["app", "components", "hooks", "lib"],
  },
};

export default nextConfig;

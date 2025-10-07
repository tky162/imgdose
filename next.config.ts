import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages
  output: "export",

  // Disable image optimization (not supported on Pages)
  images: {
    unoptimized: true,
  },

  // Exclude workers from TypeScript and ESLint checks
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
    dirs: ["app", "components", "hooks", "lib"],
  },
};

export default nextConfig;

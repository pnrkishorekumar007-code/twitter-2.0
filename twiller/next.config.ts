import type { NextConfig } from "next";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
    ],
  },
  turbopack: {
    root: resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  },
  // Performance optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Optimize bundle splitting
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
  },
};

export default nextConfig;

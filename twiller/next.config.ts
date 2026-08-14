import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const nextConfig: NextConfig = {
  images: {
    // ImageBB resolves i.ibb.co to NAT64 IPs (64:ff9b::…) that Next.js classifies
    // as private/local, so the optimizer would SSRF-block them despite the
    // remotePatterns entries below. All app images use `unoptimized` (direct
    // browser fetch), so the optimizer is never used — this flag is a safety net
    // in case any image ever falls through to the optimizer.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      // ImageBB — user uploads for tweet images, banners and avatars.
      { protocol: "https", hostname: "i.ibb.co" },
      // Google / Firebase — avatars from Google sign-in.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
    ],
  },
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;

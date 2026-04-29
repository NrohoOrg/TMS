import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  reactCompiler: true,
  devIndicators: false,
  // Local-dev escape hatch: when API_PROXY_TARGET is set, every request to
  // /api/* on the Next.js dev server is proxied server-side to that origin.
  // The browser only ever sees same-origin /api calls, so CORS never enters
  // the picture. Pair with NEXT_PUBLIC_API_BASE_URL=/api in .env.local.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    if (!target) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${target.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

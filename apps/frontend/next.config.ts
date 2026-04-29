import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle at .next/standalone for the Docker
  // runner stage (apps/frontend/Dockerfile copies it as the production image).
  output: "standalone",
  // Preserve the monorepo layout under standalone/ so the Dockerfile's
  // `node apps/frontend/server.js` resolves. Without this Next traces from
  // apps/frontend and would emit server.js at the root instead.
  outputFileTracingRoot: path.join(__dirname, "../../"),
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

import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The game is fully client-side (one static route, no SSR/API), so build a
  // plain static export into `out/`. Any static host (Netlify, Pages, S3…)
  // can serve it without a Next.js server runtime.
  output: "export",

  // A parent directory also contains a lockfile, so Next would otherwise infer
  // the workspace root two levels up (breaking module/TS resolution). Pin the
  // root to this project.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

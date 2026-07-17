import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // A parent directory also contains a lockfile, so Next would otherwise infer
  // the workspace root two levels up (breaking module/TS resolution). Pin the
  // root to this project.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

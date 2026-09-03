import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray pnpm-lock.yaml in a parent directory outside this git repo
  // otherwise makes Turbopack guess the wrong workspace root.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;

import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray pnpm-lock.yaml in a parent directory outside this git repo
  // otherwise makes Turbopack guess the wrong workspace root.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  // lib/scripture/store.ts builds its fs path from a `version` variable, not
  // a string literal, so Next's automatic file-tracing can miss the data
  // files on a serverless deploy -- this makes the inclusion explicit.
  outputFileTracingIncludes: {
    "/api/scripture": ["./lib/scripture/data/**/*"],
  },
};

export default nextConfig;

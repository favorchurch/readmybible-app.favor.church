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
  // Dev only. Next allowlists `localhost` for its internal `/_next/*` routes and
  // 403s everything else (server/lib/router-utils/block-cross-site-dev.ts). The
  // 403 body is written straight onto the hijacked `/_next/hmr` upgrade socket
  // with no status line, so the browser reports ERR_INVALID_HTTP_RESPONSE, the
  // Turbopack runtime bootstrap stalls, and React never hydrates. Automation
  // browsers reach the dev server at 127.0.0.1 (localhost does not resolve for
  // them), so without this every automated UI check silently measures a
  // non-interactive page. See issue #55.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

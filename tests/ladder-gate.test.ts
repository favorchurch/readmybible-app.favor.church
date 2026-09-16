/**
 * The ladder prototype must be unreachable in production -- as an HTTP
 * response, not merely as a function call.
 *
 * An earlier version of this suite asserted only that the page invoked
 * `notFound()`. It passed while a real production build answered
 * `GET /ladder` with **HTTP 200** and a not-found body, leaving the route
 * observably present to crawlers and monitoring. The gate now lives in
 * `proxy.ts`, which runs before the route, and this asserts the status code
 * that comes back.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth0", () => ({
  auth0: { middleware: vi.fn(async () => new Response(null, { status: 200 })) },
}));

import { proxy } from "@/proxy";

function request(path: string) {
  return { nextUrl: { pathname: path } } as Parameters<typeof proxy>[0];
}

describe("ladder reachability", () => {
  it("answers /ladder with 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await proxy(request("/ladder"));
    expect(res.status).toBe(404);
    vi.unstubAllEnvs();
  });

  it("covers nested ladder paths too", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await proxy(request("/ladder/anything"))).status).toBe(404);
    vi.unstubAllEnvs();
  });

  it("does not block /ladder outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    expect((await proxy(request("/ladder"))).status).toBe(200);
    vi.unstubAllEnvs();
  });

  it("does not block unrelated routes in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await proxy(request("/"))).status).toBe(200);
    expect((await proxy(request("/admin"))).status).toBe(200);
    vi.unstubAllEnvs();
  });
});

/**
 * The scripture route's Cache-Control is a safety rule, not a performance
 * tweak: it decides how long a reader's browser is allowed to keep showing an
 * answer produced during an upstream outage. Review round 2 caught that the
 * key-passage fallback was being cached for a full day, so a 30-second
 * bolls.life blip could pin a reader to a three-verse body until the next day.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/scripture/route";
import { clearLiveCacheForTests } from "@/lib/scripture/live";

afterEach(() => {
  vi.restoreAllMocks();
  clearLiveCacheForTests();
});

function request(ref: string, translation: string): Request {
  return new Request(`http://localhost/api/scripture?ref=${encodeURIComponent(ref)}&t=${translation}`);
}

describe("GET /api/scripture cache policy", () => {
  it("caches a complete chapter for a day", async () => {
    const res = await GET(request("Matthew 4", "NET"));
    const body = await res.json();

    expect(body.source).toBe("bundled");
    expect(Object.keys(body.verses).length).toBeGreaterThan(20);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
  });

  it("never caches a miss", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));

    const res = await GET(request("Matthew 29:1", "CSB"));
    const body = await res.json();

    expect(body.verses).toBeNull();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("never caches the degraded key-passage fallback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));

    const res = await GET(request("Matthew 4", "ESV"));
    const body = await res.json();

    // The reader still gets scripture rather than a blank day...
    expect(body.source).toBe("key-passage-fallback");
    expect(Object.keys(body.verses).length).toBeGreaterThan(0);
    // ...but a transient outage must not follow them for 24 hours.
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

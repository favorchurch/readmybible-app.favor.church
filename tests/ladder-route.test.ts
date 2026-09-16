/**
 * The ladder prototype must be unreachable in production.
 *
 * `main` deploys straight to Vercel production, and the ladder renders a
 * fixture full of real member names. This repo already carries an open bug
 * for the same failure shape (#52: the `?test=1` debug panel reachable in
 * production), so the gate gets a test rather than a comment.
 *
 * Written to fail against an ungated route: if `LadderPage` stops calling
 * `notFound()`, the production case below renders instead of throwing and
 * the test fails. It also asserts the gate's *reason*, not just that
 * something threw -- a gate that fails closed on everything would pass an
 * exit-code-only assertion while being broken.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted so the page module below binds to this mock at import time -- no
// dynamic import, no vi.resetModules(). Resetting the module graph mid-run
// re-imports React's automatic JSX runtime through the SSR interop and the
// already-transformed page then calls a non-function.
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ notFound }));

// The route reads Rock on the server. The gate is what is under test here,
// not the read, and a test must never reach production Rock.
const loadLadderTreeAs = vi.hoisted(() =>
  vi.fn(async () => ({ sections: [], unavailableGroupIds: [] })),
);
vi.mock("@/lib/ladder/tree", () => ({
  loadLadderTreeAs,
  LADDER_VIEWERS: { regionalLeader: { label: "Regional leader", rootIds: [1] } },
}));

import LadderPage from "@/app/ladder/page";
import { isLadderPrototypeEnabled, ladderGateReason } from "@/lib/ladder/dev-gate";

function setNodeEnv(value: string) {
  // `vi.stubEnv` is the repo's existing pattern (tests/dev-clock.test.ts):
  // process.env is a proxy that rejects defineProperty.
  vi.stubEnv("NODE_ENV", value);
}

beforeEach(() => {
  notFound.mockClear();
  loadLadderTreeAs.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ladder prototype gate", () => {
  it("is open outside production", () => {
    for (const env of ["development", "test", "preview", ""]) {
      setNodeEnv(env);
      expect(isLadderPrototypeEnabled()).toBe(true);
      expect(ladderGateReason()).toBe("open: non-production build");
    }
  });

  it("is closed in production, and says why", () => {
    setNodeEnv("production");
    expect(isLadderPrototypeEnabled()).toBe(false);
    // The reason matters: a gate that closed for some unrelated reason would
    // still return false here, and this is what distinguishes the two.
    expect(ladderGateReason()).toBe("closed: NODE_ENV is production");
  });

  it("is not openable by an env var", () => {
    setNodeEnv("production");
    process.env.LADDER_PROTOTYPE = "1";
    process.env.NEXT_PUBLIC_LADDER_PROTOTYPE = "1";
    try {
      expect(isLadderPrototypeEnabled()).toBe(false);
    } finally {
      delete process.env.LADDER_PROTOTYPE;
      delete process.env.NEXT_PUBLIC_LADDER_PROTOTYPE;
    }
  });

  it("the route calls notFound() when the gate is closed", async () => {
    setNodeEnv("production");
    await expect(LadderPage({})).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
    // The gate must short-circuit before any Rock read is attempted.
    expect(loadLadderTreeAs).not.toHaveBeenCalled();
  });

  it("the route renders when the gate is open", async () => {
    setNodeEnv("test");
    await expect(LadderPage({})).resolves.toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
    expect(loadLadderTreeAs).toHaveBeenCalledOnce();
  });
});

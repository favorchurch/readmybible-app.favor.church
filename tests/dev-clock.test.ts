import { afterEach, describe, expect, it, vi } from "vitest";

import { appNow, devMockToday } from "@/lib/dev-clock";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("appNow", () => {
  it("ignores DEV_MOCK_TODAY in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_MOCK_TODAY", "2026-10-08");
    const now = appNow();
    expect(Math.abs(now.getTime() - Date.now())).toBeLessThan(5000);
  });

  it("uses DEV_MOCK_TODAY outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEV_MOCK_TODAY", "2026-10-08");
    expect(appNow().toISOString().slice(0, 10)).toBe("2026-10-08");
  });

  it("falls back to the real clock when DEV_MOCK_TODAY is malformed", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEV_MOCK_TODAY", "not-a-date");
    const now = appNow();
    expect(Math.abs(now.getTime() - Date.now())).toBeLessThan(5000);
  });

  it("falls back to the real clock when DEV_MOCK_TODAY is unset", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEV_MOCK_TODAY", undefined);
    const now = appNow();
    expect(Math.abs(now.getTime() - Date.now())).toBeLessThan(5000);
  });
});

describe("devMockToday", () => {
  it("returns null in production even with a valid value set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_MOCK_TODAY", "2026-10-08");
    expect(devMockToday()).toBeNull();
  });

  it("returns the raw value outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEV_MOCK_TODAY", "2026-10-08");
    expect(devMockToday()).toBe("2026-10-08");
  });

  it("returns null for a malformed value", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEV_MOCK_TODAY", "10/08/2026");
    expect(devMockToday()).toBeNull();
  });
});

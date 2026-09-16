import { describe, expect, it } from "vitest";

import { isTestModeRequested, isTestModeRequestedFromQuery } from "@/components/test-mode/logic";

/**
 * `HomeData` skips the org-wide Connect Group Rock fetch unless the URL asks for
 * test mode, and the client panel decides it is active from the same URL. If the
 * two predicates ever disagree, the panel opens over an empty group picker (server
 * said no) or every ordinary page load pays for a several-hundred-group Rock call
 * (server said yes). These tests pin them together.
 */

const TRIGGERS = ["?test=1", "?day=5", "?leader=1", "?admin=1", "?tab=admin"];
const NON_TRIGGERS = ["", "?tab=leader", "?tab=today", "?scope=cluster", "?foo=bar"];

function queryOf(search: string): Record<string, string | string[] | undefined> {
  return Object.fromEntries(new URLSearchParams(search).entries());
}

describe("test mode request gate", () => {
  it.each(TRIGGERS)("treats %s as a test mode request on both sides", (search) => {
    expect(isTestModeRequested(new URLSearchParams(search))).toBe(true);
    expect(isTestModeRequestedFromQuery(queryOf(search))).toBe(true);
  });

  it.each(NON_TRIGGERS)("treats %s as an ordinary page load on both sides", (search) => {
    expect(isTestModeRequested(new URLSearchParams(search))).toBe(false);
    expect(isTestModeRequestedFromQuery(queryOf(search))).toBe(false);
  });

  it("keeps ?tab=leader off, since it is the primary nav landing on the Leader tab", () => {
    expect(isTestModeRequestedFromQuery({ tab: "leader" })).toBe(false);
    expect(isTestModeRequestedFromQuery({ tab: "admin" })).toBe(true);
  });

  it("reads the first value when Next passes a repeated key as an array", () => {
    expect(isTestModeRequestedFromQuery({ tab: ["admin", "leader"] })).toBe(true);
    expect(isTestModeRequestedFromQuery({ tab: ["leader", "admin"] })).toBe(false);
    expect(isTestModeRequestedFromQuery({ day: ["5"] })).toBe(true);
  });

  it("triggers on a bare valueless param, matching URLSearchParams.has", () => {
    expect(isTestModeRequested(new URLSearchParams("?test"))).toBe(true);
    expect(isTestModeRequestedFromQuery({ test: "" })).toBe(true);
  });
});

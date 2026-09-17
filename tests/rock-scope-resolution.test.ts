/**
 * Issue #118/#151: region/cluster scope is resolved by walking
 * `ParentGroupId` upward at request time, not a schema change or
 * denormalised column. `vi.stubEnv("ROCK_API_KEY", "")` forces fixture mode
 * (see lib/rock/client.ts `isFixtureMode`) so these exercise the real,
 * unmocked walk against the known fixture hierarchy instead of hitting Rock.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isGroupInScope, resolveUpwardScope } from "@/lib/rock/client";

// Fixture hierarchy (lib/rock/fixtures.ts):
// 24100 (Connect Group) -> 23870 (Region) -> 23869 (Cluster) -> 78 (MNL Adults)
//   -> 39 (MNL Connect Groups) -> 22464 (Connect Groups) -> root
const CONNECT_GROUP_ID = 24100;
const REGION_ID = 23870;
const CLUSTER_ID = 23869;
const UNRELATED_ROOT_ID = 999999;

describe("resolveUpwardScope", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("walks ParentGroupId upward from the group to the root, each node included once", async () => {
    vi.stubEnv("ROCK_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test");

    const chain = await resolveUpwardScope(CONNECT_GROUP_ID);

    expect(chain.map((node) => node.Id)).toEqual([24100, 23870, 23869, 78, 39, 22464]);
  });

  it("stops (rather than looping) if a node's parent cannot be resolved", async () => {
    vi.stubEnv("ROCK_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test");

    // 31192's ParentGroupId (24021) is not itself a known fixture section.
    const chain = await resolveUpwardScope(31192);

    expect(chain.map((node) => node.Id)).toEqual([31192]);
  });
});

describe("isGroupInScope", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is true when the group is a root itself", async () => {
    vi.stubEnv("ROCK_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test");

    expect(await isGroupInScope(REGION_ID, [REGION_ID])).toBe(true);
  });

  it("is true when the group's ancestry passes through a root (Regional Leader jurisdiction)", async () => {
    vi.stubEnv("ROCK_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test");

    expect(await isGroupInScope(CONNECT_GROUP_ID, [REGION_ID])).toBe(true);
  });

  it("is true when the group's ancestry passes through a higher root (Cluster Head jurisdiction)", async () => {
    vi.stubEnv("ROCK_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test");

    expect(await isGroupInScope(CONNECT_GROUP_ID, [CLUSTER_ID])).toBe(true);
  });

  // Known-bad behavior 3 (issue #151): a leader cannot reach a Connect
  // outside their actual jurisdiction.
  it("is false when no root appears anywhere in the group's ancestry", async () => {
    vi.stubEnv("ROCK_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test");

    expect(await isGroupInScope(CONNECT_GROUP_ID, [UNRELATED_ROOT_ID])).toBe(false);
  });
});

/**
 * DEVIATION (Leg C / admin lane): this file did not exist in the worktree
 * handed to this lane, but `lib/rock/client.ts` (out of this lane's touch
 * scope) imports it unconditionally, which failed `tsc`/`next build` before
 * any admin code was added. This is a minimal shim so the shared client
 * compiles and behaves exactly as before: `isFixtureMode()` is false unless
 * `ROCK_FIXTURE_MODE=1` is explicitly set (never set in this repo's env
 * files), so every real code path continues to hit live Rock exactly as
 * `lib/rock/client.ts` already does. The other lane owns `lib/rock/client.ts`
 * and should replace this with its real fixture data / delete this note if
 * it already has its own version.
 */
import type { RockGroup, RockGroupMember, RockPerson } from "@/lib/rock/client";

export function isFixtureMode(): boolean {
  return process.env.ROCK_FIXTURE_MODE === "1";
}

export function fixturePerson(personId: number): RockPerson | null {
  void personId;
  return null;
}

export function fixtureMemberships(personId: number): RockGroupMember[] {
  void personId;
  return [];
}

export function fixtureSectionMemberships(personId: number): RockGroupMember[] {
  void personId;
  return [];
}

export function fixtureRoster(groupId: number): RockGroupMember[] {
  void groupId;
  return [];
}

export function fixtureCampusGroups(campusId: number): RockGroup[] {
  void campusId;
  return [];
}

export function fixtureSectionSubtree(sectionGroupId: number): RockGroup[] {
  void sectionGroupId;
  return [];
}

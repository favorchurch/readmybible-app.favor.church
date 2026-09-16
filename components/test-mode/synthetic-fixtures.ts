import { resolveAvatar } from "@/components/avatar";
import type { RosterMemberView } from "@/components/app-shell";
import type { GroupStats } from "@/lib/data/stats";
import type { GroupMembership } from "@/lib/session";
import {
  TEST_MODE_CAMPUSES,
  type SyntheticTestModeScenario,
  type TestModeCampus,
} from "./logic";

export type SyntheticTestModeView = {
  groupName: string | null;
  campusName: string;
  memberships: GroupMembership[];
  activeGroup: GroupMembership | null;
  roster: RosterMemberView[];
  groupStats: GroupStats | null;
};

function campusName(campus: TestModeCampus): string {
  return TEST_MODE_CAMPUSES.find((candidate) => candidate.id === campus)?.name ?? "Synthetic campus";
}

function membership(
  groupId: number,
  groupName: string,
  campus: TestModeCampus,
  isLeader: boolean,
): GroupMembership {
  return {
    groupId,
    groupName,
    campusId: campus,
    roleId: isLeader ? 24 : 23,
    isLeader,
  };
}

function rosterFor(
  memberCount: number,
  leaderIndexes: ReadonlySet<number>,
): RosterMemberView[] {
  return Array.from({ length: memberCount }, (_, index) => {
    const personId = -(7000 + index + 1);
    const isLeader = leaderIndexes.has(index);
    return {
      personId,
      avatar: resolveAvatar(personId, null),
      isSelf: index === 0,
      name: `Synthetic reader ${index + 1}`,
      isLeader,
      readToday: index % 2 === 0,
      chapters: [],
      readingDates: [],
    };
  });
}

function statsFor(roster: RosterMemberView[]): GroupStats {
  const readersTodayIds = roster.filter((member) => member.readToday).map((member) => member.personId);
  return {
    checkinCount: readersTodayIds.length,
    memberCount: roster.length,
    ratio: roster.length === 0 ? 0 : readersTodayIds.length / roster.length,
    readersTodayIds,
  };
}

function viewFor(
  campus: TestModeCampus,
  memberships: GroupMembership[],
  activeGroup: GroupMembership | null,
  roster: RosterMemberView[],
): SyntheticTestModeView {
  return {
    groupName: activeGroup?.groupName ?? null,
    campusName: campusName(campus),
    memberships,
    activeGroup,
    roster,
    groupStats: roster.length > 0 ? statsFor(roster) : null,
  };
}

/**
 * Synthetic-only fixtures for compound states. They intentionally contain no
 * Rock IDs, names, counts, or member-derived values and never call the server.
 */
export function syntheticTestModeView(
  scenario: SyntheticTestModeScenario,
  campus: TestModeCampus,
): SyntheticTestModeView {
  const first = membership(-5101, "Synthetic Connect A", campus, true);
  const second = membership(-5102, "Synthetic Connect B", campus, false);
  const leaderSecond = membership(-5102, "Synthetic Connect B", campus, true);

  switch (scenario) {
    case "two-regions": {
      const regionA = membership(-5201, "Synthetic Region A", campus, true);
      const regionB = membership(-5202, "Synthetic Region B", campus, true);
      return viewFor(campus, [regionA, regionB], regionA, rosterFor(4, new Set([0])));
    }
    case "two-connect-memberships":
      return viewFor(campus, [first, second], first, rosterFor(4, new Set([0])));
    case "multi-scope-leadership":
      return viewFor(campus, [first, leaderSecond], first, rosterFor(5, new Set([0, 1])));
    case "connect-and-upstream-leader":
      return viewFor(campus, [first], first, rosterFor(5, new Set([0])));
    case "upstream-leader-no-connect": {
      return viewFor(campus, [], null, rosterFor(3, new Set([0])));
    }
    case "ordinary-member":
      {
        const memberGroup = membership(-5401, "Synthetic Member Group", campus, false);
        return viewFor(campus, [memberGroup], memberGroup, rosterFor(3, new Set()));
      }
    case "ordinary-non-member":
      return viewFor(campus, [], null, []);
    default: {
      const _exhaustive: never = scenario;
      return _exhaustive;
    }
  }
}

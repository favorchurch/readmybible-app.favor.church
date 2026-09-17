import { Suspense } from "react";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { AppShell, type AppShellProps, type ConnectLeaderView } from "@/components/app-shell";
import { isAvatarConfig, resolveAvatar, type Translation } from "@/components/avatar";
import { devMockToday } from "@/lib/dev-clock";
import {
  getCampusBoard,
  getGroupMembersReadingHistory,
  getGroupStats,
  getPersonReadingState,
} from "@/lib/data/stats";
import { getCampusName, getRoster } from "@/lib/rock/client";
import { resolveConnectScore } from "@/lib/connect-scoring";
import { presentConnectRoster } from "@/lib/scoring-presentation";
import type { SessionContext } from "@/lib/session";
import { testWritableGroupId } from "@/lib/test-mode-config";
import {
  isTestModeRequestedFromQuery,
  simulatedScopeFromQuery,
  type TestModeCampus,
} from "@/components/test-mode/logic";
import { resolveAdminScope, type AdminScope } from "@/lib/admin/access";
import { getAuthorizedTestGroupOptions, isTestModeAuthorized } from "@/lib/test-mode-auth";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
import SectionDashboard, { SectionDashboardSkeleton } from "@/components/sections/section-dashboard";

/** Next hands repeated query keys through as an array; every caller here wants the first value. */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function testModeCampusForId(campusId: number | null): TestModeCampus {
  return campusId === 2 || campusId === 3 ? campusId : 1;
}

function testModeQuery(query: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const first = firstParam(value);
    if (first !== undefined) params.set(key, first);
  }
  return params;
}

export async function HomeData({
  session,
  searchParams = {},
}: {
  session: Extract<SessionContext, { status: "ok" }>;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const activeGroupId = session.activeGroup?.groupId;
  const rosterP = activeGroupId ? getRoster(activeGroupId) : Promise.resolve([]);
  const memberReadingMapP = activeGroupId
    ? rosterP.then((members) => getGroupMembersReadingHistory(activeGroupId, members.map((m) => m.PersonId)))
    : Promise.resolve(new Map());
  // Issue #150: derived every call from current Rock roster/roles and stored
  // check-in facts -- never a saved, incrementing group score.
  const connectScoreP = activeGroupId ? resolveConnectScore(activeGroupId) : Promise.resolve(null);

  const writableGroupId = testWritableGroupId();
  const realAdminScope = resolveAdminScope(session);
  const testModeAuthorized = isTestModeAuthorized(session);

  // The list is both expensive and sensitive. The server auth helper limits it
  // to the tester's genuine global or section-admin scope before any group list
  // is fetched.
  const wantsTestMode = isTestModeRequestedFromQuery(searchParams);
  type CampusGroupRow = { groupId: number; groupName: string };
  const campusGroupsP: Promise<CampusGroupRow[]> =
    !wantsTestMode || !testModeAuthorized
      ? Promise.resolve([])
      : getAuthorizedTestGroupOptions(session);

  // `campusGroupsP` is deliberately absent from this Promise.all. It is handed
  // to AppShell UNRESOLVED and read behind a Suspense boundary in the panel, so
  // the shell paints and every other control (role, campus, phase, sliders) is
  // usable while the org-wide Rock call is still in flight. Awaiting it here is
  // what made test mode feel slow even after the fetch was gated.
  const [profileRows, readingState, roster, groupStats, campusBoard, campusName, memberReadingMap, connectScore] =
    await Promise.all([
      db.select().from(profiles).where(eq(profiles.rockPersonId, session.rockPersonId)).limit(1),
      getPersonReadingState(session.rockPersonId),
      rosterP,
      session.activeGroup
        ? getGroupStats(session.activeGroup.groupId, session.activeGroup.campusId)
        : Promise.resolve(null),
      session.campusId ? getCampusBoard(session.campusId) : Promise.resolve([]),
      session.campusId ? getCampusName(session.campusId) : Promise.resolve(null),
      memberReadingMapP,
      connectScoreP,
    ]);

  const rosterPresentationByPersonId = connectScore
    ? new Map(presentConnectRoster(connectScore.score).map((row) => [row.rockPersonId, row]))
    : new Map();

  const connectLeaders: ConnectLeaderView[] = connectScore
    ? [...rosterPresentationByPersonId.values()]
        .filter((row) => row.isUpstreamLeader && !row.isConnectRosterMember)
        .map((row) => ({
          personId: row.rockPersonId,
          name: connectScore.leaderNames.get(row.rockPersonId) ?? `Reader ${row.rockPersonId}`,
          contributedPoints: row.displayContributedPoints,
        }))
    : [];

  const profileRow = profileRows[0];
  const avatar = resolveAvatar(session.rockPersonId, session.rockGender, profileRow?.avatar);
  const rosterProfiles = roster.length
    ? await db.select({ personId: profiles.rockPersonId, avatar: profiles.avatar })
      .from(profiles).where(inArray(profiles.rockPersonId, roster.map((member) => member.PersonId)))
    : [];
  const savedAvatars = new Map(rosterProfiles.map((row) => [row.personId, row.avatar]));
  const translation = (profileRow?.translation as Translation | undefined) ?? session.defaultTranslation;

  let scope = realAdminScope;
  let simulatedScope: "global" | "cluster" | "region" | "department" | undefined;
  let simulatedCampus: TestModeCampus | undefined;

  // Dev-only simulation of global/cluster/region scopes, re-homed verbatim
  // from the original app/admin/page.tsx (see ef393bd). In production, the
  // simulate bar is also available to a viewer with a real server-resolved
  // admin scope when `?test=1` is present -- matches the old app/admin/page.tsx
  // behavior of `params.test === "1" && session.status === "ok"`, narrowed to
  // require a genuine admin scope rather than any logged-in session.
  const isDev = process.env.NODE_ENV !== "production";
  const testParam = firstParam(searchParams.test);
  const scopeParam = firstParam(searchParams.scope);
  const roleParam = firstParam(searchParams.role) ?? firstParam(searchParams.viewer);
  const campusParam = firstParam(searchParams.campus);
  const isProdAdminTest = !isDev && scope !== null && testParam === "1";
  const isTest = (isDev && (testParam === "1" || scopeParam !== undefined)) || isProdAdminTest;
  if ((isTest || (!scope && isDev)) && scope?.kind === "global") {
    const hasSimulationQuery =
      roleParam !== undefined || campusParam !== undefined || scopeParam !== undefined || testParam === "1";
    if (hasSimulationQuery) {
      const simulated = simulatedScopeFromQuery(testModeQuery(searchParams), testModeCampusForId(session.campusId));
      if (simulated) {
        scope = simulated.kind === "global"
          ? { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] }
          : { kind: "sections", rootIds: simulated.rootIds };
        simulatedScope = simulated.simulatedScope;
        simulatedCampus = simulated.campus;
      } else {
        scope = null;
        simulatedScope = undefined;
        simulatedCampus = undefined;
      }
    } else {
      const requestedScope = scopeParam ?? "global";
      if (requestedScope === "global") {
        scope = { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] };
        simulatedScope = "global";
      }
    }
  }

  const sectionSlot = scope
    ? (
      <Suspense fallback={<SectionDashboardSkeleton />}>
        <SectionDashboard
          scope={scope as AdminScope}
          simulatedScope={simulatedScope}
          simulatedCampus={simulatedCampus}
        />
      </Suspense>
    )
    : null;

  const props: AppShellProps = {
    displayName: profileRow?.displayName || session.displayName,
    avatar,
    avatarCustomized: isAvatarConfig(profileRow?.avatar),
    translation,
    memberships: session.memberships,
    activeGroup: session.activeGroup,
    needsGroupChoice: session.needsGroupChoice,
    isLeader: session.isLeader,
    isAdminScope: session.isAdminScope,
    testModeAuthorized,
    campusName,
    roster: roster.map((m) => {
      const history = memberReadingMap.get(m.PersonId);
      const presentation = rosterPresentationByPersonId.get(m.PersonId);
      return {
        personId: m.PersonId,
        avatar: resolveAvatar(m.PersonId, m.Person?.Gender, savedAvatars.get(m.PersonId)),
        isSelf: m.PersonId === session.rockPersonId,
        name: m.Person?.NickName || m.Person?.FirstName || `Reader ${m.PersonId}`,
        isLeader: m.GroupRoleId !== undefined && m.GroupRoleId !== null && [24, 81].includes(m.GroupRoleId),
        readToday: groupStats?.readersTodayIds.includes(m.PersonId) ?? false,
        chapters: history?.chapters ?? [],
        readingDates: history?.dates ?? [],
        contributedPoints: presentation?.displayContributedPoints,
        isUpstreamLeader: presentation?.isUpstreamLeader ?? false,
      };
    }),
    chapters: readingState.chapters,
    readingDates: readingState.dates,
    groupStats,
    campusBoard,
    appBaseUrl: process.env.APP_BASE_URL ?? "",
    devMockToday: devMockToday(),
    // Empty resolved fallback; the panel reads `campusGroupsPromise` instead.
    campusGroups: [],
    campusGroupsPromise: campusGroupsP,
    testWritableGroupId: writableGroupId,
    campusId: session.campusId,
    sectionSlot,
    connectLeaders,
  };

  return <AppShell {...props} />;
}

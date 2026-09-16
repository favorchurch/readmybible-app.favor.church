import { Suspense } from "react";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { AppShell, type AppShellProps } from "@/components/app-shell";
import { isAvatarConfig, resolveAvatar, type Translation } from "@/components/avatar";
import { devMockToday } from "@/lib/dev-clock";
import {
  getCampusBoard,
  getGroupMembersReadingHistory,
  getGroupStats,
  getPersonReadingState,
} from "@/lib/data/stats";
import { getAllCampusNames, getAllConnectGroups, getCampusName, getGroupBasic, getRoster } from "@/lib/rock/client";
import { GROUP_TYPE_CONNECT_GROUP } from "@/lib/rock/constants";
import type { SessionContext } from "@/lib/session";
import { testWritableGroupId } from "@/lib/test-mode-config";
import { isTestModeRequestedFromQuery } from "@/components/test-mode/logic";
import { resolveAdminScope, type AdminScope } from "@/lib/admin/access";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
import SectionDashboard, { SectionDashboardSkeleton } from "@/components/sections/section-dashboard";

/** Next hands repeated query keys through as an array; every caller here wants the first value. */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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

  const writableGroupId = testWritableGroupId();

  // Test mode simulates ANY active Connect Group, org-wide, across all campuses.
  // The sandbox is still fetched by id and appended if missing, because it is
  // the one group test mode can write to and it would drop off the list if it
  // were ever archived or deactivated.
  //
  // Gated on the URL actually asking for test mode: this is a several-hundred-group
  // Rock call that only the test panel reads, and it used to block the shell render
  // for every logged-in user on every page load. `isTestModeRequestedFromQuery` is
  // the same trigger list the client panel activates on, so the list is present
  // whenever the panel can appear and skipped otherwise.
  const wantsTestMode = isTestModeRequestedFromQuery(searchParams);
  type CampusGroupRow = { groupId: number; groupName: string };
  const campusGroupsP: Promise<CampusGroupRow[]> = !wantsTestMode ? Promise.resolve([]) : (async () => {
    const [allGroups, campusNames, sandbox] = await Promise.all([
      getAllConnectGroups(),
      getAllCampusNames(),
      writableGroupId ? getGroupBasic(writableGroupId) : Promise.resolve(null),
    ]);
    // Several hundred groups share names across campuses, so label each with
    // its campus and sort, or the picker is unusable.
    const list = allGroups
      .filter((g) => g.GroupTypeId === GROUP_TYPE_CONNECT_GROUP)
      .map((g) => {
        const campus = g.CampusId === null ? null : (campusNames.get(g.CampusId) ?? null);
        return { groupId: g.Id, groupName: campus ? `${g.Name} — ${campus}` : g.Name };
      })
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
    if (sandbox && !list.some((g) => g.groupId === sandbox.Id)) {
      list.unshift({ groupId: sandbox.Id, groupName: sandbox.Name });
    }
    return list;
  })();

  // `campusGroupsP` is deliberately absent from this Promise.all. It is handed
  // to AppShell UNRESOLVED and read behind a Suspense boundary in the panel, so
  // the shell paints and every other control (role, campus, phase, sliders) is
  // usable while the org-wide Rock call is still in flight. Awaiting it here is
  // what made test mode feel slow even after the fetch was gated.
  const [profileRows, readingState, roster, groupStats, campusBoard, campusName, memberReadingMap] =
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
    ]);

  const profileRow = profileRows[0];
  const avatar = resolveAvatar(session.rockPersonId, session.rockGender, profileRow?.avatar);
  const rosterProfiles = roster.length
    ? await db.select({ personId: profiles.rockPersonId, avatar: profiles.avatar })
      .from(profiles).where(inArray(profiles.rockPersonId, roster.map((member) => member.PersonId)))
    : [];
  const savedAvatars = new Map(rosterProfiles.map((row) => [row.personId, row.avatar]));
  const translation = (profileRow?.translation as Translation | undefined) ?? session.defaultTranslation;

  let scope = resolveAdminScope(session);
  let simulatedScope: "global" | "cluster" | "region" | undefined;

  // Dev-only simulation of global/cluster/region scopes, re-homed verbatim
  // from the original app/admin/page.tsx (see ef393bd). In production, the
  // simulate bar is also available to a viewer with a real server-resolved
  // admin scope when `?test=1` is present -- matches the old app/admin/page.tsx
  // behavior of `params.test === "1" && session.status === "ok"`, narrowed to
  // require a genuine admin scope rather than any logged-in session.
  const isDev = process.env.NODE_ENV !== "production";
  const testParam = firstParam(searchParams.test);
  const scopeParam = firstParam(searchParams.scope);
  const isProdAdminTest = !isDev && scope !== null && testParam === "1";
  const isTest = (isDev && (testParam === "1" || scopeParam !== undefined)) || isProdAdminTest;
  if (isTest || (!scope && isDev)) {
    const requestedScope = scopeParam ?? (scope?.kind === "sections" ? "sections" : "global");
    if (requestedScope === "cluster") {
      scope = { kind: "sections", rootIds: [23869] }; // Cluster // Cielo Pabalan & Peejay Pabalan
      simulatedScope = "cluster";
    } else if (requestedScope === "region") {
      scope = { kind: "sections", rootIds: [23870] }; // Region // Arnel Guiron & Belle Guiron
      simulatedScope = "region";
    } else if (requestedScope === "global" || !scope) {
      scope = { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] };
      simulatedScope = "global";
    }
  }

  const sectionSlot = scope
    ? (
      <Suspense fallback={<SectionDashboardSkeleton />}>
        <SectionDashboard scope={scope as AdminScope} simulatedScope={simulatedScope} />
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
    campusName,
    roster: roster.map((m) => {
      const history = memberReadingMap.get(m.PersonId);
      return {
        personId: m.PersonId,
        avatar: resolveAvatar(m.PersonId, m.Person?.Gender, savedAvatars.get(m.PersonId)),
        isSelf: m.PersonId === session.rockPersonId,
        name: m.Person?.NickName || m.Person?.FirstName || `Reader ${m.PersonId}`,
        isLeader: m.GroupRoleId !== undefined && m.GroupRoleId !== null && [24, 81].includes(m.GroupRoleId),
        readToday: groupStats?.readersTodayIds.includes(m.PersonId) ?? false,
        chapters: history?.chapters ?? [],
        readingDates: history?.dates ?? [],
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
    sectionSlot,
  };

  return <AppShell {...props} />;
}

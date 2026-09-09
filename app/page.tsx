import { redirect } from "next/navigation";
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
import { getSessionContext } from "@/lib/session";
import { testWritableGroupId } from "@/lib/test-mode-config";
import { WelcomeLanding } from "@/components/welcome";

export default async function Page() {
  const session = await getSessionContext();

  if (session.status === "logged-out") {
    return <WelcomeLanding />;
  }
  if (session.status === "not-found-in-rock") {
    redirect("/not-found-in-rock");
  }

  const isDev = process.env.NODE_ENV !== "production";

  const activeGroupId = session.activeGroup?.groupId;
  const rosterP = activeGroupId ? getRoster(activeGroupId) : Promise.resolve([]);
  const memberReadingMapP = activeGroupId
    ? rosterP.then((members) => getGroupMembersReadingHistory(activeGroupId, members.map((m) => m.PersonId)))
    : Promise.resolve(new Map());

  const writableGroupId = testWritableGroupId();

  // Test mode simulates ANY active Connect Group, org-wide, not just the
  // reader's own campus. This is a deliberate widening for testing and it is
  // why the list is built only when `isDev`: in production this resolves to []
  // and getTestGroupSnapshot refuses outright, so no reader can reach another
  // campus's roster through it.
  //
  // The sandbox is still fetched by id and appended if missing, because it is
  // the one group test mode can write to and it would drop off the list if it
  // were ever archived or deactivated.
  const campusGroupsP = !isDev
    ? Promise.resolve([])
    : (async () => {
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

  const [profileRows, readingState, roster, groupStats, campusBoard, campusName, memberReadingMap, campusGroups] =
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
      campusGroupsP,
    ]);

  const profileRow = profileRows[0];
  const avatar = resolveAvatar(session.rockPersonId, session.rockGender, profileRow?.avatar);
  const rosterProfiles = roster.length
    ? await db.select({ personId: profiles.rockPersonId, avatar: profiles.avatar })
      .from(profiles).where(inArray(profiles.rockPersonId, roster.map((member) => member.PersonId)))
    : [];
  const savedAvatars = new Map(rosterProfiles.map((row) => [row.personId, row.avatar]));
  const translation = (profileRow?.translation as Translation | undefined) ?? session.defaultTranslation;

  const props: AppShellProps = {
    displayName: profileRow?.displayName || session.displayName,
    avatar,
    avatarCustomized: isAvatarConfig(profileRow?.avatar),
    translation,
    memberships: session.memberships,
    activeGroup: session.activeGroup,
    needsGroupChoice: session.needsGroupChoice,
    isLeader: session.isLeader,
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
    campusGroups,
    testWritableGroupId: writableGroupId,
  };

  return <AppShell {...props} />;
}
